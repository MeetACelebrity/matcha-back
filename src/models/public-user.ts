import { InternalUser, ExternalUser, srcToPath, score } from './user';
import { ModelArgs } from './index';
import { createConv, deleteConv, setNotif, NotificationType } from './chat';
import { Database } from '../database';
import { WS } from '../ws';

export interface PublicUser extends Omit<ExternalUser, 'email' | 'roaming'> {
    isLiker: Boolean;
}

export interface HistoryUser {
    username: string;
    uuid: string;
    createdAt: string;
    src: string | null;
}

export interface UserLikeArgs extends ModelArgs {
    ws: WS;
    uuidIn: string;
    userInUsername: string;
    uuidOut: string;
}

export interface UserActionArgs extends ModelArgs {
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
    age,
    biography,
    gender,
    sexualOrientation,
    likeStatus,
    images,
    addresses,
    tags,
    location,
    roaming,
}: InternalUser): PublicUser {
    return {
        uuid,
        score,
        givenName,
        familyName,
        username,
        isOnline,
        lastSeen,
        sawMessages,
        createdAt,
        confirmed,
        birthday,
        age,
        biography,
        gender,
        sexualOrientation,
        likeStatus,
        location,
        images,
        addresses,
        tags,
        isLiker: false,
    };
}

export async function getVisitorsByUuid({
    db,
    uuid,
    limit,
    offset,
}: GetUsersArgs): Promise<{ data: HistoryUser[]; hasMore: Boolean } | null> {
    const query = `
    SELECT
        count(*) OVER() as "size",
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
        const { rows: visitors, rowCount } = await db.query(query, [
            uuid,
            limit,
            offset,
        ]);

        if (rowCount === 0) {
            return {
                data: [],
                hasMore: false,
            };
        }

        const hasMore = visitors[0].size - offset - limit > 0 ? true : false;
        const data = visitors.map(({ src, username, uuid, createdAt }) => ({
            username,
            uuid,
            createdAt,
            src: src === null ? null : srcToPath(src),
        }));

        return { data, hasMore };
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
}: GetUsersArgs): Promise<{ data: HistoryUser[]; hasMore: Boolean } | null> {
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
        const { rows: likers, rowCount } = await db.query(query, [
            uuid,
            limit,
            offset,
        ]);

        if (rowCount === 0) {
            return {
                data: [],
                hasMore: false,
            };
        }

        const hasMore =
            Array.isArray(likers) &&
            likers[0] !== undefined &&
            likers[0].size - offset - limit > 0;

        return {
            hasMore,
            data: likers.map(({ src, ...fields }) => ({
                ...fields,
                src: src === null ? null : srcToPath(src),
            })),
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userLike({
    db,
    ws,
    uuidIn,
    userInUsername,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
        WITH user_id AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ), liker_id AS (
            SELECT
                user_id.id AS "id"
            FROM
                user_id,
                profile_pictures
            WHERE
                profile_pictures.user_id = user_id.id
                    AND
                profile_pictures.image_nb = 0
        ), liked_id AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        )
        INSERT INTO likes (
            liker,
            liked
        )
        SELECT
            liker_id.id,
            liked_id.id
        FROM
            liker_id,
            liked_id
        WHERE
            is_blocked(liker_id.id, liked_id.id) = TRUE
        RETURNING
            is_matched(
                (SELECT id FROM liker_id),
                (SELECT id FROM liked_id)
            )
    `;

    try {
        const {
            rows: [result],
            rowCount,
        } = await db.query(query, [uuidIn, uuidOut]);

        if (rowCount === 0) {
            return null;
        }

        if (result.is_matched === true) {
            if (
                !(await createConv({ db, ws, uuid1: uuidIn, uuid2: uuidOut }))
            ) {
                // return null;
            }
        }

        const notificationType =
            result.is_matched === true
                ? NotificationType.GOT_LIKE_MUTUAL
                : NotificationType.GOT_LIKE;

        // send notif to uuidOut: "Matched ! : uuidIn liked back your profile"
        // OR
        // send notif to uuidOut: "uuidIn liked your profile"
        await setNotif({
            db,
            ws,
            destUuid: uuidOut,
            sendUuid: uuidIn,
            senderUsername: userInUsername,
            type: notificationType,
        });

        // re-evaluated the score
        await score({
            db,
            actorUuid: uuidIn,
            destUuid: uuidOut,
            type: 'GOT_LIKE',
        });
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userUnLike({
    db,
    ws,
    uuidIn,
    userInUsername,
    uuidOut,
}: UserLikeArgs): Promise<true | null> {
    const query = `
        WITH user_id AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ), liker_id AS (
            SELECT
                user_id.id AS "id"
            FROM
                user_id,
                profile_pictures
            WHERE
                profile_pictures.user_id = user_id.id
                    AND
                profile_pictures.image_nb = 0
        ), liked_id AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        )
        DELETE FROM
            likes
        USING
            liker_id,
            liked_id
        WHERE
            likes.liker = liker_id.id
        AND
            likes.liked = liked_id.id
        RETURNING
            is_liked(liked_id.id, liker_id.id)
    `;

    try {
        const {
            rows: [result],
            rowCount,
        } = await db.query(query, [uuidIn, uuidOut]);

        if (rowCount === 0) {
            return null;
        }

        if (result.is_liked === true) {
            // send notif to uuidOut: "uuidIn unlike your profile :("
            await setNotif({
                db,
                ws,
                destUuid: uuidOut,
                sendUuid: uuidIn,
                senderUsername: userInUsername,
                type: NotificationType.GOT_UNLIKE_MUTUAL,
            });

            await deleteConv({ db, uuid1: uuidIn, uuid2: uuidOut });
        }
        await score({
            db,
            actorUuid: uuidIn,
            destUuid: uuidOut,
            type: 'GOT_UNLIKE',
        });
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userSee({
    db,
    ws,
    uuidIn,
    userInUsername,
    uuidOut,
}: UserLikeArgs): Promise<{ liker: number } | null> {
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
        )
        RETURNING
            (
                SELECT
                    liker
                FROM
                    likes
                WHERE
                    liker = (SELECT id FROM visited_id)
                AND
                    liked = (SELECT id FROM visitor_id)
            )`;

    try {
        const {
            rows: [liked],
        } = await db.query(query, [uuidIn, uuidOut]);
        // send notif uuidOut: "uuidIn see your profile"
        await setNotif({
            db,
            ws,
            destUuid: uuidOut,
            sendUuid: uuidIn,
            senderUsername: userInUsername,
            type: NotificationType.GOT_VISIT,
        });

        await score({
            db,
            actorUuid: uuidIn,
            destUuid: uuidOut,
            type: 'GOT_VISIT',
        });
        return liked;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userBlock({
    db,
    uuidIn,
    uuidOut,
}: UserActionArgs): Promise<true | null> {
    const query = `
        SELECT block_user($1, $2)
    `;

    try {
        const { rowCount } = await db.query(query, [uuidIn, uuidOut]);
        if (rowCount === 0) return null;
        await score({
            db,
            actorUuid: uuidIn,
            destUuid: uuidOut,
            type: 'GOT_BLOCK',
        });
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
}: UserActionArgs): Promise<true | null> {
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
        await score({
            db,
            actorUuid: uuidIn,
            destUuid: uuidOut,
            type: 'GOT_REPORT',
        });
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function userNotInterested({
    db,
    uuidIn,
    uuidOut,
}: UserActionArgs): Promise<true | null> {
    const query = `
        WITH 
            actor_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        ),
            target_id
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        )
        INSERT INTO
            not_interested
        (
            actor,
            target
        )
        VALUES
        (
            (SELECT id FROM actor_id),
            (SELECT id FROM target_id)
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

export async function onlineUser({
    db,
    uuid,
    value,
}: {
    db: Database;
    uuid: string;
    value: boolean;
}): Promise<true | null> {
    // true, update online filed
    const query = `
        UPDATE
            users
        SET
            online = $2,
            last_seen = $3
        WHERE
            uuid = $1`;

    try {
        const time = new Date();
        const { rowCount } = await db.query(query, [
            uuid,
            Boolean(value),
            time.toISOString(),
        ]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}
