import { ModelArgs } from './index';
import uuid from 'uuid/v4';

export interface CreateConv extends ModelArgs {
    uuid1: string;
    uuid2: string;
}

export interface DeleteConv extends ModelArgs {
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

export async function deleteConv({
    db,
    uuid,
}: DeleteConv): Promise<boolean | null> {
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
