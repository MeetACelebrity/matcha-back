import * as express from 'express';
import { Context } from './../../app';

import { proposals, OrderBy } from '../../models/match';

export default function profileRoutes(): express.Router {
    const router = express.Router();

    const enum MatchStatusCoode {
        DONE = 'DONE',
        ERROR = 'ERROR',
        INCOMPLETE_PROFILE = 'INCOMPLETE_PROFILE',
        INCOMPLETE_INPUT = 'INCOMPLETE_INPUT',
    }

    router.get(
        '/proposals/:limit/:offset',
        async (
            { body: { orderBy, order }, params: { limit, offset } },
            res
        ) => {
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
                    res.json({
                        statusCode: MatchStatusCoode.INCOMPLETE_PROFILE,
                    });
                    return;
                }

                console.log('order values ', typeof orderBy, order);
                if (
                    (orderBy !== 'age' &&
                        orderBy !== 'distance' &&
                        orderBy !== 'commonTags' &&
                        orderBy !== 'score' &&
                        orderBy !== undefined) ||
                    (order !== 'ASC' && order !== 'DESC' && order !== undefined)
                ) {
                    res.status(400);
                    res.json({ statusCode: MatchStatusCoode.INCOMPLETE_INPUT });
                    return;
                }

                const result = await proposals({
                    db: res.locals.db,
                    uuid: user.uuid,
                    limit: Number(limit),
                    offset: Number(offset),
                    orderBy: orderBy === undefined ? null : orderBy,
                    order: order === undefined ? 'ASC' : order,
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
        }
    );
    return router;
}
