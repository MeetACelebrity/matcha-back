import * as express from 'express';
import { Context } from './../../app';

import { internalUserToPublicUser } from '../../models/public-user';
import { getUserByUuid } from '../../models/user';

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
}
