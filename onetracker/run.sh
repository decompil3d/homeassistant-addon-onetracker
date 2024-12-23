#!/usr/bin/with-contenv bashio
set +u

export EMAIL=$(bashio::config 'email')
bashio::log.info "Email configured as ${EMAIL}."
export PASSWORD=$(bashio::config 'password')
bashio::log.info "Password configured."
export ENTITY_NAME=$(bashio::config 'entity_name')
bashio::log.info "Entity name configured as ${ENTITY_NAME}."
export ENTITY_CRON=$(bashio::config 'entity_cron')
bashio::log.info "Entity cron schedule configured as ${ENTITY_CRON}."
export HIGHLIGHT_RETURNS=$(bashio::config 'highlight_returns')
bashio::log.info "Highlight returns configured as ${HIGHLIGHT_RETURNS}."

bashio::log.info "Starting OneTracker service."
npm run start
