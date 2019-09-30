import { Express } from 'express';

import authRoutes from './auth';
import { ExternalUser } from '../models/user';

export default function routes(server: Express) {
    server.use('/auth', authRoutes());

    server.get('/me', (_, res) => {
        const user: ExternalUser = res.locals.user;

        res.json(user);
    });
}
