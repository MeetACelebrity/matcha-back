import { ModelArgs } from './index';
import uuid from 'uuid/v4';
import { srcToPath } from './user';
import { WS, OutMessageType } from '../ws';

export interface CreateConv extends ModelArgs {
    ws: WS;
    uuid1: string;
    uuid2: string;
}

export interface DeleteConv extends ModelArgs {
    uuid1: string;
    uuid2: string;
}

export interface Conv extends ModelArgs {
    uuid: string;
}

export interface CreateMessage extends ModelArgs {
    convUuid: string;
    authorUuid: string;
    payload: string;
}

export interface DeleteMessage extends ModelArgs {
    messageUuid: string;
    authorUuid: string;
}

export interface ChatMessage {
    uuid: string;
    authorUuid: string;
    authorUsername: string;
    payload: string;
}

export interface ConvsFormat {
    uuid: string;
    users: { uuid: string; username: string; profilePic: string }[];
    messages: ChatMessage[];
}

export enum NotificationType {
    GOT_LIKE = 'GOT_LIKE',
    GOT_VISIT = 'GOT_VISIT',
    GOT_MESSAGE = 'GOT_MESSAGE',
    GOT_LIKE_MUTUAL = 'GOT_LIKE_MUTUAL',
    GOT_UNLIKE_MUTUAL = 'GOT_UNLIKE_MUTUAL',
}
export interface SetNotif extends ModelArgs {
    ws: WS;
    destUuid: string;
    sendUuid: string;
    senderUsername: string;
    type: NotificationType;
}

export interface Notif extends ModelArgs {
    uuid: string;
}

export interface SawNotificationsArgs extends ModelArgs {
    userId: number;
}

export interface SetSawMessagesToTrueArgs extends ModelArgs {
    userUuid: string;
}

