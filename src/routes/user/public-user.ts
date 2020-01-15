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
import {
    getNotifs,
    setSawMessagesToTrue,
    sawNotifications,
} from '../../models/chat';

const enum PublicUserStatusCode {
    DONE = 'DONE',
}

export default function publicUser(router: express.Router) {
    router.get('/saw-notifications', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await sawNotifications({
                db: res.locals.db,
                userId: user.id,
            });

            if (!result) {
                res.sendStatus(404);
                return;
            }

            res.json({ result: 'DONE' });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

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
            if (searchUser === null) {
                res.sendStatus(404);
                return;
            }

            const seeUser = await userSee({
                db: res.locals.db,
                ws: res.locals.ws,
                uuidIn: user.uuid,
                userInUsername: user.username,
                uuidOut: req.params.uuid,
            });
            if (seeUser === null) {
                res.sendStatus(404);
                return;
            }

            res.json({
                ...internalUserToPublicUser(searchUser),
                isLiker: seeUser.liker ? true : false,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

    router.get('/notif/get', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const result = await getNotifs({
                db: res.locals.db,
                uuid: user.uuid,
            });
            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json(result);
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
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
            res.sendStatus(400);
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
            res.sendStatus(400);
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
                userInUsername: user.username,
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
            res.sendStatus(400);
        }
    });

    router.post('/unlike/:uuid', async (req, res) => {
        try {
            const { user, ws }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userUnLike({
                db: res.locals.db,
                ws: res.locals.ws,
                uuidIn: user.uuid,
                userInUsername: user.username,
                uuidOut: req.params.uuid,
            });

            ws.unsubscribeFromCommonRooms(user.uuid, req.params.uuid);

            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json({
                statusCode: PublicUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

    router.post('/block/:uuid', async (req, res) => {
        try {
            const { user, ws }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userBlock({
                db: res.locals.db,
                uuidIn: user.uuid,
                uuidOut: req.params.uuid,
            });

            ws.unsubscribeFromCommonRooms(user.uuid, req.params.uuid);

            if (result === null) {
                res.sendStatus(404);
                return;
            }
            res.json({
                statusCode: PublicUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
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
            res.sendStatus(400);
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
            res.sendStatus(400);
        }
    });

    router.put('/chat/saw-messages', async (req, res) => {
        try {
            const { user, db }: Context = res.locals;

            if (user === null) {
                res.sendStatus(403);
                return;
            }

            const result = await setSawMessagesToTrue({
                db,
                userUuid: user.uuid,
            });

            switch (result) {
                case true:
                    res.json({ statusCode: 'DONE' });
                    return;
                default:
                    res.sendStatus(404);
                    return;
            }
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });
}
