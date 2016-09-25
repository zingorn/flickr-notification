DO
$do$
BEGIN

  CREATE TABLE IF NOT EXISTS account(
    account_id SERIAL PRIMARY KEY not null,
    options TEXT
  );

  CREATE TABLE IF NOT EXISTS topics(
    topic_id SERIAL PRIMARY KEY not null,
    privacy_filter INT,
    account_id INT REFERENCES account (account_id),
    last_id BIGINT,
    topic VARCHAR(40) UNIQUE ,
    name VARCHAR(255));

  CREATE TABLE IF NOT EXISTS info(
    name VARCHAR(255) PRIMARY KEY NOT NULL,
    value JSONB
  );

  INSERT INTO account (options) VALUES
    -- replace above
    ('{
    api: {
        api_key: "...",
        secret: "...",
        callback: "oob",
        oauth_timestamp: "...",
        oauth_nonce: "...",
        oauth_callback_confirmed: "true",
        oauth_token: "...",
        oauth_token_secret: "...",
        permissions: "read",
        oauth_verifier: "...",
        user_id: "...",
        access_token: "...",
        access_token_secret: "..."
    },
    gcm: {
        authorization: "key=..."
    }
}')
    -- replace below
  ON CONFLICT DO NOTHING;

  INSERT INTO topics (privacy_filter, last_id, topic, name) VALUES
    (1, 0, 'UNIQ_GUID', 'Public'),
    (2, 0, 'UNIQ_GUID', 'Friends only'),
    (3, 0, 'UNIQ_GUID', 'Family only'),
    (4, 0, 'UNIQ_GUID', 'Friends and Family'),
    (5, 0, 'UNIQ_GUID', 'Private')
  ON CONFLICT DO NOTHING;

  insert INTO info (name, value) VALUES
    ('last_update', null),
    ('last_parse', null)
  ON CONFLICT DO NOTHING;

END
$do$