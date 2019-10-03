import * as express from 'express';

import {
    getUserByEmail,
    setPasswordReset,
    resetingPassword,
    internalUserToExternalUser,
} from '../models/user';

const enum SignInStatusCode {
    DONE = 'DONE',
    UNCONFIRM_ACCOUNT = 'UNCONFIRM_ACCOUNT',
    UNKNOWN_EMAIL = 'UNKNOWN_EMAIL',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    LINK_INCORRECT = 'LINK_INCORRECT',
}

export default function setupResetPassword(router: express.Router) {
    // asking: Get email, setup token, send uuid and token by email

    router.post('/reset-password/asking', async (req, res) => {
        try {
            const user = await getUserByEmail({
                db: res.locals.db,
                email: req.body.email,
            });

            if (user === null) {
                res.status(404);
                res.json({ statusCode: SignInStatusCode.UNKNOWN_EMAIL });
                return;
            }
            if (!user.confirmed) {
                res.status(404);
                res.json({ statusCode: SignInStatusCode.UNCONFIRM_ACCOUNT });
                return;
            }

            // write token and uuid
            const result = await setPasswordReset({
                db: res.locals.db,
                id: user.id,
            });
            if (result === null) {
                res.status(404);
                res.json({ statusCode: SignInStatusCode.UNKNOWN_ERROR });
                return;
            }
            // send link
            console.log(`/reset-password/changing/${user.uuid}/${result}`);
            res.status(200);
            res.json({ statusCode: SignInStatusCode.DONE });
            return;
        } catch (e) {
            console.error(e);
        }
    });

    // Get uuid, token, and desiderd password
    // if all good check token and uuid
    router.post('/reset-password/changing/', async (req, res) => {
        try {
            const user = await resetingPassword({
                db: res.locals.db,
                uuid: req.body.uuid,
                token: req.body.token,
                password: req.body.password,
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
