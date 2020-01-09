CREATE TYPE "sexual_orientation" AS ENUM ('HETEROSEXUAL', 'HOMOSEXUAL', 'BISEXUAL');
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "token_type" AS ENUM ('SIGN_UP', 'PASSWORD_RESET');
CREATE TYPE "like_status" AS ENUM (
  'VIRGIN',
  'HAS_LIKED_US',
  'LIKED_IT',
  'MATCH'
);
CREATE TYPE "notification_type" AS ENUM (
  'GOT_LIKE',
  'GOT_VISIT',
  'GOT_MESSAGE',
  'GOT_LIKE_MUTUAL',
  'GOT_UNLIKE_MUTUAL'
);
CREATE TYPE "roaming_preferences" AS ENUM ('ACCEPTED', 'REFUSED', 'NOT_SET');
CREATE TYPE "address_type" AS ENUM ('PRIMARY', 'CURRENT');
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "uuid" uuid NOT NULL,
  "given_name" text NOT NULL,
  "family_name" text NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "password" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  "last_seen" timestamptz,
  "online" boolean NOT NULL DEFAULT FALSE,
  "seen_message" bool NOT NULL DEFAULT false,
  "extended_profile" int,
  "confirmed" bool NOT NULL DEFAULT false,
  "roaming" roaming_preferences NOT NULL DEFAULT 'NOT_SET',
  "location" bool NOT NULL DEFAULT false,
  "score" int NOT NULL DEFAULT 100,
  "primary_address_id" int,
  "current_address_id" int,
  "saw_messages" bool NOT NULL DEFAULT true
);
CREATE TABLE "addresses" (
  "id" SERIAL PRIMARY KEY,
  "point" point NOT NULL,
  "name" text NULL,
  "administrative" text NULL,
  "county" text NULL,
  "city" text NULL,
  "country" text NULL,
  "type" address_type NOT NULL DEFAULT 'PRIMARY',
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "extended_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" int NOT NULL,
  "birthday" timestamptz,
  "gender" gender,
  "sexual_orientation" sexual_orientation DEFAULT 'BISEXUAL',
  "biography" text
);
CREATE TABLE "profile_pictures" (
  "id" SERIAL PRIMARY KEY,
  "image_id" int UNIQUE NOT NULL,
  "user_id" int NOT NULL,
  "image_nb" int NOT NULL CHECK (
    image_nb >= 0
    AND image_nb <= 5
  ),
  UNIQUE (user_id, image_nb)
);
CREATE TABLE "images" (
  "id" SERIAL PRIMARY KEY,
  "uuid" uuid NOT NULL,
  "src" text NOT NULL
);
CREATE TABLE "tokens" (
  "id" SERIAL PRIMARY KEY,
  "token" uuid NOT NULL,
  "user_id" int NOT NULL,
  "type" token_type NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "likes" (
  "liker" int NOT NULL,
  "liked" int NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "not_interested" (
  "actor" int NOT NULL,
  "target" int NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "reports" (
  "reporter" int NOT NULL,
  "reported" int NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "blocks" (
  "blocker" int NOT NULL,
  "blocked" int NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "visits" (
  "id" SERIAL PRIMARY KEY,
  "visitor" int NOT NULL,
  "visited" int NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "messages" (
  "id" SERIAL PRIMARY KEY,
  "uuid" uuid NOT NULL,
  "author_id" int NOT NULL,
  "conversation_id" int NOT NULL,
  "payload" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "conversations" (
  "id" SERIAL PRIMARY KEY,
  "uuid" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "conversations_users" (
  "user_id" int NOT NULL,
  "conversation_id" int NOT NULL,
  UNIQUE (user_id, conversation_id)
);
CREATE TABLE "notifications" (
  "id" SERIAL PRIMARY KEY,
  "uuid" uuid NOT NULL,
  "type" notification_type NOT NULL,
  "notified_user_id" int NOT NULL,
  "notifier_user_id" int NOT NULL,
  "seen" boolean NOT NULL DEFAULT FALSE,
  "created_at" timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE "tags" (
  "id" SERIAL PRIMARY KEY,
  "uuid" uuid NOT NULL,
  "name" text NOT NULL,
  "tsvector" tsvector NOT NULL
);
CREATE TABLE "users_tags" (
  "tag_id" int NOT NULL,
  "user_id" int NOT NULL
);
ALTER TABLE "users"
ADD
  FOREIGN KEY ("primary_address_id") REFERENCES "addresses" ("id");
ALTER TABLE "users"
ADD
  FOREIGN KEY ("current_address_id") REFERENCES "addresses" ("id");
ALTER TABLE "users"
ADD
  FOREIGN KEY ("extended_profile") REFERENCES "extended_profiles" ("id");
ALTER TABLE "extended_profiles"
ADD
  FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "profile_pictures"
ADD
  FOREIGN KEY ("image_id") REFERENCES "images" ("id");
ALTER TABLE "profile_pictures"
ADD
  FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "tokens"
ADD
  FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "likes"
ADD
  FOREIGN KEY ("liker") REFERENCES "users" ("id");
ALTER TABLE "likes"
ADD
  FOREIGN KEY ("liked") REFERENCES "users" ("id");
ALTER TABLE "not_interested"
ADD
  FOREIGN KEY ("actor") REFERENCES "users" ("id");
ALTER TABLE "not_interested"
ADD
  FOREIGN KEY ("target") REFERENCES "users" ("id");
ALTER TABLE "reports"
ADD
  FOREIGN KEY ("reporter") REFERENCES "users" ("id");
ALTER TABLE "reports"
ADD
  FOREIGN KEY ("reported") REFERENCES "users" ("id");
ALTER TABLE "blocks"
ADD
  FOREIGN KEY ("blocker") REFERENCES "users" ("id");
ALTER TABLE "blocks"
ADD
  FOREIGN KEY ("blocked") REFERENCES "users" ("id");
ALTER TABLE "visits"
ADD
  FOREIGN KEY ("visitor") REFERENCES "users" ("id");
ALTER TABLE "visits"
ADD
  FOREIGN KEY ("visited") REFERENCES "users" ("id");
ALTER TABLE "messages"
ADD
  FOREIGN KEY ("author_id") REFERENCES "users" ("id");
ALTER TABLE "messages"
ADD
  FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id");
ALTER TABLE "conversations_users"
ADD
  FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "conversations_users"
ADD
  FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id");
ALTER TABLE "notifications"
ADD
  FOREIGN KEY ("notified_user_id") REFERENCES "users" ("id");
ALTER TABLE "notifications"
ADD
  FOREIGN KEY ("notifier_user_id") REFERENCES "users" ("id");
ALTER TABLE "users_tags"
ADD
  FOREIGN KEY ("tag_id") REFERENCES "tags" ("id");
ALTER TABLE "users_tags"
ADD
  FOREIGN KEY ("user_id") REFERENCES "users" ("id");
CREATE UNIQUE INDEX ON "users" ("uuid");
CREATE UNIQUE INDEX ON "users" ("username");
CREATE UNIQUE INDEX ON "users" ("email");
CREATE UNIQUE INDEX ON "extended_profiles" ("user_id");
CREATE UNIQUE INDEX ON "profile_pictures" ("image_id");
CREATE UNIQUE INDEX ON "images" ("uuid");
CREATE UNIQUE INDEX ON "tokens" ("user_id", "type");
CREATE UNIQUE INDEX ON "tokens" ("token");
CREATE UNIQUE INDEX ON "likes" ("liker", "liked");
CREATE UNIQUE INDEX ON "reports" ("reporter", "reported");
CREATE UNIQUE INDEX ON "blocks" ("blocker", "blocked");
CREATE UNIQUE INDEX ON "messages" ("uuid");
CREATE UNIQUE INDEX ON "conversations" ("uuid");
CREATE UNIQUE INDEX ON "notifications" ("uuid");
CREATE UNIQUE INDEX ON "tags" ("uuid");
CREATE UNIQUE INDEX ON "tags" ("name");
CREATE UNIQUE INDEX ON "users_tags" ("tag_id", "user_id");