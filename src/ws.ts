import { server, request, IMessage, connection } from 'websocket';
import { Server } from 'http';

import { Validator } from './utils/validator';
import { ConvsFormat, NotificationType } from './models/chat';
import { FRONT_ENDPOINT } from './constants';

interface OpenConnexion {
    connection: connection;
    createdAt: Date;
}

export enum InMessageType {
    INIT = 'INIT',
    NEW_MESSAGE = 'NEW_MESSAGE',
}

export enum OutMessageType {
    CONVERSATIONS = 'CONVERSATIONS',
    NEW_MESSAGE = 'NEW_MESSAGE',
    NEW_NOTIFICATION = 'NEW_NOTIFICATION',
    NEW_CONVERSATION = 'NEW_CONVERSATION',
    DELETE_CONVERSATION = 'DELETE_CONVERSATION',
}

export interface InMessageInit {
    type: InMessageType.INIT;
}

export interface InMessageNewMessage {
    type: InMessageType.NEW_MESSAGE;
    payload: {
        conversationId: string;
        message: string;
    };
}

export type InMessage = InMessageInit | InMessageNewMessage;

export interface OutMessageNewMessage {
    type: OutMessageType.NEW_MESSAGE;
    payload: {
        conversationId: string;
        uuid: string;
        authorUuid: string;
        authorUsername: string;
        payload: string;
    };
}

export interface OutMessageNewNotification {
    type: OutMessageType.NEW_NOTIFICATION;
    payload: {
        uuid: string;
        type: NotificationType;
        message: string;
        seen: boolean;
        createdAt: number;
    };
}

export interface OutMessageDeleteNotification {
    type: OutMessageType.DELETE_CONVERSATION;
    payload: {
        uuid: string;
    };
}

export interface OutMessageNewConversation {
    type: OutMessageType.NEW_CONVERSATION;
    payload: ConvsFormat;
}

export type OutMessage =
    | OutMessageNewMessage
    | OutMessageNewNotification
    | OutMessageNewConversation
    | OutMessageDeleteNotification;

export interface OnMessageCallbackArgs {
    userUuid: string;
    body: InMessage;
    request: request;
    connection: connection;
}

export interface OnCloseCallbackArgs {
    userUuid: string;
    statusCode: number;
    description: string;
    request: request;
    connection: connection;
}

type OnMessageCallback = (args: OnMessageCallbackArgs) => Promise<void> | void;
type OnCloseCallback = (args: OnCloseCallbackArgs) => Promise<void> | void;

const basicInMessageSchema = Validator.object().keys({
    type: Validator.string().whitelist(Object.values(InMessageType)),
});

const schema = Validator.alternatives([
    basicInMessageSchema,
    basicInMessageSchema.copy().keys({
        payload: Validator.object().keys({
            conversationId: Validator.string(),
            message: Validator.string(),
        }),
    }),
]);

export class WS extends server {
    private static ALLOWED_ORIGINS = [FRONT_ENDPOINT];
    private sessionsStore: any;
    private activeConnections: Map<string, OpenConnexion[]> = new Map();
    private rooms: Map<string, string[]> = new Map();

    constructor(server: Server, sessionsStore: any) {
        super({
            httpServer: server,
            autoAcceptConnections: false,
        });

        this.sessionsStore = sessionsStore;
    }

    private static isOriginAllowed(origin: string) {
        return WS.ALLOWED_ORIGINS.includes(origin);
    }

