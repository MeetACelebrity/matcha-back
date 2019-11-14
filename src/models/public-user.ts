import { InternalUser, ExternalUser, srcToPath } from './user';
import { ModelArgs } from './index';

export type PublicUser = Omit<ExternalUser, 'email' | 'roaming'>;

export interface HistoryUser {
    username: string;
    uuid: string;
    createdAt: string;
    src: string | null;
}

export interface UserLikeArgs extends ModelArgs {
    uuidIn: string;
    uuidOut: string;
}

export interface GetUsersArgs extends ModelArgs {
    uuid: string;
    limit: number;
    offset: number;
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

export async function getVisitorsByUuid({
    db,
    uuid,
    limit,
    offset,
}: GetUsersArgs): Promise<HistoryUser[] | null> {
    const query = `
    SELECT
        users.username, 
        users.uuid, 
        visits.created_at as "createdAt",
        (
            SELECT 
                images.src 
            FROM 
                images 
            INNER JOIN 
                profile_pictures 
            ON 
                images.id = profile_pictures.image_id 
            WHERE 
                profile_pictures.user_id = users.id
            AND 
                profile_pictures.image_nb = 0
        ) as src
    FROM
        visits 
    INNER JOIN
        users
    ON 
        visits.visitor = users.id 
    WHERE
        visits.visited = (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        )
    ORDER BY
        visits.created_at
    DESC
    LIMIT 
        $2
    OFFSET
        $3
    `;
    try {
        const { rows: visitors } = await db.query(query, [uuid, limit, offset]);
        console.log(visitors);

        return visitors.map(({ src, ...visitors }) => ({
            ...visitors,
            src: src === null ? null : srcToPath(src),
        }));
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getLikerByUuid({
    db,
    uuid,
    limit,
    offset,
}: GetUsersArgs): Promise<HistoryUser[] | null> {
    const query = `
        SELECT
            users.username, 
            users.uuid, 
            likes.created_at as "createdAt",
            (
                SELECT 
                    images.src 
                FROM 
                    images 
                INNER JOIN 
                    profile_pictures 
                ON 
                    images.id = profile_pictures.image_id 
                WHERE 
                    profile_pictures.user_id = users.id
                AND 
                    profile_pictures.image_nb = 0
            ) as src
        FROM
            likes 
        INNER JOIN
            users
        ON 
            likes.liker = users.id 
        WHERE
            likes.liked = (
                SELECT
                    id
                FROM
                    users
                WHERE
                    uuid = $1
            )
        ORDER BY
            likes.created_at
        DESC
        LIMIT 
            $2
        OFFSET
            $3`;
    try {
        const { rows: liker } = await db.query(query, [uuid, limit, offset]);
        console.log(liker);

        return liker.map(({ src, ...liker }) => ({
            ...liker,
            src: src === null ? null : srcToPath(src),
        }));
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userLike({
    db,
    uuidIn,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
        WITH 
            user_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ),
            liker_id
        AS (
            SELECT
                (SELECT id FROM user_id) as id
            FROM
                profile_pictures
            WHERE
                user_id = (SELECT id FROM user_id)
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
        )
        `;

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
        user_id
    AS (
        SELECT
            id
        FROM
            users
        WHERE
            uuid = $1
    ),
        liker_id
    AS (
        SELECT
            (SELECT id FROM user_id) as id
        FROM
            profile_pictures
        WHERE
            user_id = (SELECT id FROM user_id)
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

export async function userBlock({
    db,
    uuidIn,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
        WITH 
            blocker_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ),
            blocked_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        )
        INSERT INTO
            blocks
        (
            blocker,
            blocked
        )
        VALUES
        (
            (SELECT id FROM blocker_id),
            (SELECT id FROM blocked_id)
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

export async function userReport({
    db,
    uuidIn,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
        WITH 
            reporter_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ),
            reported_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        )
        INSERT INTO
            reports
        (
            reporter,
            reported
        )
        VALUES
        (
            (SELECT id FROM reporter_id),
            (SELECT id FROM reported_id)
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
