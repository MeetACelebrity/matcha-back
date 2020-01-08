import * as express from 'express';
import { Context } from './../../app';

import { proposals, search, getIntervals } from '../../models/match';

export default function profileRoutes(): express.Router {
    const router = express.Router();

    const enum MatchStatusCoode {
        DONE = 'DONE',
        ERROR = 'ERROR',
        INCOMPLETE_PROFILE = 'INCOMPLETE_PROFILE',
        SORT_INPUT_ERROR = 'SORT_INPUT_ERROR',
        FILTER_INPUT_ERROR = 'FILTER_INPUT_ERROR',
    }

    router.get('/interval', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const result = await getIntervals({
                db: res.locals.db,
                uuid: user.uuid,
            });
            if (result === null) return null;
            res.json({ ...result });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
            return null;
        }
    });

    router.post(
        '/proposals/:limit/:offset',
        async (
            {
                body: {
                    orderBy,
                    order,
                    minAge,
                    maxAge,
                    minDistance,
                    maxDistance,
                    minScore,
                    maxScore,
                    minCommonTags,
                    maxCommonTags,
                },
                params: { limit, offset },
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

                const result = await proposals({
                    db: res.locals.db,
                    uuid: user.uuid,
                    limit: Number(limit),
                    offset: Number(offset),
                    orderBy: orderBy === undefined ? null : orderBy,
                    order: order === undefined ? 'ASC' : order,
                    minAge:
                        minAge === undefined
                            ? 1
                            : Number(minAge === 0 ? 1 : minAge),
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
                res.sendStatus(400);
            }
        }
    );

    router.post(
        '/search/:data/:limit/:offset',
        async (
            {
                body: {
                    lat,
                    long,
                    tagsArray,
                    orderBy,
                    order,
                    minAge,
                    maxAge,
                    minDistance,
                    maxDistance,
                    minScore,
                    maxScore,
                    minCommonTags,
                    maxCommonTags,
                },
                params: { data, limit, offset },
            },
            res
        ) => {
            try {
                const { user }: Context = res.locals;

                if (user === null) {
                    res.sendStatus(404);
                    return;
                }

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

                const result = await search({
                    data,
                    db: res.locals.db,
                    uuid: user.uuid,
                    limit: Number(limit),
                    offset: Number(offset),
                    lat: lat === undefined ? null : Number(lat),
                    long: long === undefined ? null : Number(long),
                    tagsArray: tagsArray === undefined ? null : tagsArray,
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
                res.sendStatus(400);
            }
        }
    );
    return router;
}
