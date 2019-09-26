import express from 'express';
import bodyParser from 'body-parser';

import Routes from './routes';

async function app() {
    const server = express();

    server
        .use(bodyParser.urlencoded({ extended: false }))
        .use(bodyParser.json());

    Routes(server);

    server.listen(3000, '0.0.0.0', () => {
        console.log('Example app listening on port 3000!');
    });
}

app().catch(console.error);
