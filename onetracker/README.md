# homeassistant-addon-onetracker

HomeAssistant Addon that shows tracked package shipments from OneTracker

## Options

| Name | Default | Description |
|------|---------|-------------|
| **email** | - | Email address you use to login to OneTracker |
| **password** | - | Password to login to OneTracker |
| entity_name | `onetracker_package_count` | Name of the sensor entity for package count |
| entity_cron | `*/15 7-23 * * *` | Cron schedule to fetch package count for sensor |
| highlight_returns | false | Whether to distinguish parcels containing "return" in their description |

## Customizing entity

By default, the entity created will not persist across HA reboots nor will it be editable in the UI due to the lack of
a `unique_id`. But you can work around this by adding the following to your `configuration.yaml`:

```yaml
template:
  - sensor:
    - name: onetracker_package_count # or whatever you customized `entity_name` to
      unique_id: onetracker_package_count # same as above
      state: '' # add-on will fill this in
```
