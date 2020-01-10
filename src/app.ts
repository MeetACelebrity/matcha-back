import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { createServer } from 'http';
import createMemoryStore from 'memorystore';
import { compile, TemplatesMap } from '@artisans-fiables/template-compiler';
import { join } from 'path';

import { FRONT_ENDPOINT } from './constants';
import routes from './routes';
import { Database } from './database';
import { Cloud } from './cloud';
import {
    InternalUser,
    getUserByUuid,
    getUsernameByUserUuid,
} from './models/user';
import { WS, InMessageType, OutMessageType, OutMessageNewMessage } from './ws';
import {
    getConvs,
    createMessage,
    setNotif,
    NotificationType,
} from './models/chat';
import { onlineUser } from './models/public-user';
import Email from './email';

export interface Context {
    db: Database;
    cloud: Cloud;
    ws: WS;
    user: InternalUser | null;
    isAuthenticated: boolean;
    templates: TemplatesMap;
    email: Email;
}

interface User {
    uuid: string;
}

async function app() {
    const server = express();
    const httpServer = createServer(server);

    const db = new Database();
    const cloud = new Cloud();

    const email = new Email();
    const templates = await compile(join(__dirname, '../templates'));

    const store = new (createMemoryStore(session))({
        checkPeriod: 86400000, // prune expired entries every 24h
    });

    const ws = new WS(httpServer, store);

    ws.setup(
        async ({ connection, body, userUuid }) => {
            switch (body.type) {
                case InMessageType.INIT: {
                    const [conversations] = await Promise.all([
                        getConvs({
                            db,
                            uuid: userUuid,
                        }),
                        onlineUser({
                            db,
                            uuid: userUuid,
                            value: true,
                        }),
                    ]);
                    if (conversations === null) {
                        // Send error to client
                        return;
                    }

                    conversations.forEach(({ uuid: roomUuid }) => {
                        ws.subscribeToRoom(roomUuid, userUuid);
                    });

                    connection.send(
                        JSON.stringify({
                            type: OutMessageType.CONVERSATIONS,
                            payload: {
                                conversations,
                            },
                        })
                    );
                    break;
                }
                case InMessageType.NEW_MESSAGE: {
                    const message = await createMessage({
                        db,
                        authorUuid: userUuid,
                        convUuid: body.payload.conversationId,
                        payload: body.payload.message,
                    });

                    if (message === null) break;

                    const data: OutMessageNewMessage = {
                        type: OutMessageType.NEW_MESSAGE,
                        payload: {
                            conversationId: body.payload.conversationId,
                            ...message,
                        },
                    };

                    // Send the message to all users who have subscribed to this room
                    ws.broadcastToRoomExclusively(
                        body.payload.conversationId,
                        data,
                        [userUuid]
                    );
                    ws.broadcastToUserExceptConnection(
                        userUuid,
                        body.payload.conversationId,
                        connection,
                        data
                    );

                    const authorUsername = await getUsernameByUserUuid({
                        db,
                        uuid: userUuid,
                    });

                    const convMembers = (
                        ws.getMembersOfRoom(body.payload.conversationId) || []
                    ).filter(memberId => memberId !== userUuid);

                    await Promise.all(
                        convMembers.map(destUuid =>
                            setNotif({
                                db,
                                ws,
                                destUuid,
                                sendUuid: userUuid,
                                senderUsername: authorUsername || 'username',
                                type: NotificationType.GOT_MESSAGE,
                            })
                        )
                    );
                    break;
                }
                default:
                    return;
            }
        },
        async ({ userUuid, connection }) => {
            const userConnections = ws.getUserConnections(userUuid);
            // If the user is connected with another connection, don't log it as disconnected
            if (
                userConnections === undefined ||
                userConnections.some(
                    ({ connection: conn }) => conn !== connection
                )
            ) {
                return;
            }

            await onlineUser({
                db,
                uuid: userUuid,
                value: false,
            });
        }
    );

    server
        .use(
            cors({
                origin: ['http://localhost:3000', FRONT_ENDPOINT],
                credentials: true,
            })
        )
        .use(bodyParser.urlencoded({ extended: false }))
        .use(bodyParser.json())
        .use(
            session({
                store,
                secret: 'test',
                resave: false,
                cookie: {
                    maxAge: 1e7,
                    httpOnly: true,
                    signed: true,
                },
                saveUninitialized: true,
            })
        )
        .use(fileUpload())
        .use(async (req, res, next) => {
            // get all user data
            const user = await getUserByUuid({ db, uuid: req.session!.user });

            console.log('gotten user =', user);

            const context: Context = {
                templates,
                db,
                cloud,
                ws,
                user,
                email,
                isAuthenticated: req.session!.user !== null,
            };

            res.locals = context;

            next();
        });

    routes(server);

    httpServer.listen(8080, '0.0.0.0', () => {
        console.log('Example app listening on port 8080!');
    });
}

app().catch(console.error);

process.on('unhandledRejection', () => {});
