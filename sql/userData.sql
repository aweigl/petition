DROP TABLE IF EXISTS signatures;


CREATE TABLE signatures (
    id SERIAL PRIMARY KEY,
    signature TEXT NOT NULL,
    user_id INTEGER NOT NULL
);

DROP TABLE IF EXISTS users;


CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first VARCHAR(255) NOT NULL,
    last  VARCHAR(255) NOT NULL,
    email VARCHAR(512) NOT NULL UNIQUE,
    pass VARCHAR(255) NOT NULL
);

DROP TABLE IF EXISTS user_profiles;

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    age INTEGER NULL,
    city VARCHAR(255),
    url VARCHAR(255),
    user_id INTEGER REFERENCES users(id) UNIQUE
)
