# Changelog

## [1.3.4] - 2025-02-03

### Fixed

- Actually return the response object 🤦

## [1.3.3] - 2025-02-03

### Fixed

- Adjust `/parcels` response format so that parcels list can be loaded into an attribute instead of raw state on a REST sensor

## [1.3.2] - 2025-02-03

### Fixed

- Allow calls from localhost IPs (`127.0.0.1`, `::1`)

## [1.3.1] - 2025-02-03

### Fixed

- Run add-on on the host network to (hopefully) allow ingress to `/parcels` route

## [1.3.0] - 2025-01-31

### Added

- `/parcels` route to get packages as JSON

## [1.2.2] - 2024-12-23

### Fixed

- Adjust warning highlight color

## [1.2.1] - 2024-12-23

### Fixed

- Fix error `s6-overlay-suexec: fatal: can only run as pid 1`

## [1.2.0] - 2024-12-23

### Added

- Option to highlight parcels containing "return" in their description (to distinguish them from incoming parcels)

## [1.1.0] - 2022-05-05

### Added

- Addon creates a sensor entity in Home Assistant for the number of not-yet-delivered packages. Use `entity_name`
  option to customize name of created sensor entity and `entity_cron` option to customize when entity is updated.

### Fixed

- Update dependencies
