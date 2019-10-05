import { Express } from 'express';

import authRoutes from './auth/auth';
import profileRoutes from './profile/profile';
import {
    ExternalUser,
    InternalUser,
    internalUserToExternalUser,
    getUserByUuid,
} from '../models/user';

export default function routes(server: Express) {
    server.use('/auth', authRoutes());
    server.use('/profile', profileRoutes());

    server.get('/me', async (_, res) => {
        const user: InternalUser | null = await getUserByUuid({
            db: res.locals.db,
            uuid: res.locals.user,
        });
        if (user === null) {
            res.json(user);
            return;
        }
        res.json(internalUserToExternalUser(user));
    });
}
