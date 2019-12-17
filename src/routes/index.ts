import { Express } from 'express';

import authRoutes from './auth/auth';
import profileRoutes from './profile/profile';
import publicUserRoutes from './user/user';
import matchingRoutes from './match/match';
import { internalUserToExternalUser, getUserByEmail } from '../models/user';
import { getNotifs } from '../models/chat';

export default function routes(server: Express) {
    server.use('/auth', authRoutes());
    server.use('/profile', profileRoutes());
    server.use('/user', publicUserRoutes());
    server.use('/match', matchingRoutes());
    server.get('/me', async (_, res) => {
        console.log('context =', res.locals.user);

        if (res.locals.user === null) {
            res.json(res.locals.user);
            return;
        }
        res.json(internalUserToExternalUser(res.locals.user));
    });
    server.get('/test', async (req, res) => {
        const result = await getNotifs({
            db: res.locals.db,
            uuid: req.body.uuid,
        });
        res.json({ result });
    });
}
