import * as express from 'express';

import { internalUserToExternalUser, userVerify } from '../models/user';

const enum SignInStatusCode {
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
                res.json({ statusCode: SignInStatusCode.LINK_INCORRECT });
                return;
            }

            const newUser = internalUserToExternalUser(user);
            console.log('we will set the session to', newUser);
            req.session!.user = newUser;
            res.json({ statusCode: SignInStatusCode.DONE });
        } catch (e) {
            console.error(e);
        }
    });
}
