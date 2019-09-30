import uuid from 'uuid/v4';
import { hash } from 'argon2';

import { ModelArgs } from './index';

export interface CreateUserArgs extends ModelArgs {
    email: string;
    username: string;
    givenName: string;
    familyName: string;
    password: string;
}

export interface GetUserByUsernameArgs extends ModelArgs {
    username: string;
    password: string;
}

export interface UserVerifyArgs extends ModelArgs {
    uuid: string;
    token: string;
}
/**
 * An External User can be safely sent
 * to the client because it does not hold sensible data.
 */
export interface ExternalUser {
    uuid: string;
    givenName: string;
    familyName: string;
    username: string;
    email: string;
    createdAt: string;
    confirmed: boolean;
}

/**
 * An InternalUser contains informations
 * that must not be sent to the client
 * such as the password.
 */
export interface InternalUser extends ExternalUser {
    id: number;
    password: string;
}

export function internalUserToExternalUser({
    id,
    uuid,
    givenName,
    familyName,
    username,
    email,
    createdAt,
    confirmed,
}: InternalUser): ExternalUser {
    return {
        uuid,
        givenName,
        familyName,
        username,
        email,
        createdAt,
        confirmed,
    };
}

export async function createUser({
    db,
    email,
    username,
    givenName,
    familyName,
    password,
}: CreateUserArgs): Promise<{ uuid: string; token: string } | null> {
    const id = uuid();
    const token = uuid();

    const query = `
        WITH 
            id_user 
        AS ( 
                INSERT INTO users (
                    uuid,
                    email,
                    username,
                    given_name,
                    family_name,
                    password
                ) 
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )
                RETURNING id
            )
        INSERT INTO
            tokens
            (token, user_id)
        SELECT 
            $7, id
        FROM
            id_user;
	`;

    try {
        await db.query(query, [
            id,
            email,
            username,
            givenName,
            familyName,
            await hash(password),
            token,
        ]);

        return { token, uuid: id };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUserByUsername({
    db,
    username,
    password,
}: GetUserByUsernameArgs): Promise<InternalUser | null> {
    const query = `
        SELECT
            id,
            uuid,
            given_name as "givenName",
            family_name as "familyName",
            username,
            email,
            password,
            created_at as "createdAt",
            confirmed
        FROM
            users
        WHERE username = $1
    `;

    try {
        const {
            rows: [user],
        } = await db.query(query, [username]);

        return user;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userVerify({
    db,
    uuid,
    token,
}: UserVerifyArgs): Promise<InternalUser | null> {
    const query = `
        WITH 
            users_tokens
        AS (
                SELECT 
                    users.id 
                FROM 
                    users 
                INNER JOIN 
                    tokens 
                ON 
                    users.id = tokens.user_id 
                WHERE 
                    token=$1
                AND 
                    uuid=$2
            )
        UPDATE
            users
        SET
            confirmed='t'
        WHERE
            id = (
                SELECT
                    users_tokens.id
                FROM
                    users_tokens
            )
        RETURNING
            id,
            uuid,
            given_name as "givenName",
            family_name as "familyName",
            username,
            email,
            password,
            created_at as "createdAt",
            confirmed
        `;
    try {
        const {
            rows: [user],
        } = await db.query(query, [token, uuid]);

        return user;
    } catch (e) {
        console.error(e);
        return null;
    }
}
