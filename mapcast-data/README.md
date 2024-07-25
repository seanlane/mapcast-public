# mapcast Data

This is a grabbag of scripts and notebooks to generate the base data for the maps on the Mapcast website. Originally inspired by https://www.volkerkrause.eu/2021/02/13/osm-country-subdivision-boundary-polygons.html for this, but thankfully Overture Maps came around since 2021 and made this much easier. The gist of using these is as follows.

## Install dependencies

I've been using Poetry for dependency management, I install the dependencies with the command `poetry install` which uses the projects specified in the `pyproject.toml` file. You could do something similar with `pip` or your tooling of choice.

## Get data from Overture Maps

Overture Maps has geospatial data readily available in AWS S3 that is queryable with DuckDB. Open a terminal, run `duckdb`, and run the commands in `get_overture_countries.sql` and `get_overture_regions.sql` to get the GeoJSON for all countries around the world and regions (Note: there are a lot of geographical conflicts around the world and this project isn't making a statement on any of them. Just using what the default values are from Overture). Examples from https://docs.overturemaps.org/getting-data/duckdb/#country-polygons proved helpful in fleshing this out quickly.

These scripts should results in GeoJSON files called `countries.geojson` and `regions.geojson`, respectively.

## Simpify the GeoJSON

You'll notice that these files are pretty big, too big to be loading on a website (even by 2024 standards). I just went to [MapShaper](https://mapshaper.org/), uploaded the files, and simplified the shapes until they got to a reasonable size, around 5-10MB. Also, with the countries, I went and removed Antartica using [GeoJSON.io](https://geojson.io), since it didn't render very well on the map. You can't claim it in Risk, so I figured we wouldn't miss it here.

I named the outputs of these steps `simplified-countries-no-antartica.geojson` and `simplified-regions.geojson`. Clever, I know.

## Get H3 cells for Colos

In the notebook `get_h3_from_countries.ipynb`, we read `simplified-countries-no-antartica.geojson`, we get all of the [H3](https://h3geo.org/) cells for the land we're interested in, and then assign each cell to the closet Cloudflare colocation facility. I originally sourced this data in a JSON file labelled `cloudflare_dc_colos.json`. I used https://github.com/Netrvin/cloudflare-colo-list to generate that file, though as you can see in the notebook, I had to manually source info about the Chinese locations. The website at https://www.cloudflarestatus.com/ also proved helpful for this.

Once all of the cells were assigned, they were squashed down into regions for each colo. Then I may have passed the output through [MapShaper](https://mapshaper.org/) and labelled the final file `simplified-fixed-colo.geojson`.

Then you can take these output files and put them behind a CDN to be used by the website.
