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

  INSERT INTO account (account_id, options) VALUES
    -- replace above
    (1, '{
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

  INSERT INTO topics (topic_id, privacy_filter, account_id, last_id, topic, name) VALUES
    (1, 1, 1, 0, 'UNIQ_GUID', 'Public'),
    (2, 2, 1, 0, 'UNIQ_GUID', 'Friends only'),
    (3, 3, 1, 0, 'UNIQ_GUID', 'Family only'),
    (4, 4, 1, 0, 'UNIQ_GUID', 'Friends and Family'),
    (5, 5, 1, 0, 'UNIQ_GUID', 'Private')
  ON CONFLICT DO NOTHING;

  insert INTO info (name, value) VALUES
    ('last_update', null),
    ('last_parse', null)
  ON CONFLICT DO NOTHING;

END
$do$