CREATE TYPE "sexual_orientation" AS ENUM (
  'HETEROSEXUAL',
  'HOMOSEXUAL',
  'BISEXUAL'
);

CREATE TYPE "gender" AS ENUM (
  'MALE',
  'FEMALE'
);

CREATE TYPE "token_type" AS ENUM (
  'SIGN_UP',
  'PASSWORD_RESET'
);

CREATE TYPE "notification_type" AS ENUM (
  'GOT_LIKE',
  'GOT_VISIT',
  'GOT_MESSAGE',
  'GOT_LIKE_MUTUAL',
  'GOT_UNLIKE_MUTUAL'
);

CREATE TABLE "users" (
  "id" serial PRIMARY KEY,
  "uuid" uuid UNIQUE NOT NULL,
  "given_name" text NOT NULL,
  "family_name" text NOT NULL,
  "username" text UNIQUE NOT NULL,
  "email" text UNIQUE NOT NULL,
  "password" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "extended_profile" int,
  "confirmed" bool NOT NULL DEFAULT false
);

CREATE TABLE "geolocalisations" (
  "point" point NOT NULL,
  "user_id" int NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "extended_profiles" (
  "id" serial PRIMARY KEY,
  "user_id" int UNIQUE NOT NULL,
  "age" int NOT NULL DEFAULT 18,
  "gender" gender,
  "sexual_orientation" sexual_orientation DEFAULT 'BISEXUAL',
  "biography" text
);

CREATE TABLE "profile_pictures" (
  "id" serial PRIMARY KEY,
  "image_id" int NOT NULL,
  "user_id" int NOT NULL,
  "is_primary" bool NOT NULL DEFAULT false
);

CREATE TABLE "images" (
  "id" serial PRIMARY KEY,
  "uuid" text UNIQUE NOT NULL,
  "path" text NOT NULL
);

CREATE TABLE "tokens" (
  "id" serial PRIMARY KEY,
  "token" uuid UNIQUE NOT NULL,
  "user_id" int NOT NULL,
  "type" token_type NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "likes" (
  "liker" int NOT NULL,
  "liked" int NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "visits" (
  "id" serial PRIMARY KEY,
  "visitor" int NOT NULL,
  "visited" int NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "messages" (
  "id" serial PRIMARY KEY,
  "uuid" uuid UNIQUE NOT NULL,
  "author_id" int NOT NULL,
  "conversation_id" int NOT NULL,
  "payload" text NOT NULL
);

CREATE TABLE "conversations" (
  "id" serial PRIMARY KEY,
  "uuid" uuid UNIQUE NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE "conversations_users" (
  "user_id" int NOT NULL,
  "conversation_id" int NOT NULL
);

CREATE TABLE "notifications" (
  "id" serial PRIMARY KEY,
  "uuid" uuid UNIQUE NOT NULL,
  "type" notification_type NOT NULL,
  "notified_user_id" int NOT NULL,
  "notifier_user_id" int NOT NULL
);

CREATE TABLE "tags" (
  "id" serial PRIMARY KEY,
  "uuid" uuid UNIQUE NOT NULL,
  "name" text UNIQUE NOT NULL
);

CREATE TABLE "users_tags" (
  "tag_id" int NOT NULL,
  "user_id" int NOT NULL
);

CREATE TABLE "matches" (
  "a" int NOT NULL,
  "b" int NOT NULL
);

ALTER TABLE "users" ADD FOREIGN KEY ("extended_profile") REFERENCES "extended_profiles" ("id");

ALTER TABLE "geolocalisations" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "extended_profiles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "profile_pictures" ADD FOREIGN KEY ("image_id") REFERENCES "images" ("id");

ALTER TABLE "profile_pictures" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "tokens" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "likes" ADD FOREIGN KEY ("liker") REFERENCES "users" ("id");

ALTER TABLE "likes" ADD FOREIGN KEY ("liked") REFERENCES "users" ("id");

ALTER TABLE "visits" ADD FOREIGN KEY ("visitor") REFERENCES "users" ("id");

ALTER TABLE "visits" ADD FOREIGN KEY ("visited") REFERENCES "users" ("id");

ALTER TABLE "messages" ADD FOREIGN KEY ("author_id") REFERENCES "users" ("id");

ALTER TABLE "messages" ADD FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id");

ALTER TABLE "conversations_users" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "conversations_users" ADD FOREIGN KEY ("conversation_id") REFERENCES "users" ("id");

ALTER TABLE "notifications" ADD FOREIGN KEY ("notified_user_id") REFERENCES "users" ("id");

ALTER TABLE "notifications" ADD FOREIGN KEY ("notifier_user_id") REFERENCES "users" ("id");

ALTER TABLE "users_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id");

ALTER TABLE "users_tags" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "matches" ADD FOREIGN KEY ("a") REFERENCES "users" ("id");

ALTER TABLE "matches" ADD FOREIGN KEY ("b") REFERENCES "users" ("id");

CREATE UNIQUE INDEX ON "tokens" ("user_id", "type");

CREATE UNIQUE INDEX ON "likes" ("liker", "liked");

CREATE INDEX ON "visits" ("visitor", "visited");

CREATE UNIQUE INDEX ON "conversations_users" ("user_id", "conversation_id");

CREATE UNIQUE INDEX ON "users_tags" ("tag_id", "user_id");

CREATE UNIQUE INDEX ON "matches" ("a", "b");
