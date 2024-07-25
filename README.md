# mapcast-public

Repo for [Mapcast.xyz](https://mapcast.xyz)

The project is broken up into subdirectories that run separate aspects of the site:

- `mapcast-cron`: Unused Cloudflare worker that used to poll for claims and update scores. Superceded by `mapcast-query` at the moment.
- `mapcast-data`: SQL scripts and Jupyter notebooks to put together base GeoJSON data for the website maps.
- `mapcast-index`: The React frontend that is the website.
- `mapcast-query`: Python script that polls for claims and updates scores, among other things.
- `mapcast-worker`: TypeScript Cloudflare worker that processes claims.
