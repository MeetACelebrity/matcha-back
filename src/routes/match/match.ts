import * as express from 'express';
import { Context } from './../../app';

import { proposals } from '../../models/match';

export default function profileRoutes(): express.Router {
    const router = express.Router();

    const enum MatchStatusCoode {
        DONE = 'DONE',
        ERROR = 'ERROR',
        INCOMPLETE_PROFILE = 'INCOMPLETE_PROFILE',
    }

    router.get('/proposals/:limit/:offset', async (req, res) => {
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
                limit: Number(req.params.limit),
                offset: Number(req.params.offset),
                orderBy: req.body.orderBy,
                order: req.body.order,
            });
            if (result === null) {
                res.status(400);
                res.json({ statusCode: MatchStatusCoode.ERROR });
                return;
            }
            res.json({ result });
        } catch (e) {
            console.error(e);
        }
    });
    return router;
}
