import * as express from 'express';
import { FRONT_ENDPOINT } from '../../constants';

import { internalUserToExternalUser, userVerify } from '../../models/user';

const enum ConfirmationStatusCode {
    DONE = 'DONE',
    LINK_INCORRECT = 'LINK_INCORRECT',
}

export default function setupConfirmation(router: express.Router) {
    router.get('/confirmation/:uuid/:token', async (req, res) => {
        try {
            const user = await userVerify({
                db: res.locals.db,
                uuid: req.params.uuid,
                token: req.params.token,
            });

            if (user === null) {
                res.status(404);
                res.json({ statusCode: ConfirmationStatusCode.LINK_INCORRECT });
                return;
            }

            console.log('we will set the session to', user);
            req.session!.user = user.uuid;
            res.redirect(FRONT_ENDPOINT);
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });
}
