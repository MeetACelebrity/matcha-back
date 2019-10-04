import { Express } from 'express';

import authRoutes from './auth/auth';
import profileRoutes from './profile/profile';
import { ExternalUser } from '../models/user';

export default function routes(server: Express) {
    server.use('/auth', authRoutes());
    server.use('/profile', profileRoutes());

    server.get('/me', (_, res) => {
        const user: ExternalUser = res.locals.user;

        res.json(user);
    });
}
