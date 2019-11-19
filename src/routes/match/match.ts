import * as express from 'express';
import { Context } from './../../app';

import { proposals } from '../../models/match';

export default function profileRoutes(): express.Router {
    const router = express.Router();

    const enum MatchStatusCoode {
        DONE = 'DONE',
        INCOMPLETE_PROFILE = 'INCOMPLETE_PROFILE',
    }

    router.get('/proposals', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            // checking user data:

            if (
                user.score === null ||
                user.gender === null ||
                user.tags === null ||
                user.addresses === null
            ) {
                res.status(400);
                res.json({ statusCode: MatchStatusCoode.INCOMPLETE_PROFILE });
                return;
            }

            const result = await proposals({
                db: res.locals.db,
                uuid: user.uuid,
            });
            res.json({ ok: 'ok' });
        } catch (e) {
            console.error(e);
        }
    });
    return router;
}
