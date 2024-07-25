LOAD httpfs;
LOAD spatial;
SET s3_region='us-west-2';

CREATE OR REPLACE VIEW divisions_view AS (
    SELECT
        *
    FROM
        read_parquet('s3://overturemaps-us-west-2/release/2024-06-13-beta.0/theme=divisions/type=*/*', filename=true, hive_partitioning=1)
);

COPY (
    SELECT
        divisions.id,
        divisions.subtype,
        divisions.country,
        divisions.wikidata,
        names.primary AS primary_name,
        sources[1].dataset AS primary_source,
        areas.area_id,
        ST_GeomFromWKB(areas.area_geometry) as geometry
    FROM divisions_view AS divisions
    INNER JOIN (
        SELECT
            id as area_id,
            division_id,
            geometry AS area_geometry
        FROM divisions_view
    ) AS areas ON areas.division_id == divisions.id
    WHERE divisions.subtype = 'country'
) TO 'countries.geojson'
WITH (FORMAT GDAL, DRIVER 'GeoJSON');