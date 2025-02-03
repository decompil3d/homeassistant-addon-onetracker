const Graceful = require('node-graceful').default;
Graceful.captureExceptions = true;
Graceful.captureRejections = true;
Graceful.exitOnDouble = false;

Graceful.on('exit', (signal, details) => {
  if (details) {
    console.error('Exit reason:', details);
  }
});

const CronJob = require('cron').CronJob;
const express = require('express');
const fs = require('fs');
const handlebars = require('handlebars');
/** @type {(url: string, options?: RequestInit) => Promise<Response>} */
// @ts-expect-error
const fetch = require('node-fetch');
const path = require('path');

const templateSrc = fs.readFileSync(path.join(__dirname, 'home.hbs'), 'utf8');
const buildHome = handlebars.compile(templateSrc);

const app = express();
app.use((req, res, next) => {
  if (!req.ip.endsWith('172.30.32.2') && req.ip !== '::1' && req.ip !== '127.0.0.1') {
    const error = `Forbidden ingress IP '${req.ip}'. Must call from 172.30.32.2, 127.0.0.1, or ::1 (localhost)`;
    console.error(error);
    res.status(403).json({ error });
  } else {
    next();
  }
});
app.get('/', async (req, res) => {
  try {
    const parcels = await getExtendedParcels();
    const html = buildHome({
      parcels
    });
    res.send(html);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
    return;
  }
});

app.get('/parcels', async (req, res) => {
  try {
    const parcels = await getExtendedParcels();
    const response = {
      count: parcels.length,
      parcels
    };
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
    return;
  }
});

async function getExtendedParcels() {
  const parcelsRaw = await getParcels();
  return extendParcels(parcelsRaw);
}

/**
 * @typedef {{
 *   expiration: number,
 *   token: string
 * }} Auth
 */

/**
 * @type {Auth}
 */
let auth;

/**
 * @type {string}
 */
let addonSlug;

/**
 * Get the slug of this addon
 *
 * @returns {Promise<string>} The slug of this addon
 */
async function getAddonSlug() {
  if (addonSlug) return addonSlug;
  const res = await fetch('http://supervisor/addons/self/info', {
    headers: {
      'Authorization': `Bearer ${process.env.SUPERVISOR_TOKEN}`
    },
    method: 'GET'
  });
  if (!res.ok) {
    throw new Error('Could not load addons from Supervisor API');
  }

  const { data: addon } = await res.json();
  addonSlug = addon.slug;
  return addonSlug;
}

/**
 * Update the HA entity representing the count of actively tracked packages
 */
async function updateEntity() {
  const parcels = await getParcels();
  const deliveredCount = parcels.filter(p => p.tracking_status === 'delivered').length;
  const slug = await getAddonSlug();
  await fetch(`http://supervisor/core/api/states/sensor.${process.env.ENTITY_NAME}`, {
    headers: {
      'Authorization': `Bearer ${process.env.SUPERVISOR_TOKEN}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      state: parcels.length - deliveredCount,
      attributes: {
        delivered: deliveredCount,
        slug
      }
    })
  })
}

const entityRefreshJob = new CronJob(
  process.env.ENTITY_CRON,
  updateEntity,
  null,
  null,
  null,
  null,
  true // runOnInit
);

console.log('Starting OneTracker addon...');
app.listen(8099, () => {
  console.log('OneTracker addon is running on port 8099');

  Graceful.on('exit', function () {
    entityRefreshJob.stop();
  });

  entityRefreshJob.start();
});

/**
 * Get auth token, updating cached auth value if needed
 *
 * @returns {Promise<string>} Auth token
 */
async function getAuth() {
  if (!auth || auth.expiration < Date.now()) {
    auth = await fetchAuth();
  }
  return auth.token;
}

/**
 * Fetch auth token from OneTracker API
 *
 * @returns {Promise<Auth>} Auth token info
 */
async function fetchAuth() {
  const res = await fetch('https://api.onetracker.app/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: process.env.EMAIL,
      password: process.env.PASSWORD
    })
  });

  if (!res.ok) {
    throw new Error('Retrieving OneTracker auth failed. ' + (await res.text()));
  }

  const authInfo = await res.json();
  return {
    token: authInfo.session.token,
    expiration: new Date(authInfo.session.expiration).getTime()
  };
}

/**
 * @typedef {Object} Parcel
 * @prop {number} id Package ID
 * @prop {string} tracking_status Status
 * @prop {string} [description] Package description
 * @prop {string} carrier Carrier name
 * @prop {string} tracking_id Carrier tracking number
 * @prop {string} [tracking_status_readable] Readable tracking status text
 */

/**
 * Get parcels from OneTracker
 *
 * @returns {Promise<Array<Parcel>>} Array of parcels
 */
async function getParcels() {
  const authToken = await getAuth();
  const res = await fetch('https://api.onetracker.app/parcels', {
    headers: {
      'x-api-token': authToken
    }
  });

  if (!res.ok) {
    throw new Error('Retrieving OneTracker parcels failed. ' + (await res.text()));
  }

  const data = await res.json();
  return data.parcels;
}

/**
 * @typedef {Object} ParcelExtendedInfo
 * @prop {string} rowClass CSS class name for parcel row, based on status
 * @prop {string} trackingUrl URL to OneTracker redirection endpoint for carrier websites
 */
/**
 * @typedef {Parcel & ParcelExtendedInfo} ExtendedParcel
 */

/**
 * Extend parcel info objects
 *
 * @param {Array<Parcel>} parcels
 * @returns {Array<ExtendedParcel>} Array of extended parcel objects
 */
function extendParcels(parcels) {
  return parcels.map(p => {
    let rowClass = 'border-secondary';
    switch(p.tracking_status) {
      case 'in_transit':
      case 'pre_transit':
        rowClass = 'border-info';
        break;
      case 'out_for_delivery':
        rowClass = 'border-primary';
        break;
      case 'delivered':
        rowClass = 'border-success';
        break;
      case 'exception':
        rowClass = 'border-danger';
        break;
    }
    // Intentional == since env var is a boolean but likely a string from env
    if (process.env.HIGHLIGHT_RETURNS == 'true' && p.description?.includes('return')) {
      // Returns get a different color
      rowClass = 'border-warning';
    }
    return {
      ...p,
      rowClass,
      trackingUrl: `https://api.onetracker.app/tracking/redirect?carrier=${p.carrier}&trackingID=${p.tracking_id}`
    };
  });
}
