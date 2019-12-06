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

export interface ConvsFormat {
    uuid: string;
    users: { uuid: string; username: string };
    messages: {
        uuid: string;
        authorUuid: string;
        authorUsername: string;
        payload: string;
    };
}

export async function createConv({
    db,
    uuid1,
    uuid2,
}: CreateConv): Promise<boolean | null> {
    try {
        const query = `SELECT create_conv($1, $2, $3)`;
        const uuid3 = uuid();

        const { rowCount } = await db.query(query, [uuid1, uuid2, uuid3]);
        if (rowCount === 0) return null;
        return true;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteConv({ db, uuid }: Conv): Promise<boolean | null> {
    try {
        const query = `SELECT delete_conv($1)`;

        const { rowCount } = await db.query(query, [uuid]);
        if (rowCount === 0) return null;
        return true;
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

        const { rowCount } = await db.query(query, [
            convUuid,
            authorUuid,
            payload,
            messageUuid,
        ]);
        if (rowCount === 0) return null;
        return true;
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

        const { rowCount } = await db.query(query, [messageUuid, authorUuid]);
        if (rowCount === 0) return null;
        return true;
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
                    ? conv_users.map({
                          uuid: conv_users.slice(1, -1).split(',')[0],
                          username: conv_users.slice(1, -1).split(',')[1],
                      })
                    : null,
            messages:
                conv_messages !== null
                    ? conv_messages.map({
                          uuid: conv_messages.slice(1, -1).split(',')[0],
                          authorUuid: conv_messages.slice(1, -1).split(',')[1],
                          authorUsername: conv_messages
                              .slice(1, -1)
                              .split(',')[2],
                          payload: conv_messages.slice(1, -1).split(',')[3],
                      })
                    : null,
        }));
    } catch (e) {
        console.error(e);
        return null;
    }
}
