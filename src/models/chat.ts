import { ModelArgs } from './index';
import uuid from 'uuid/v4';
import { srcToPath } from './user';

export interface CreateConv extends ModelArgs {
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
    users: { uuid: string; username: string }[];
    messages: ChatMessage[];
}

export enum NotificationType {
    'GOT_LIKE',
    'GOT_VISIT',
    'GOT_MESSAGE',
    'GOT_LIKE_MUTUAL',
    'GOT_UNLIKE_MUTUAL',
}
export interface SetNotif extends ModelArgs {
    destUuid: string;
    sendUuid: string;
    type: NotificationType;
}

export interface Notif extends ModelArgs {
    uuid: string;
    seen: boolean;
}

export async function createConv({
    db,
    uuid1,
    uuid2,
}: CreateConv): Promise<boolean | null> {
    try {
        const query = `SELECT create_conv($1, $2, $3)`;
        const uuid3 = uuid();

        const {
            rows: [result],
        } = await db.query(query, [uuid1, uuid2, uuid3]);
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
}: CreateConv): Promise<boolean | null> {
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
                    ? conv_users.map((convUser: string) => ({
                          uuid: convUser.slice(1, -1).split(',')[0],
                          username: convUser.slice(1, -1).split(',')[1],
                          profilePic: srcToPath(
                              convUser.slice(1, -1).split(',')[2]
                          ),
                      }))
                    : null,
            messages:
                conv_messages !== null
                    ? conv_messages.map((convMessage: string) => ({
                          uuid: convMessage.slice(1, -1).split(',')[0],
                          authorUuid: convMessage.slice(1, -1).split(',')[1],
                          authorUsername: convMessage
                              .slice(1, -1)
                              .split(',')[2],
                          payload: convMessage.slice(1, -1).split(',')[3],
                          createdAt: Date.parse(
                              convMessage.slice(1, -1).split(',')[4]
                          ),
                      }))
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

export async function setNotif({
    db,
    destUuid,
    sendUuid,
    type,
}: SetNotif): Promise<true | null> {
    const query = `
        WITH
            id_dest 
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $2
        ), 
            id_send
        AS (
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $3
        )
        INSERT INTO
            notifications (
                uuid,
                type,
                notified_user_id,
                notifier_user_id
            )
        VALUES (
                $1,
                $4,
                (SELECT id FROM id_dest),
                (SELECT id FROM id_send)
            )`;

    try {
        const notifUuid = uuid();
        const { rowCount } = await db.query(query, [
            notifUuid,
            destUuid,
            sendUuid,
            type,
        ]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function seenNotif({ db, uuid }: Notif): Promise<true | null> {
    const query = `
            UPDATE
                notifications
            SET
                seen = TRUE
            WHERE
                uuid = $1;`;
    try {
        const { rowCount } = await db.query(query, [uuid]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getNotifs({ db, uuid, seen }: Notif) {
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
            uuid,
            type,
            (SELECT username FROM users WHERE id = notifications.notifier_user_id),
            seen
        FROM
            notifications
        WHERE
            notified_user_id = ( SELECT id FROM id_user)
        AND
            seen = $2; 
            `;

    try {
        if (typeof seen !== 'boolean') return null;
        const notificationMessages = new Map([
            ['GOT_LIKE', ' liked your profile'],
            ['GOT_VISIT', ' visit your profile'],
            ['GOT_MESSAGE', ' send you a message'],
            ['GOT_LIKE_MUTUAL', ' has matched with you'],
            ['GOT_UNLIKE_MUTUAL', ' has unmatched you '],
        ]);

        const { rows: notifications } = await db.query(query, [uuid, seen]);

        return notifications.map(({ uuid, type, username, seen }) => ({
            uuid,
            seen,
            message: username + notificationMessages.get(type),
        }));
    } catch (e) {
        console.error(e);
        return null;
    }
}
