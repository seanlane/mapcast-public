from concurrent import futures
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime
from typing import Generator, Tuple

import boto3
import duckdb
import json
import polars as pl
import os
import structlog
import sys
import time

HOUR_SECS = 60*60
DAY_SECS = 24*HOUR_SECS
WEEK_SECS = 7*DAY_SECS
MONTH_SECS = 30*DAY_SECS

HOUR_LABEL = 'hourly'
DAY_LABEL = 'daily'
WEEK_LABEL = 'weekly'
MONTH_LABEL = 'monthly'
ALL_TIME_LABEL = 'all-time'

TERRITORY_LABELS = ['colo', 'region', 'country']
TIME_LABELS = [HOUR_LABEL, DAY_LABEL, WEEK_LABEL, MONTH_LABEL, ALL_TIME_LABEL]
TIME_MAP: dict[str, int | None] = {HOUR_LABEL: HOUR_SECS, DAY_LABEL: DAY_SECS, WEEK_LABEL: WEEK_SECS, MONTH_LABEL: MONTH_SECS, ALL_TIME_LABEL: None}

COLS = ['ip','name','asn', 'colo', 'country', 'region', 'metro', 'city', 'time_ms']
UPSERT_SQL = f'''
INSERT INTO claims(ip, name, asn, colo, country, region, metro, city, time_ms) 
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(ip) DO UPDATE SET
                    name=excluded.name,
                    asn=excluded.asn,
                    colo=excluded.colo,
                    country=excluded.country,
                    region=excluded.region,
                    metro=excluded.metro,
                    city=excluded.city,
                    time_ms=excluded.time_ms -- I thought this would work with the default value, but it doesn't
                    WHERE (name != excluded.name AND excluded.time_ms > claims.time_ms) OR
                          (name  = excluded.name AND (excluded.time_ms - (900 * 1000)) > claims.time_ms)
'''

structlog.configure(processors=[
    structlog.processors.TimeStamper(fmt='iso'),
    structlog.processors.add_log_level,
    structlog.processors.dict_tracebacks, 
    structlog.processors.JSONRenderer()
])
logger = structlog.get_logger()


def get_s3_client() -> boto3.client:
    return boto3.client(
        service_name ='s3',
        endpoint_url = os.getenv('S3_ENDPOINT'),
        aws_access_key_id =  os.getenv('ACCESS_KEY_ID'),
        aws_secret_access_key = os.getenv('SECRET_ACCESS_KEY'),
        region_name='auto', # Must be one of: wnam, enam, weur, eeur, apac, auto
    )

def bucket_list(bucket_name):
    s3_client = get_s3_client()
    paginator = s3_client.get_paginator('list_objects_v2')

    keys = []
    for page in paginator.paginate(Bucket=bucket_name):
        if 'Contents' in page:
            for obj in page['Contents']:
                keys.append(obj['Key'])
    return keys


def get_object(bucket_name: str, key: str) -> str:
    """Gets content from an S3 object."""
    response = get_s3_client().get_object(Bucket=bucket_name, Key=key)
    return response["Body"].read().decode("utf-8")


def download_parallel_multiprocessing(bucket_name: str, object_keys: list[str]) -> Generator[Tuple[str, str], None, None]:
    with ProcessPoolExecutor() as executor:
        future_to_key = {executor.submit(get_object, bucket_name, key): key for key in object_keys}

        for future in futures.as_completed(future_to_key):
            key = future_to_key[future]
            exception = future.exception()

            if not exception:
                yield key, future.result()
            else:
                print(f"Error downloading {key}: {exception}")
                yield key, None

def get_header_func(max_age: int = 60):
    def add_custom_header(params, **kwargs):
        params["headers"]['Cache-Control'] = f'max-age={max_age}'
    return add_custom_header

def upload_object(content: str, bucket_name: str, key: str, max_age: int = 60) -> None:
    """Uploads an object from S3 to local."""
    s3_client = get_s3_client()
    event_system = s3_client.meta.events
    event_system.register('before-call.s3.PutObject', get_header_func(max_age))

    s3_client.put_object(Bucket=bucket_name, Key=key, Body=content, ContentType='application/json')

def delete_object(bucket_name: str, key: str) -> None:
    get_s3_client().delete_object(Bucket=bucket_name, Key=key)

def delete_parallel_multiprocessing(bucket_name: str, object_keys: list[str]) -> Generator[Tuple[str, bool], None, None]:
    with ProcessPoolExecutor() as executor:
        future_to_key = {executor.submit(delete_object, bucket_name, key): key for key in object_keys}

        for future in futures.as_completed(future_to_key):
            key = future_to_key[future]
            exception = future.exception()
            yield key, (not exception)
            

def get_territory_sql(territoryLabel: str, secs: int | None) -> str:
    if secs is None:
        TIME_CLAUSE = '1=1'
    else:
        TIME_CLAUSE = 'time_ms > (EPOCH_MS(CURRENT_TIMESTAMP) - ' + str(secs * 1000) + ')'

    return f'''
    WITH results AS (
        SELECT name, {territoryLabel}, COUNT(1) AS count, MAX(time_ms) AS latest,
        ROW_NUMBER() OVER(PARTITION BY {territoryLabel} ORDER BY COUNT(1) DESC, MAX(time_ms) DESC) AS rank 
        FROM claims 
        WHERE {TIME_CLAUSE} AND {territoryLabel} IS NOT NULL
        GROUP BY 1,2
    ), results_agg AS (
        SELECT name, GROUP_CONCAT({territoryLabel}) AS territories, SUM(count) as ip_count, MAX(latest) AS latest, COUNT(1) AS score 
        FROM results 
        WHERE rank = 1 
        GROUP BY 1
    ) SELECT * FROM results_agg ORDER BY score DESC, ip_count DESC, latest DESC
    '''

