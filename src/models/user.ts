import { CLOUD_ENDPOINT, PROFILE_PICTURES_BUCKET } from './../constants';
import uuid from 'uuid/v4';
import { hash } from 'argon2';
import got from 'got';

import { ModelArgs } from './index';

export interface CreateUserArgs extends ModelArgs {
    email: string;
    username: string;
    givenName: string;
    familyName: string;
    password: string;
    acceptGeolocation: Boolean;
}

export interface GetUserByUsernameArgs extends ModelArgs {
    username: string;
}

export interface GetUserByEmailArgs extends ModelArgs {
    email: string;
}

export interface GetUserByUuidArgs extends ModelArgs {
    uuid: string;
    meUuid?: string;
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
    uuid: string;
    newPics: string;
}

export interface TagsArgs extends ModelArgs {
    uuid: string;
    tag: string;
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
    auto: boolean;
}

export interface DeleteAddressArgs extends ModelArgs {
    uuid: string;
}

export interface UpdateLocation extends ModelArgs {
    uuid: string;
    value: boolean;
}

export interface UpdateRoaming extends ModelArgs {
    uuid: string;
    value: Roaming;
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

export enum Roaming {
    'ACCEPTED',
    'REFUSED',
    'NOT_SET',
}

export interface Image {
    uuid: string;
    src: string;
    imageNumber: number;
}

export interface Addresses {
    point: {
        x: number;
        y: number;
    };
    name: string;
    administrative: string;
    county: string;
    country: string;
    city: string;
    type: boolean;
}

export interface Score extends ModelArgs {
    actorUuid: string;
    destUuid: string;
    type: string;
}

export interface Tags {
    uuid: string;
    name: string;
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
    isOnline: boolean;
    lastSeen: number;
    sawMessages: boolean;
    email: string;
    score: number;
    createdAt: string;
    confirmed: boolean;
    birthday?: number;
    age?: number;
    gender?: Gender;
    sexualOrientation?: SexualOrientation;
    biography?: string;
    likeStatus: string;
    location: Boolean;
    roaming: Roaming;
    images: Image[];
    addresses: Addresses[];
    tags: Tags[];
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

export interface GetUsernameByUserUuidArgs extends ModelArgs {
    uuid: string;
}

type AddressInformations = {
    road: string;
    house_number: string;
    state: string;
    county: string;
    country: string;
    city: string;
};

export function srcToPath(src: string) {
    return `${CLOUD_ENDPOINT}${PROFILE_PICTURES_BUCKET}${src}`;
}

export function internalUserToExternalUser({
    id,
    uuid,
    score,
    givenName,
    familyName,
    username,
    isOnline,
    lastSeen,
    sawMessages,
    email,
    createdAt,
    confirmed,
    birthday,
    biography,
    gender,
    sexualOrientation,
    likeStatus,
    images,
    addresses,
    tags,
    location,
    roaming,
}: InternalUser): ExternalUser {
    return {
        uuid,
        score,
        givenName,
        familyName,
        username,
        email,
        isOnline,
        lastSeen,
        sawMessages,
        createdAt,
        confirmed,
        birthday,
        biography,
        gender,
        sexualOrientation,
        likeStatus,
        location,
        roaming,
        images,
        addresses,
        tags,
    };
}

export async function score({
    db,
    actorUuid,
    destUuid,
    type,
}: Score): Promise<true | null> {
    const query = `
        UPDATE
            users
        SET
            score = score + CEIL(
                (SELECT score FROM users WHERE uuid = $1)::NUMERIC * $3
            )::INTEGER
        WHERE
            users.uuid = $2
    `;

    const MULTIPLICATORS = new Map([
        ['GOT_LIKE', 0.05],
        ['GOT_VISIT', 0.01],
        ['GOT_UNLIKE', -0.025],
        ['GOT_REPORT', -0.25],
        ['GOT_BLOCK', -0.4],
    ]);

    try {
        const { rowCount } = await db.query(query, [
            actorUuid,
            destUuid,
            MULTIPLICATORS.get(type),
        ]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function createUser({
    db,
    email,
    username,
    givenName,
    familyName,
    password,
    acceptGeolocation,
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
                    password,
                    location
                ) 
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $8
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
            acceptGeolocation,
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
    meUuid,
}: GetUserByUuidArgs): Promise<InternalUser | null> {
    const isBlocked = `
        SELECT
            is_blocked((SELECT id FROM users WHERE uuid = $1),  (SELECT id FROM users WHERE uuid = $2)) AS "blockStatus"
        `;

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
            users.score,
            users.confirmed,
            users.location,
            users.roaming,
            users.online as "isOnline",
            users.saw_messages as "sawMessages",
            users.last_seen as "lastSeen",
            like_status( (SELECT id FROM users WHERE uuid = $2),users.id) as "likeStatus",
            extended_profiles.birthday,
            EXTRACT(year FROM AGE(extended_profiles.birthday)) as "age",
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

    const addressesQuery = `
        WITH
            user_address
        AS (
            SELECT 
                primary_address_id, 
                current_address_id 
            FROM 
                users 
            WHERE uuid = $1
        )
        SELECT
            point,
            name,
            administrative,
            county,
            country,
            city,
            type
        FROM
            addresses
        WHERE
            addresses.id = (SELECT primary_address_id FROM user_address)
        OR
            addresses.id = (SELECT current_address_id FROM user_address) 
    `;

    const tagsQuery = `
        WITH
            id_user
        AS (
            SELECT id FROM users WHERE uuid = $1
        )
        SELECT
            tags.uuid,
            tags.name as text
        FROM
            users_tags
        INNER JOIN
            tags
        ON
            users_tags.tag_id = tags.id
        WHERE
            users_tags.user_id = (SELECT id FROM id_user);
        `;
    try {
        const uuid2 = meUuid ? meUuid : uuid;
        const {
            rows: [result],
        } = await db.query(isBlocked, [uuid, uuid2]);
        if (result.blockStatus === false) return null;
        const {
            rows: [user],
        } = await db.query(basicInformationsQuery, [uuid, uuid2]);

        const [
            { rows: images },
            { rows: addresses },
            { rows: tags },
        ] = await Promise.all(
            [profilePicturesQuery, addressesQuery, tagsQuery].map(query =>
                db.query(query, [uuid])
            )
        );
        if (!user || !Array.isArray(images)) return null;

        const finalUser = {
            ...user,
            addresses,
            tags,
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
                    AGE(CURRENT_TIMESTAMP, users_tokens.created_at) < ('15 min'::interval)
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

export function updateExtendedUserReturnQuery({
    uuid,
    birthday,
    gender,
    sexualOrientation,
}: UpdateExtendedUserArgs): { text: string; values: any[] } {
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

    return {
        text: query,
        values: [uuid, birthday, gender, sexualOrientation],
    };
}

export async function updateExtendedUser(
    args: UpdateExtendedUserArgs
): Promise<true | null> {
    const query = updateExtendedUserReturnQuery(args);

    try {
        const { rowCount } = await args.db.query(query);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function updateBiographyReturnQuery({
    db,
    uuid,
    biography,
}: UpdateBiographyArgs): { text: string; values: any[] } {
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

    return {
        text: query,
        values: [uuid, biography],
    };
}

export async function updateBiography(
    args: UpdateBiographyArgs
): Promise<true | null> {
    try {
        const query = updateBiographyReturnQuery(args);

        const { rowCount } = await args.db.query(query);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

const LOCATIONIQ_CACHE: Map<string, AddressInformations> = new Map();
const MAX_TRIES = 3;

async function getAddressInformations(
    lat: number,
    lng: number,
    count: number | undefined = 0
): Promise<AddressInformations | null> {
    if (count >= MAX_TRIES) return null;

    const LATLNG_KEY = `${lat}|${lng}`;

    const cacheResult = LOCATIONIQ_CACHE.get(LATLNG_KEY);

    if (cacheResult !== undefined) {
        return cacheResult;
    }

    const {
        body,
    } = await got(
        `https://locationiq.com/v1/reverse_sandbox.php?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
        { json: true }
    );

    if (
        typeof body.error === 'string' &&
        body.error.startsWith('Rate Limited')
    ) {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const result = await getAddressInformations(
                        lat,
                        lng,
                        count + 1
                    );

                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            }, 10_000);
        });
    }

    const {
        address: { road, house_number, state, county, country, city },
    } = body;

    const address = { road, house_number, state, county, country, city };

    LOCATIONIQ_CACHE.set(`${lat}|${lng}`, address);

    return address;
}

export async function updateAddressReturnQuery({
    uuid,
    isPrimary,
    lat,
    long,
    name,
    administrative,
    county,
    country,
    city,
    auto,
}: UpdateAddressArgs): Promise<{ text: string; values: any[] } | null> {
    const query = `
        SELECT upsert_addresses($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `;

    let args = [name, administrative, county, country, city];

    try {
        console.log('lat: ', lat, ' | long: ', long);

        const addressInformations = await getAddressInformations(lat, long);
        if (addressInformations === null) {
            // We probably exceeded the maximum fetches tries.
            return null;
        }

        const {
            road,
            house_number,
            state,
            county,
            country,
            city,
        } = addressInformations;

        if (auto) {
            args = [
                `${house_number === undefined ? '' : `${house_number} `}${
                    road === undefined ? '' : `${road}`
                }`,
                state,
                county,
                country,
                city,
            ];
        }

        return {
            text: query,
            values: [uuid, isPrimary, lat, long, ...args],
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateAddress(
    args: UpdateAddressArgs
): Promise<String | null> {
    try {
        const data = await updateAddressReturnQuery(args);
        if (data === null) return null;

        const {
            rows: [address],
        } = await args.db.query(data);

        return address.upsert_addresses;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteAddress({
    db,
    uuid,
}: DeleteAddressArgs): Promise<true | null> {
    try {
        const query = `
        WITH
            id_address
        AS
        (
            SELECT
                current_address_id
            FROM
                users
            WHERE
                uuid = $1
        ),
            delete_address
        AS
        (
            DELETE FROM
                addresses
            WHERE
                id = (SELECT current_address_id FROM id_address)
        )
        UPDATE
            users
        SET
            current_address_id = NULL
        WHERE
            uuid = $1
        
        `;

        const { rowCount } = await db.query(query, [uuid]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateLocation({
    db,
    uuid,
    value,
}: UpdateLocation): Promise<true | null> {
    const query = `
        UPDATE
            users
        SET 
            location = $2
        WHERE
            uuid = $1`;

    try {
        const { rowCount } = await db.query(query, [uuid, value]);

        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateRoaming({
    db,
    uuid,
    value,
}: UpdateRoaming): Promise<true | null> {
    const query = `
            UPDATE
                users
            SET 
                roaming = $2
            WHERE
                uuid = $1`;

    try {
        const { rowCount } = await db.query(query, [uuid, value]);

        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function updateProfilePicsReturnQuery({
    db,
    uuid: loggedUserUuid,
    newPics,
}: UpdateProfilePicsArgs): { text: string; values: any[] } {
    const query = `
        SELECT
            upsert_profile_picture($1, $2, $3)
    `;

    return {
        text: query,
        values: [loggedUserUuid, newPics, uuid()],
    };
}

export async function updateProfilePics(
    args: UpdateProfilePicsArgs
): Promise<string | null> {
    try {
        const query = updateProfilePicsReturnQuery(args);

        const {
            rows: [image],
        } = await args.db.query(query);

        return image.upsert_profile_picture || null;
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

export function addTagsReturnQuery({
    db,
    uuid: guid,
    tag,
}: TagsArgs): { text: string; values: any[] } {
    const token = uuid();
    const query = `SELECT upsert_tag($1, $3, $2)`;

    return {
        text: query,
        values: [guid, tag, token],
    };
}

export async function addTags(args: TagsArgs): Promise<string | null> {
    try {
        const query = addTagsReturnQuery(args);

        const {
            rows: [tags],
        } = await args.db.query(query);
        return tags.upsert_tag;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteTags({
    db,
    uuid,
    tag,
}: TagsArgs): Promise<string | null> {
    const query = `SELECT delete_tag($1, $2)`;

    try {
        const {
            rows: [tags],
        } = await db.query(query, [uuid, tag]);
        return tags.delete_tag;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getTags({ db }: ModelArgs): Promise<Tags[] | null> {
    const query = `SELECT uuid, name as text FROM tags`;

    try {
        const { rows: tags } = await db.query(query);
        return tags;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUsernameByUserUuid({
    db,
    uuid,
}: GetUsernameByUserUuidArgs): Promise<string | undefined> {
    const query = `
        SELECT
            username
        FROM
            users
        WHERE
            uuid = $1
    `;

    try {
        const {
            rows: [{ username } = { username: undefined }],
        } = await db.query(query, [uuid]);

        return username;
    } catch (e) {
        console.error(e);

        return undefined;
    }
}
