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
}

export interface GetUserByEmailArgs extends ModelArgs {
    email: string;
}

export interface GetUserByUuidArgs extends ModelArgs {
    uuid: string;
}

export interface SetPasswordResetArgs extends ModelArgs {
    id: number;
}

export interface ResetingPassword extends ModelArgs {
    uuid: string;
    token: string;
    password: string;
}

export interface UserVerifyArgs extends ModelArgs {
    uuid: string;
    token: string;
}

export interface UpdateGeneralUserArgs extends ModelArgs {
    uuid: string;
    email: string;
    givenName: string;
    familyName: string;
}

export interface UpdatePasswordUserArgs extends ModelArgs {
    uuid: string;
    newPassword: string;
}

export interface UpdateBiographyArgs extends ModelArgs {
    uuid: string;
    biography: string;
}

export interface UpdateExtendedUserArgs extends ModelArgs {
    uuid: string;
    age: number;
    gender: Gender;
    sexualOrientation: SexualOrientation;
}

export enum Gender {
    'MALE',
    'FEMALE',
}

export enum SexualOrientation {
    'HETEROSEXUAL',
    'HOMOSEXUAL',
    'BISEXUAL',
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
            (token, user_id, type)
        SELECT 
            $7, id, 'SIGN_UP'
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
        WHERE 
            username = $1
    `;

    try {
        const {
            rows: [user],
        } = await db.query(query, [username]);

        return user || null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUserByEmail({
    db,
    email,
}: GetUserByEmailArgs): Promise<InternalUser | null> {
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
        WHERE 
            email = $1
    `;

    try {
        const {
            rows: [user],
        } = await db.query(query, [email]);
        return user || null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUserByUuid({
    db,
    uuid,
}: GetUserByUuidArgs): Promise<InternalUser | null> {
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
        WHERE 
            uuid = $1
        `;
    try {
        const {
            rows: [user],
        } = await db.query(query, [uuid]);
        return user || null;
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
            confirmed=true
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

        return user || null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

// ts returning of function
export async function setPasswordReset({
    db,
    id,
}: SetPasswordResetArgs): Promise<string | null> {
    const token = uuid();
    const query = `
        INSERT INTO
            tokens
            (
                user_id, 
                token, 
                type
            )
        VALUES 
            (
                $1,
                $2,
                'PASSWORD_RESET'
            )
        ON CONFLICT
            (
                user_id, 
                type
            )
        DO
            UPDATE
            SET 
                token=$2,
                created_at=NOW()
            WHERE
                tokens.user_id=$1
        `;

    try {
        const { rowCount } = await db.query(query, [id, token]);
        if (rowCount === 0) return null;
        return token;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function resetingPassword({
    db,
    uuid,
    token,
    password,
}: ResetingPassword): Promise<InternalUser | null> {
    const query = `
        WITH 
            users_tokens
        AS (
                SELECT 
                    users.id,
                    tokens.created_at,
                    users.confirmed
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
            password=$3
        WHERE
            id = (
                SELECT
                    users_tokens.id
                FROM
                    users_tokens
                WHERE
                    age(now(), users_tokens.created_at) < ('15 min'::interval)
                AND
                    users_tokens.confirmed='t'
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
        } = await db.query(query, [token, uuid, await hash(password)]);
        if (user === null) return null;
        return user || null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateGeneralUser({
    db,
    uuid,
    email,
    givenName,
    familyName,
}: UpdateGeneralUserArgs): Promise<true | null> {
    const query = `
        UPDATE
            users
        SET
            email=$2,
            given_name=$3,
            family_name=$4
        WHERE
            uuid=$1
            `;

    try {
        const { rowCount } = await db.query(query, [
            uuid,
            email,
            givenName,
            familyName,
        ]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updatePasswordUser({
    db,
    uuid,
    newPassword,
}: UpdatePasswordUserArgs): Promise<true | null> {
    const query = `
        UPDATE
            users
        SET
            password=$2
        WHERE
            uuid=$1
        `;

    try {
        const { rowCount } = await db.query(query, [
            uuid,
            await hash(newPassword),
        ]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateExtendedUser({
    db,
    uuid,
    age,
    gender,
    sexualOrientation,
}: UpdateExtendedUserArgs): Promise<true | null> {
    const query = ` 
        WITH
            id_user
        AS
        (
            SELECT
                id
            FROM
                users
            WHERE
                uuid=$1
        ),
            id_extended
        AS
        (
            INSERT INTO
                extended_profiles
                (
                    user_id,
                    age,
                    gender,
                    sexual_orientation
                )
            VALUES
                (
                    (select id from id_user),
                    $2,
                    $3,
                    $4
                )
            ON CONFLICT
                (
                    user_id
                )
            DO
                UPDATE
                SET
                    age=$2,
                    gender=$3,
                    sexual_orientation=$4
                WHERE
                    extended_profiles.user_id=(select id from id_user)
            RETURNING
                id
            )
            UPDATE
                users
            SET
                extended_profile=(select id from id_extended)
            WHERE
                id=(select id from id_user);
            `;

    try {
        const { rowCount } = await db.query(query, [
            uuid,
            age,
            gender,
            sexualOrientation,
        ]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateBiography({
    db,
    uuid,
    biography,
}: UpdateBiographyArgs): Promise<true | null> {
    const query = `
        WITH
            id_user
        AS
        (
            SELECT
                id
            FROM
                users
            WHERE
                uuid=$1
        ),
            id_extended
        AS
        (
            INSERT INTO
                extended_profiles
                (
                    user_id,
                    biography
                )
            VALUES
                (
                    (select id from id_user),
                    $2
                )
            ON CONFLICT
                (
                    user_id
                )
            DO
                UPDATE
                SET
                    biography=$2
                WHERE
                    extended_profiles.user_id=(select id from id_user)
            RETURNING
                id
        )
        UPDATE
            users
        SET
            extended_profile=(select id from id_extended)
        WHERE
            id=(select id from id_user);
    
    `;
    try {
        const { rowCount } = await db.query(query, [uuid, biography]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}
