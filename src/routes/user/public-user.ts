import * as express from 'express';
import { Context } from './../../app';

import {
    internalUserToPublicUser,
    userLike,
    userSee,
    userUnLike,
    userBlock,
    userReport,
} from '../../models/public-user';
import { getUserByUuid } from '../../models/user';

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
            });

            if (searchUser === null) {
                res.sendStatus(404);
                return;
            }
            res.json(internalUserToPublicUser(user));
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

    router.post('/see/:uuid', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await userSee({
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
}
