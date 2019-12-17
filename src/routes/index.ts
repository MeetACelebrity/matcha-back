import { Express } from 'express';

import authRoutes from './auth/auth';
import profileRoutes from './profile/profile';
import publicUserRoutes from './user/user';
import matchingRoutes from './match/match';
import { internalUserToExternalUser, getUserByEmail } from '../models/user';
import { Context } from '../app';
// import { getNotifs } from '../models/chat';

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

    server.get('/disconnect', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            if (req.session !== undefined) {
                req.session.destroy((err: any) => err);
                res.json({ result: 'DONE' });
                return;
            }
            res.json({ result: 'ERROR' });
        } catch (e) {
            console.error(e);
        }
    });
}
