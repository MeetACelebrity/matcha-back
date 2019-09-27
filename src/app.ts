import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';

import Routes from './routes';
import { Database } from './database';

interface Context {
    db: Database;
    user: User;
    isAuthenticated: boolean;
}

interface User {
    uuid: string;
}

async function app() {
    const server = express();

    const db = new Database();

    server
        .use(bodyParser.urlencoded({ extended: false }))
        .use(bodyParser.json())
        .use(
            session({
                secret: '6a341ad2-8dfb-4ac5-9d75-aac72417af46',
                cookie: {
                    httpOnly: true,
                    signed: true,
                },
                resave: false,
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

    Routes(server);

    server.listen(3000, '0.0.0.0', () => {
        console.log('Example app listening on port 3000!');
    });
}

app().catch(console.error);
