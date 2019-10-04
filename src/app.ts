import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';

import routes from './routes';
import { Database } from './database';

export interface Context {
    db: Database;
    user?: User;
    isAuthenticated: boolean;
}

interface User {
    uuid: string;
}

async function app() {
    const server = express();

    const db = new Database();

    server
        .use(
            cors({
                origin: ['http://localhost:3000', 'http://e2r3p10.42.fr:3000'],
                credentials: true,
            })
        )
        .use(bodyParser.urlencoded({ extended: false }))
        .use(bodyParser.json())
        .use(
            session({
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
        .use((req, res, next) => {
            const context: Context = {
                db,
                user: req.session!.user,
                isAuthenticated:
                    req.session!.user !== undefined &&
                    req.session!.user!.id !== undefined,
            };

            res.locals = context;

            next();
        });

    routes(server);

    server.listen(8080, '0.0.0.0', () => {
        console.log('Example app listening on port 8080!');
    });
}

app().catch(console.error);
