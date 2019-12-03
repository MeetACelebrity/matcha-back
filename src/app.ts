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
        args => {
            console.log(args);
        },
        args => {
            console.log(args);
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
