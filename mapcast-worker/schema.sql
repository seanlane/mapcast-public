-- This was the schema used for a D1 table, but it's no longer used.
DROP TABLE IF EXISTS claims;

DROP INDEX IF EXISTS claims_timestamp_desc;
CREATE TABLE IF NOT EXISTS claims (
     ip TEXT PRIMARY KEY NOT NULL
    ,name TEXT NOT NULL
    ,asn INTEGER
    ,colo TEXT
    ,country TEXT
    ,region TEXT
    ,metro TEXT
    ,city TEXT
    ,timestamp REAL DEFAULT(UNIXEPOCH('subsec')) NOT NULL
);
CREATE INDEX claims_timestamp_desc ON claims(timestamp DESC);
