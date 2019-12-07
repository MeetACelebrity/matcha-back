import { ModelArgs } from './index';
import uuid from 'uuid/v4';

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
}: CreateMessage): Promise<boolean | null> {
    try {
        const query = `SELECT create_message($1, $2, $3, $4)`;
        const messageUuid = uuid();

        const {
            rows: [result],
        } = await db.query(query, [convUuid, authorUuid, payload, messageUuid]);
        return result.create_message;
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
