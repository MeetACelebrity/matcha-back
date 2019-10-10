FROM postgres:latest

ENV POSTGRES_USER user

ENV POSTGRES_PASSWORD pass

ENV POSTGRES_DB db

ADD db/schema.sql /docker-entrypoint-initdb.d/