def get_recents_sql() -> str:
    return '''
    SELECT name, country, region, colo, time_ms, ip
    FROM claims
    WHERE time_ms > (EPOCH_MS(CURRENT_TIMESTAMP) - 86400000)
    ORDER BY time_ms DESC
    LIMIT 100
    '''

def get_public_claims_sql() -> str:
    return '''
    SELECT name, country, region, colo, time_ms
    FROM claims
    ORDER BY time_ms DESC
    '''

def run_update():
    claim_bucket = os.getenv('CLAIM_BUCKET_NAME')
    object_keys = bucket_list(claim_bucket)
    logger.info('Retrieved list of items in bucket', bucket_name=claim_bucket, key_count=len(object_keys))

    downloaded_keys = []
    downloaded_content = []
    for key, content in download_parallel_multiprocessing(claim_bucket, object_keys):
        if content:
            downloaded_keys.append(key)
            json_content = json.loads(content)
            if 'batch' in json_content:
                downloaded_content.extend(json_content['batch'])
            else:
                downloaded_content.append(json_content)
    
    if not len(downloaded_keys):
        logger.info('No items to download from bucket', bucket_name=claim_bucket)
    else:
        logger.info('Downloaded claim batches from bucket', bucket_name=claim_bucket, key_count=len(downloaded_keys), claim_count=len(downloaded_content)) 

        new_df = pl.DataFrame(downloaded_content).select(pl.col(COLS)).sort('time_ms', descending=False)
        with duckdb.connect(os.getenv('DUCKDB_DB_PATH')) as con:
            # Upsert the new data
            con.executemany(UPSERT_SQL, new_df.rows())
            
    with duckdb.connect(os.getenv('DUCKDB_DB_PATH')) as con:
        all_data = {}

        for territoryLabel in TERRITORY_LABELS:
            all_data[territoryLabel] = {}
            for timeLabel in TIME_LABELS:
                territory_sql = get_territory_sql(territoryLabel, TIME_MAP[timeLabel])
                all_data[territoryLabel][timeLabel] = (
                    con.query(territory_sql).pl()
                    .with_columns(pl.col('ip_count').cast(pl.Int64)) # I don't know why, but duckdb makes this a float, so cast to override
                    .rows(named=True))
        all_data['recents'] = (
            con.query(get_recents_sql()).pl()
            .with_columns( # If IPv4, mask out the last three octets
                pl.when(pl.col('ip').str.contains(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'))
                  .then(pl.col('ip').str.split('.').list.get(0) + pl.lit('.x.x.x'))
                  .otherwise(pl.col('ip'))) 
            .rows(named=True)
        )
        upload_object(json.dumps(all_data), os.getenv('STATE_BUCKET_NAME'), 'unified-state.json')

    if len(downloaded_keys):
        with duckdb.connect(os.getenv('DUCKDB_DB_PATH')) as con:
            claims_data = {
                'claims': con.query(get_public_claims_sql()).pl().rows(named=False),
                'query_timestamp': int(datetime.now().timestamp()),
            }
            upload_object(json.dumps(claims_data), os.getenv('STATE_BUCKET_NAME'), 'claims.json', max_age=300)

    # Delete the downloaded keys
    for key, result in delete_parallel_multiprocessing(claim_bucket, downloaded_keys):
        if not result:
            logger.error('Failed to delete object', bucket_name=claim_bucket, key=key)
    logger.info('Update completed')

def bootstrap() -> bool:
    # Check to make sure all required ENV vars are set
    vars = [ 'S3_ENDPOINT', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'CLAIM_BUCKET_NAME', 'STATE_BUCKET_NAME', 'DUCKDB_DB_PATH', 'POLL_INTERVAL' ]
    for var in vars:
        if os.getenv(var) is None:
            logger.error('Missing ENV var', var=var)
            return False
        else:
            logger.info('ENV var set', var=var)
    logger.info('All ENV vars are set')
    
    # Create the database if it doesn't exist
    with duckdb.connect(os.getenv('DUCKDB_DB_PATH')) as con:
        con.query('''
        CREATE TABLE IF NOT EXISTS claims (
             ip TEXT PRIMARY KEY NOT NULL
            ,name TEXT NOT NULL
            ,asn INTEGER
            ,colo TEXT
            ,country TEXT
            ,region TEXT
            ,metro TEXT
            ,city TEXT
            ,time_ms BIGINT NOT NULL
        );''')

    logger.info('Database created. Bootstrap complete.')
    return True

def main_loop(poll_interval: int):
    logger.info('Starting main loop', poll_interval=poll_interval)
    while True:
        try:
            run_update()
        except Exception:
            logger.exception('Update failed')
            sys.exit(1)
        time.sleep(poll_interval)

def main():
    if not bootstrap():
        sys.exit(1)
    main_loop(int(os.getenv('POLL_INTERVAL')))

if __name__ == '__main__':
    main()
