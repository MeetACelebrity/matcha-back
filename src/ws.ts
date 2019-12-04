import { server, request, IMessage, connection, IStringified } from 'websocket';
import { Server } from 'http';

export interface OnMessageCallbackArgs {
    body: any;
    request: request;
    connection: connection;
}

export interface OnCloseCallbackArgs {
    statusCode: number;
    description: string;
    request: request;
    connection: connection;
}

interface OpenConnexion {
    connection: connection;
    createdAt: Date;
}

type OnMessageCallback = (args: OnMessageCallbackArgs) => Promise<void> | void;
type OnCloseCallback = (args: OnCloseCallbackArgs) => Promise<void> | void;

export class WS extends server {
    private static ALLOWED_ORIGINS = ['http://localhost:3000'];
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

                        await onMessage({
                            body,
                            request,
                            connection,
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

    broadcastToUsers(uuids: string[], data: Buffer | IStringified) {
        for (const uuid of uuids) {
            const connections = this.activeConnections.get(uuid);
            if (connections === undefined) continue;

            for (const { connection } of connections) {
                connection.send(data, err => err && console.error(err));
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

    broadcastToRoomExclusively(
        roomId: string,
        data: Buffer | IStringified,
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

    broadcastToRoom(roomId: string, data: Buffer | IStringified) {
        return this.broadcastToRoomExclusively(roomId, data);
    }
}
