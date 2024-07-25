# mapcast-public

Repo for [Mapcast.xyz](https://mapcast.xyz)

The project is broken up into subdirectories that run separate aspects of the site:

- `mapcast-cron`: Unused Cloudflare worker that used to poll for claims and update scores. Superceded by `mapcast-query` at the moment.
- `mapcast-data`: SQL scripts and Jupyter notebooks to put together base GeoJSON data for the website maps.
- `mapcast-index`: The React frontend that is the website.
- `mapcast-query`: Python script that polls for claims and updates scores, among other things.
- `mapcast-worker`: TypeScript Cloudflare worker that processes claims.

## Running the project

Below are the rough steps to get this running. If there's interest, I can flesh out the full instructions at a later date.

1. Create R2 (or S3 compatible, but some changes required) buckets for claims and state. You will eventually need S3-style access and security keys for these.
1. Get a domain ready, configure `mapcast-worker`, and deploy with `npm run deploy` in the `mapcast-worker` directory
1. Deploy `mapcast-index` as a Cloudflare Worker Pages website
    - Some changes required to make requests from the right bucket
1. Deploy `mapcast-query` somewhere, configured to poll from the right bucket.