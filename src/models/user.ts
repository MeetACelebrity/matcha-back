import { CLOUD_ENDPOINT, PROFILE_PICTURES_BUCKET } from './../constants';
import { UpdateBiographyArgs } from './../../dist/models/user.d';
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
    birthday: string;
    gender: Gender;
    sexualOrientation: SexualOrientation;
}

export interface UpdateProfilePicsArgs extends ModelArgs {
    uuid1: string;
    newPics: string;
}

export interface UpdateTagsArgs extends ModelArgs {
    uuid: string;
    tags: string;
}

export interface UpdateAddressArgs extends ModelArgs {
    uuid: string;
    isPrimary: boolean;
    lat: number;
    long: number;
    name: string;
    administrative: string;
    county: string;
    country: string;
    city: string;
}

export interface InsertPicsArgs extends ModelArgs {
    uuid1: string;
    newPics: string;
}

export interface InsertPicsReturning {
    uuid: string;
    src: string;
    imageNumber: number;
    error: string;
}

export interface DeletePicsArgs extends ModelArgs {
    uuid: string;
    pics: string;
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

export interface Image {
    uuid: string;
    src: string;
    imageNumber: number;
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
    birthday?: number;
    gender?: Gender;
    sexualOrientation?: SexualOrientation;
    biography?: string;
    images: Image[];
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

export function srcToPath(src: string) {
    return `${CLOUD_ENDPOINT}${PROFILE_PICTURES_BUCKET}${src}`;
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
    birthday,
    biography,
    gender,
    sexualOrientation,
    images,
}: InternalUser): ExternalUser {
    return {
        uuid,
        givenName,
        familyName,
        username,
        email,
        createdAt,
        confirmed,
        birthday,
        biography,
        gender,
        sexualOrientation,
        images,
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
    const basicInformationsQuery = `
        SELECT
            users.id,
            users.uuid,
            users.given_name as "givenName",
            users.family_name as "familyName",
            users.username,
            users.email,
            users.password,
            users.created_at as "createdAt",
            users.confirmed,
            extended_profiles.birthday,
            extended_profiles.gender,
            extended_profiles.sexual_orientation as "sexualOrientation",
            extended_profiles.biography
        FROM
            users
        LEFT JOIN
            extended_profiles
        ON
            users.id = extended_profiles.user_id
        WHERE
            users.uuid = $1
        `;

    const profilePicturesQuery = `
        WITH
            id_user
        AS (
            SELECT id FROM users WHERE uuid = $1
        )
        SELECT
            images.uuid,
            images.src,
            profile_pictures.image_nb AS "imageNumber"
        FROM
            profile_pictures
        INNER JOIN
            images
        ON
            profile_pictures.image_id = images.id
        WHERE
            profile_pictures.user_id = (
                SELECT
                    id
                FROM
                    id_user
            )
    `;
    try {
        const [
            {
                rows: [user],
            },
            { rows: images },
        ] = await Promise.all(
            [basicInformationsQuery, profilePicturesQuery].map(query =>
                db.query(query, [uuid])
            )
        );

        if (!user || !Array.isArray(images)) return null;

        const finalUser = {
            ...user,
            images: images.map(({ src, ...images }) => ({
                ...images,
                src: srcToPath(src),
            })),
        };

        return finalUser;
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
                    users.confirmed,
                    tokens.id as token_id
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
            ),
            delete_token
        AS (
            DELETE FROM
                tokens
            WHERE
                id=(
                    SELECT token_id FROM users_tokens
                )
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
                    birthday(now(), users_tokens.created_at) < ('15 min'::interval)
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
    birthday,
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
                    birthday,
                    gender,
                    sexual_orientation
                )
            VALUES
                (
                    (SELECT id FROM id_user),
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
                    birthday=$2,
                    gender=$3,
                    sexual_orientation=$4
                WHERE
                    extended_profiles.user_id=(
                        SELECT id FROM id_user
                    )
            RETURNING
                id
            )
            UPDATE
                users
            SET
                extended_profile=(select id from id_extended)
            WHERE
                id=(
                    SELECT id FROM id_user
                );
            `;

    try {
        const { rowCount } = await db.query(query, [
            uuid,
            birthday,
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
                    (SELECT id FROM id_user),
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
                    extended_profiles.user_id = (
                        SELECT id FROM id_user
                    )
            RETURNING
                id
        )
        UPDATE
            users
        SET
            extended_profile = (
                SELECT id FROM id_extended
            )
        WHERE
            id = ( 
                SELECT id FROM id_user
            );
    
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

export async function updateAddress({
    db,
    uuid,
    isPrimary,
    lat,
    long,
    name,
    administrative,
    county,
    country,
    city,
}: UpdateAddressArgs): Promise<true | null> {
    const query = `
       
            
    `;

    try {
        const { rowCount } = await db.query(query, [
            uuid,
            isPrimary,
            lat,
            long,
            name,
            administrative,
            county,
            country,
            city,
        ]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateTags({
    db,
    uuid: guid,
    tags,
}: UpdateTagsArgs): Promise<true | null> {
    const token = uuid();

    const query = `
       
        `;
    try {
        const { rowCount } = await db.query(query, [guid, tags, token]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateProfilePics({
    db,
    uuid1,
    newPics,
}: UpdateProfilePicsArgs): Promise<string | null> {
    const uuid2 = uuid();
    const query = `SELECT upsert_profile_picture($1, $2, $3)`;
    try {
        const {
            rows: [image],
        } = await db.query(query, [uuid1, newPics, uuid2]);
        return image.upsert_profile_picture;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function insertPics({
    db,
    uuid1,
    newPics,
}: InsertPicsArgs): Promise<InsertPicsReturning | null> {
    const uuid2 = uuid();
    const query = `SELECT * FROM insert_picture($1, $2, $3)`;

    try {
        const {
            rows: [image],
        } = await db.query(query, [uuid1, newPics, uuid2]);
        return image;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deletePics({
    db,
    uuid,
    pics,
}: DeletePicsArgs): Promise<string | null> {
    const query = `SELECT delete_picture($1, $2)`;

    try {
        const {
            rows: [image],
        } = await db.query(query, [uuid, pics]);
        return image.delete_picture;
    } catch (e) {
        console.error(e);
        return null;
    }
}