export async function createConv({
    db,
    ws,
    uuid1,
    uuid2,
}: CreateConv): Promise<boolean | null> {
    const query = `
        SELECT
            create_conv($1, $2, $3),
            (SELECT username FROM users WHERE uuid = $1) as "username1",
            (SELECT username FROM users WHERE uuid = $2) as "username2",
            (
                SELECT
                    images.src
                FROM
                    users
                INNER JOIN
                    profile_pictures
                ON
                    users.id = profile_pictures.user_id
                INNER JOIN
                    images
                ON
                    profile_pictures.image_id = images.id
                WHERE
                    users.uuid = $1
                        AND
                    profile_pictures.image_nb = 0
            ) as "profilePic1",
            (
                SELECT
                    images.src
                FROM
                    users
                INNER JOIN
                    profile_pictures
                ON
                    users.id = profile_pictures.user_id
                INNER JOIN
                    images
                ON
                    profile_pictures.image_id = images.id
                WHERE
                    users.uuid = $2
                        AND
                    profile_pictures.image_nb = 0
            ) as "profilePic2"
    `;

    try {
        const conversationUuid = uuid();

        const {
            rows: [result],
        } = await db.query(query, [uuid1, uuid2, conversationUuid]);

        // A user has probably blocked another one.
        // if (!(result && result.create_conv)) {
        //     return null;
        // }

        const usersId = [uuid1, uuid2];

        ws.subscribeUsersToRoom(conversationUuid, usersId);

        ws.broadcastToUsers(usersId, {
            type: OutMessageType.NEW_CONVERSATION,
            payload: {
                uuid: conversationUuid,
                users: [
                    {
                        uuid: uuid1,
                        username: result.username1,
                        profilePic: srcToPath(result.profilePic1),
                    },
                    {
                        uuid: uuid2,
                        username: result.username2,
                        profilePic: srcToPath(result.profilePic2),
                    },
                ],
                messages: [],
            },
        });

        return result.create_conv;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteConv({
    db,
    uuid1,
    uuid2,
}: DeleteConv): Promise<boolean | null> {
    try {
        const query = `SELECT delete_conv($1, $2)`;

        const {
            rows: [result],
        } = await db.query(query, [uuid1, uuid2]);
        return result.delete_conv;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function createMessage({
    db,
    convUuid,
    authorUuid,
    payload,
}: CreateMessage): Promise<{
    uuid: string;
    authorUuid: string;
    authorUsername: string;
    payload: string;
    createdAt: number;
} | null> {
    try {
        const query = `SELECT create_message($1, $2, $3, $4), (SELECT username FROM users WHERE uuid = $2)`;
        const messageUuid = uuid();

        const {
            rows: [result],
        } = await db.query(query, [convUuid, authorUuid, payload, messageUuid]);
        if (result.create_message === true) {
            return {
                authorUuid,
                payload,
                uuid: messageUuid,
                authorUsername: result.username,
                createdAt: Date.now(),
            };
        }
        return null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteMessage({
    db,
    messageUuid,
    authorUuid,
}: DeleteMessage): Promise<boolean | null> {
    try {
        const query = `SELECT delete_message($1, $2)`;

        const {
            rows: [result],
        } = await db.query(query, [messageUuid, authorUuid]);
        return result.delete_message;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getConvs({
    db,
    uuid,
}: Conv): Promise<ConvsFormat[] | null> {
    try {
        const query = `SELECT * FROM get_convs($1)`;

        const { rows: convs } = await db.query(query, [uuid]);
        return convs.map(({ uuid, conv_users, conv_messages }) => ({
            uuid,
            users:
                conv_users !== null
                    ? conv_users.map((convUser: string) => {
                          const [uuid, username] = convUser
                              .slice(1, -1)
                              .split(',');

                          return {
                              uuid,
                              username,
                              profilePic: srcToPath(
                                  convUser.slice(1, -1).split(',')[2]
                              ),
                          };
                      })
                    : null,
            messages:
                conv_messages !== null
                    ? conv_messages.map((convMessage: string) => {
                          const [
                              uuid,
                              authorUuid,
                              authorUsername,
                              payload,
                              createdAt,
                          ] = convMessage.slice(1, -1).split(',');

                          return {
                              uuid,
                              authorUuid,
                              createdAt,
                              authorUsername,
                              payload: payload.replace(/['"]+/g, ''),
                          };
                      })
                    : null,
        }));
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getUserOfConv({ db, uuid }: Conv) {
    try {
        const query = `
            WITH
                id_conv
            AS (
                SELECT
                    id
                FROM
                    conversations
                WHERE
                    uuid = $1
            )
            SELECT 
                array_agg("conv_users_list"::text) as "convUsers"
            FROM
                get_convs_users((SELECT id FROM id_conv))
            
            `;

        const { rows: result } = await db.query(query, [uuid]);

        return result.map(({ convUsers }) => ({
            uuids: convUsers.map(
                (user: string) => user.slice(1, -1).split(',')[0]
            ),
        }));
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function generateNotifMessage({
    username,
    type,
}: {
    username: string;
    type: NotificationType;
}): string {
    const notificationMessages = new Map([
        [NotificationType.GOT_LIKE, ' liked your profile'],
        [NotificationType.GOT_VISIT, ' is visiting your profile'],
        [NotificationType.GOT_MESSAGE, ' sent you a message'],
        [NotificationType.GOT_LIKE_MUTUAL, ' has matched with you'],
        [NotificationType.GOT_UNLIKE_MUTUAL, ' has unmatched you '],
    ]);

    return username + notificationMessages.get(type);
}

export async function setNotif({
    db,
    ws,
    destUuid,
    sendUuid,
    senderUsername,
    type,
}: SetNotif): Promise<true | null> {
    const query = `
        WITH id_dest AS (
            SELECT
                id, username
            FROM
                users
            WHERE
                uuid = $2
        ), id_send AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $3
        ), operation_permitted AS (
            SELECT
                COUNT(*) = 0 AS "bool"
            FROM
                blocks,
                id_dest,
                id_send
            WHERE
                id_dest.id = blocks.blocker
                    AND
                id_send.id = blocks.blocked
        )
        INSERT INTO notifications (
            uuid,
            type,
            notified_user_id,
            notifier_user_id
        )
        SELECT
            $1,
            $4,
            id_dest.id,
            id_send.id
        FROM
            id_dest,
            id_send,
            operation_permitted
        WHERE
            operation_permitted.bool = TRUE;
    `;

    try {
        const notifUuid = uuid();

        const { rowCount } = await db.query(query, [
            notifUuid,
            destUuid,
            sendUuid,
            type,
        ]);

        if (rowCount === 0) {
            // The operation was probably unauthorized

            return null;
        }

        // notif user
        ws.broadcastToUsers([destUuid], {
            type: OutMessageType.NEW_NOTIFICATION,
            payload: {
                type,
                uuid: notifUuid,
                message: generateNotifMessage({
                    type,
                    username: senderUsername,
                }),
                seen: false,
                createdAt: +new Date(),
            },
        });
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function sawNotifications({
    db,
    userId,
}: SawNotificationsArgs): Promise<boolean> {
    const query = `
        UPDATE
            notifications
        SET
            seen = TRUE
        WHERE
            notified_user_id = $1;
    `;

    try {
        await db.query(query, [userId]);

        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getNotifs({ db, uuid }: Notif) {
    const query = `
        WITH
            id_user
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
        )
        SELECT
            notifications.uuid,
            notifications.type,
            users.username,
            notifications.seen,
            notifications.created_at as "createdAt"
        FROM
            id_user,
            notifications
        INNER JOIN
            users
        ON
            notifications.notifier_user_id = users.id
        WHERE
            notifications.notified_user_id = id_user.id
        ORDER BY
            notifications.created_at
        DESC
            `;

    try {
        const { rows: notifications } = await db.query(query, [uuid]);

        return notifications.map(
            ({ uuid, type, username, seen, createdAt }) => ({
                uuid,
                seen,
                type,
                createdAt,
                message: generateNotifMessage({ username, type }),
            })
        );
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function setSawMessagesToTrue({
    db,
    userUuid,
}: SetSawMessagesToTrueArgs): Promise<boolean | null> {
    const query = `
        UPDATE
            users
        SET
            saw_messages = TRUE
        WHERE
            uuid = $1
    `;

    try {
        const { rowCount } = await db.query(query, [userUuid]);

        return rowCount === 1;
    } catch (e) {
        console.error(e);
        return null;
    }
}
