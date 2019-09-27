import express from 'express';
import bodyParser from 'body-parser';

import Routes from './routes';
import { Database } from './database';

interface Context {
    db: Database;
}

async function app() {
    const server = express();

    const db = new Database();

    server
        .use(bodyParser.urlencoded({ extended: false }))
        .use(bodyParser.json())
        .use((req, res, next) => {
            const context: Context = {
                db,
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
