import { Express } from 'express';

import authRoutes from './auth/auth';
import profileRoutes from './profile/profile';
import { internalUserToExternalUser } from '../models/user';

export default function routes(server: Express) {
    server.use('/auth', authRoutes());
    server.use('/profile', profileRoutes());

    server.get('/me', async (_, res) => {
        if (res.locals.user === null) {
            res.json(res.locals.user);
            return;
        }
        res.json(internalUserToExternalUser(res.locals.user));
    });
}
