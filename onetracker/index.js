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
  if (req.ip !== '172.30.32.2') {
    res.status(403).json({ error: `Forbidden ingress IP '${req.ip}'. Must call from 172.30.32.2` });
  } else {
    next();
  }
});
app.get('/', async (req, res) => {
  try {
    const parcelsRaw = await getParcels();
    const parcels = extendParcels(parcelsRaw);
    const html = buildHome({
      parcels
    });
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }
});

console.log('Starting OneTracker addon...');
app.listen(8099, () => {
  console.log('OneTracker addon is running on port 8099');
});

/**
 * @type {{
 *   expiration: number,
 *   token: string
 * }}
 */
let auth;

async function getAuth() {
  if (!auth || auth.expiration < Date.now()) {
      auth = await fetchAuth();
  }
  return auth.token;
}

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
    return {
      ...p,
      rowClass,
      trackingUrl: `https://api.onetracker.app/tracking/redirect?carrier=${p.carrier}&trackingID=${p.tracking_id}`
    };
  });
}
