import * as express from 'express';

import { FRONT_ENDPOINT } from '../../constants';
import {
    getUserByEmail,
    setPasswordReset,
    resetingPassword,
    internalUserToExternalUser,
} from '../../models/user';

const enum ResetPasswordStatusCode {
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
                res.json({ statusCode: ResetPasswordStatusCode.UNKNOWN_EMAIL });
                return;
            }
            if (!user.confirmed) {
                res.status(404);
                res.json({
                    statusCode: ResetPasswordStatusCode.UNCONFIRM_ACCOUNT,
                });
                return;
            }

            // write token and uuid
            const result = await setPasswordReset({
                db: res.locals.db,
                id: user.id,
            });
            if (result === null) {
                res.status(404);
                res.json({ statusCode: ResetPasswordStatusCode.UNKNOWN_ERROR });
                return;
            }
            // send link
            console.log(
                `${FRONT_ENDPOINT}/reset-password/password/${user.uuid}/${result}`
            );
            res.status(200);
            res.json({ statusCode: ResetPasswordStatusCode.DONE });
            return;
        } catch (e) {
            console.error(e);
        }
    });

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
                res.json({
                    statusCode: ResetPasswordStatusCode.LINK_INCORRECT,
                });
                return;
            }

            console.log('we will set the session to', user);
            req.session!.user = user.uuid;
            res.redirect(`${FRONT_ENDPOINT}/sign-up`);
        } catch (e) {
            console.error(e);
        }
    });
}
