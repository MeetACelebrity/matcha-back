import * as express from 'express';
import { Context } from './../../app';

import { proposals, OrderBy } from '../../models/match';

export interface Filter {
    min: Number;
    max: Number;
}

export default function profileRoutes(): express.Router {
    const router = express.Router();

    const enum MatchStatusCoode {
        DONE = 'DONE',
        ERROR = 'ERROR',
        INCOMPLETE_PROFILE = 'INCOMPLETE_PROFILE',
        SORT_INPUT_ERROR = 'SORT_INPUT_ERROR',
        FILTER_INPUT_ERROR = 'FILTER_INPUT_ERROR',
    }

    router.get(
        '/proposals/:limit/:offset',
        async (
            {
                body: { orderBy, order },
                params: {
                    limit,
                    offset,
                    minAge,
                    maxAge,
                    minDistance,
                    maxDistance,
                    minScore,
                    maxScore,
                    minCommonTags,
                    maxCommonTags,
                },
            },
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

                // checking sort data
                if (
                    (orderBy !== 'age' &&
                        orderBy !== 'distance' &&
                        orderBy !== 'commonTags' &&
                        orderBy !== 'score' &&
                        orderBy !== undefined) ||
                    (order !== 'ASC' && order !== 'DESC' && order !== undefined)
                ) {
                    res.status(400);
                    res.json({ statusCode: MatchStatusCoode.SORT_INPUT_ERROR });
                    return;
                }

                // checking filter data
                if (minAge !== undefined && typeof minAge !== 'number') {
                    res.status(400);
                    res.json({
                        statusCode: MatchStatusCoode.FILTER_INPUT_ERROR,
                    });
                    return;
                }
                const result = await proposals({
                    db: res.locals.db,
                    uuid: user.uuid,
                    limit: Number(limit),
                    offset: Number(offset),
                    orderBy: orderBy === undefined ? null : orderBy,
                    order: order === undefined ? 'ASC' : order,
                    minAge: minAge === undefined ? 0 : Number(minAge),
                    maxAge: maxAge === undefined ? null : Number(maxAge),
                    minDistance:
                        minDistance === undefined ? 0 : Number(minDistance),
                    maxDistance:
                        maxDistance === undefined ? null : Number(maxDistance),
                    minScore: minScore === undefined ? 0 : Number(minScore),
                    maxScore: maxScore === undefined ? null : Number(maxScore),
                    minCommonTags:
                        minCommonTags === undefined ? 0 : Number(minCommonTags),
                    maxCommonTags:
                        maxCommonTags === undefined
                            ? null
                            : Number(maxCommonTags),
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
