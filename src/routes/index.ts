import { Express } from 'express';

import authRoutes from './auth/auth';
import profileRoutes from './profile/profile';
import publicUserRoutes from './user/user';
import { internalUserToExternalUser } from '../models/user';

export default function routes(server: Express) {
    server.use('/auth', authRoutes());
    server.use('/profile', profileRoutes());
    server.use('/user', publicUserRoutes());

    server.get('/me', async (_, res) => {
        console.log('context =', res.locals.user);

        if (res.locals.user === null) {
            res.json(res.locals.user);
            return;
        }
        res.json(internalUserToExternalUser(res.locals.user));
    });
}
