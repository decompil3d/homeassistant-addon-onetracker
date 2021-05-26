#!/usr/bin/with-contenv bashio
set +u

export EMAIL=$(bashio::config 'email')
bashio::log.info "Email configured as ${EMAIL}."
export PASSWORD=$(bashio::config 'password')
bashio::log.info "Password configured."

bashio::log.info "Starting OneTracker service."
npm run start
