# Changelog

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
