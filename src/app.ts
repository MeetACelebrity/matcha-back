import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { createServer } from 'http';
import createMemoryStore from 'memorystore';

import { FRONT_ENDPOINT } from './constants';
import routes from './routes';
import { Database } from './database';
import { Cloud } from './cloud';
import { InternalUser, getUserByUuid } from './models/user';
import { WS } from './ws';

export interface Context {
    db: Database;
    cloud: Cloud;
    ws: WS;
    user: InternalUser | null;
    isAuthenticated: boolean;
}

interface User {
    uuid: string;
}

async function app() {
    const server = express();
    const httpServer = createServer(server);

    const db = new Database();
    const cloud = new Cloud();

    const store = new (createMemoryStore(session))({
        checkPeriod: 86400000, // prune expired entries every 24h
    });

    const ws = new WS(httpServer, store);

    ws.setup(
        ({ connection, body }) => {
            console.log(body);

            switch (body.type) {
                case 'INIT':
                    connection.send(
                        JSON.stringify({
                            type: 'CONVERSATIONS',
                            payload: {
                                conversations: [
                                    {
                                        uuid: '123aze',
                                        title: 'Baptiste Devessier',
                                        description: 'Je suis un zboub',
                                        picture:
                                            'https://trello-attachments.s3.amazonaws.com/5dcbd72c39989f2478c2646d/300x166/e7586ac2b0e95ab0dd217ca9895217a4/Capture_d%E2%80%99e%CC%81cran_2019-11-20_a%CC%80_00.30.13.png',
                                        messages: [1, 2, 3, 4, 5, 6],
                                    },
                                    {
                                        uuid: '123azex',
                                        title: 'Antoine Duléry',
                                        description: 'Je suis un petit zboub',
                                        picture:
                                            'https://trello-attachments.s3.amazonaws.com/5dcbd72c39989f2478c2646d/300x166/e7586ac2b0e95ab0dd217ca9895217a4/Capture_d%E2%80%99e%CC%81cran_2019-11-20_a%CC%80_00.30.13.png',
                                        messages: [
                                            1,
                                            2,
                                            4,
                                            5,
                                            6,
                                            1,
                                            3,
                                            5,
                                            6,
                                            7,
                                            6,
                                            3,
                                            5,
                                            3,
                                        ],
                                    },
                                ],
                            },
                        })
                    );

                    setTimeout(() => {
                        connection.send(
                            JSON.stringify({
                                type: 'NEW_MESSAGE',
                                payload: {
                                    conversationId: '123aze',
                                    uuid: 'test_new_message',
                                },
                            })
                        );
                    }, 10000);
                    break;
                default:
                    return;
            }
        },
        () => {
            console.log('bye');
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
                db,
                cloud,
                ws,
                user,
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
