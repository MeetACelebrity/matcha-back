import { InternalUser, ExternalUser } from './user';
import { ModelArgs } from './index';

export type PublicUser = Omit<ExternalUser, 'email' | 'roaming'>;

export interface UserLikeArgs extends ModelArgs {
    uuidIn: string;
    uuidOut: string;
}

export function internalUserToPublicUser({
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
    addresses,
    tags,
    location,
    roaming,
}: InternalUser): PublicUser {
    return {
        uuid,
        givenName,
        familyName,
        username,
        createdAt,
        confirmed,
        birthday,
        biography,
        gender,
        sexualOrientation,
        location,
        images,
        addresses,
        tags,
    };
}

export async function userLike({
    db,
    uuidIn,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
        WITH 
            liker_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ),
            liked_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        )
        INSERT INTO
            likes
        (
            liker,
            liked
        )
        VALUES
        (
            (SELECT id FROM liker_id),
            (SELECT id FROM liked_id)
        )`;

    try {
        const { rowCount } = await db.query(query, [uuidIn, uuidOut]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userUnLike({
    db,
    uuidIn,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
    WITH 
        liker_id
    AS (
        SELECT
            id
        FROM
            users
        WHERE
            uuid = $1
    ),
    liked_id
    AS (
        SELECT
            id
        FROM
            users
        WHERE
            uuid = $2
    )
    DELETE FROM
        likes
    WHERE
        liker =  (SELECT id FROM liker_id)
    AND
        liked = (SELECT id FROM liked_id)`;

    try {
        const { rowCount } = await db.query(query, [uuidIn, uuidOut]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userSee({
    db,
    uuidIn,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
        WITH 
            visitor_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ),
            visited_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        )
        INSERT INTO
            visits
        (
            visitor,
            visited
        )
        VALUES
        (
            (SELECT id FROM visitor_id),
            (SELECT id FROM visited_id)
        )`;

    try {
        const { rowCount } = await db.query(query, [uuidIn, uuidOut]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}