    setup(onMessage: OnMessageCallback, onClose: OnCloseCallback) {
        this.on('request', async request => {
            try {
                if (!WS.isOriginAllowed(request.origin)) {
                    request.reject(403);
                    console.error('This origin is not allowed', request.origin);
                    return;
                }

                const sid = request.cookies.find(
                    ({ name }) => name === 'connect.sid'
                );
                if (sid === undefined) {
                    console.error('Did not find a correct SID, exit WS');
                    return;
                }

                const token = /:(.*)\./.exec(sid.value);
                if (token === null) {
                    console.error('incorrect token');
                    return;
                }

                const uuid: string = await new Promise((resolve, reject) => {
                    this.sessionsStore.get(
                        token[1],
                        (err: Error, result: any) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            resolve(result && result.user);
                        }
                    );
                });

                const connection = request.accept(
                    'echo-protocol',
                    request.origin
                );

                const activeConnections =
                    this.activeConnections.get(uuid) || [];
                this.activeConnections.set(uuid, [
                    ...activeConnections,
                    {
                        connection,
                        createdAt: new Date(),
                    },
                ]);

                connection.on('message', async (message: IMessage) => {
                    try {
                        if (
                            message.type !== 'utf8' ||
                            message.utf8Data === undefined
                        ) {
                            console.error('incorrect data');
                            return;
                        }

                        const body = JSON.parse(message.utf8Data);

                        const validationResult = schema.one(body);
                        if (!validationResult) {
                            console.error(
                                'Invalid message',
                                validationResult,
                                body
                            );
                            return;
                        }

                        await onMessage({
                            body,
                            request,
                            connection,
                            userUuid: uuid,
                        });
                    } catch (e) {
                        console.error('Error on message handler', e);
                    }
                });

                connection.on('close', async (statusCode, description) => {
                    try {
                        const userConnections =
                            this.activeConnections.get(uuid) || [];

                        this.activeConnections.set(
                            uuid,
                            userConnections.filter(
                                ({ connection: userConnection }) =>
                                    userConnection !== connection
                            )
                        );

                        await onClose({
                            request,
                            connection,
                            statusCode,
                            description,
                            userUuid: uuid,
                        });
                    } catch (e) {
                        console.error('Error on close handler', e);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        });
    }

    broadcastToUsers(uuids: string[], data: OutMessage) {
        for (const uuid of uuids) {
            const connections = this.activeConnections.get(uuid);
            if (connections === undefined) continue;

            for (const { connection } of connections) {
                connection.send(
                    JSON.stringify(data),
                    err => err && console.error(err)
                );
            }
        }
    }

    subscribeToRoom(roomId: string, userId: string) {
        const members = this.rooms.get(roomId) || [];

        this.rooms.set(roomId, [...new Set([...members, userId])]);
    }

    unsubscribeFromRoom(roomId: string, userId: string) {
        const members = this.rooms.get(roomId);
        if (members === undefined) return;

        this.rooms.set(
            roomId,
            members.filter(uuid => uuid !== userId)
        );
    }

    unsubscribeFromCommonRooms(userA: string, userB: string) {
        const users = [userA, userB];

        this.rooms.forEach((roomUsers, roomId) => {
            if (roomUsers.includes(userA) && roomUsers.includes(userB)) {
                this.broadcastToUsers(users, {
                    type: OutMessageType.DELETE_CONVERSATION,
                    payload: {
                        uuid: roomId,
                    },
                });

                users.forEach(user => this.unsubscribeFromRoom(roomId, user));
            }
        });
    }

    subscribeUsersToRoom(roomId: string, usersId: string[]) {
        for (const userId of usersId) {
            this.subscribeToRoom(roomId, userId);
        }
    }

    broadcastToRoomExclusively(
        roomId: string,
        data: OutMessage,
        blackList?: string[]
    ) {
        const members = this.rooms.get(roomId);
        if (members === undefined) return;

        let usersToNotify = members;
        if (blackList !== undefined) {
            usersToNotify = members.filter(uuid => !blackList.includes(uuid));
        }

        return this.broadcastToUsers(usersToNotify, data);
    }

    broadcastToRoom(roomId: string, data: OutMessage) {
        return this.broadcastToRoomExclusively(roomId, data);
    }

    getMembersOfRoom(roomId: string) {
        return this.rooms.get(roomId);
    }

    getUserConnections(userId: string): OpenConnexion[] | undefined {
        return this.activeConnections.get(userId);
    }

    broadcastToUserExceptConnection(
        userId: string,
        roomId: string,
        connection: connection,
        data: OutMessage
    ) {
        const members = this.rooms.get(roomId);
        if (members === undefined || !members.includes(userId)) return;

        const connections = this.activeConnections.get(userId);
        if (connections === undefined) return;

        for (const { connection: conn } of connections) {
            if (conn === connection) continue;

            conn.send(JSON.stringify(data), err => err && console.error(err));
        }
    }
}
