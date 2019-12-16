import * as express from 'express';
import { Context } from './../../app';

import {
    internalUserToPublicUser,
    getVisitorsByUuid,
    getLikerByUuid,
    userLike,
    userSee,
    userUnLike,
    userBlock,
    userReport,
    userNotInterested,
} from '../../models/public-user';
import { getUserByUuid } from '../../models/user';
import { getNotifs } from '../../models/chat';

const enum PublicUserStatusCode {
    DONE = 'DONE',
}

export default function publicUser(router: express.Router) {
    router.get('/:uuid', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const searchUser = await getUserByUuid({
                db: res.locals.db,
                uuid: req.params.uuid,
                meUuid: user.uuid,
            });

            const seeUser = await userSee({
                db: res.locals.db,
                ws: res.locals.ws,
                uuidIn: user.uuid,
                uuidOut: req.params.uuid,
            });

            console.log('see user', seeUser);
            if (searchUser === null || seeUser === null) {
                res.sendStatus(404);
                return;
            }
            res.json({
                ...internalUserToPublicUser(searchUser),
                isLiker: seeUser.liker ? true : false,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.get('/notif/:seen', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const result = await getNotifs({
                db: res.locals.db,
                uuid: user.uuid,
                seen: Number(req.params.seen) === 1 ? true : false,
            });
            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json(result);
        } catch (e) {
            console.error(e);
            return null;
        }
    });

    router.get('/visits/history/:limit/:offset', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const visitors = await getVisitorsByUuid({
                db: res.locals.db,
                uuid: user.uuid,
                limit: Number(req.params.limit),
                offset: Number(req.params.offset),
            });

            if (visitors === null) {
                res.sendStatus(404);
                return;
            }
            console.log(visitors);
            res.json({ visitors });
        } catch (e) {
            console.error(e);
        }
    });

    router.get('/likes/history/:limit/:offset', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const liker = await getLikerByUuid({
                db: res.locals.db,
                uuid: user.uuid,
                limit: Number(req.params.limit),
                offset: Number(req.params.offset),
            });

            if (liker === null) {
                res.sendStatus(404);
                return;
            }
            res.json({ liker });
        } catch (e) {
            console.error(e);
        }
    });

    router.post('/like/:uuid', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userLike({
                db: res.locals.db,
                ws: res.locals.ws,
                uuidIn: user.uuid,
                uuidOut: req.params.uuid,
            });
            if (result === null) {
                res.sendStatus(404);
                return;
            }
            console.log(result);
            res.json({
                statusCode: PublicUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.post('/unlike/:uuid', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userUnLike({
                db: res.locals.db,
                ws: res.locals.ws,
                uuidIn: user.uuid,
                uuidOut: req.params.uuid,
            });
            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json({
                statusCode: PublicUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.post('/block/:uuid', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userBlock({
                db: res.locals.db,
                uuidIn: user.uuid,
                uuidOut: req.params.uuid,
            });
            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json({
                statusCode: PublicUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.post('/report/:uuid', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userReport({
                db: res.locals.db,
                uuidIn: user.uuid,
                uuidOut: req.params.uuid,
            });
            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json({
                statusCode: PublicUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.post('/not-interested/:uuid', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userNotInterested({
                db: res.locals.db,
                uuidIn: user.uuid,
                uuidOut: req.params.uuid,
            });
            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json({
                statusCode: PublicUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });
}
