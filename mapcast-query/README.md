# mapcast-query

A simple Python script running in a Docker container. It polls an R2 bucket for claims from the `mapcast-worker` instances, stores the claims in a DuckDB db, then runs queries to compute scores, before finally pushing up state to another R2 bucket that the `mapcast-index` site uses.

## Get secrets
Look at `secrets.env.example`, get your own version of these resources, and then add them to a `secrets.env` file.


## Build
```
DOCKER_BUILDKIT=1 docker build -t mapcastq .
```

## Run ephemerally
```
docker run --volume $(pwd)/db:/db --env-file secrets.env mapcastq
```

## Run with docker compose
Modify the volume location as needed for the DB to be persisted to file, and then run

```
docker compose build && docker compose down && docker compose up -d
```
