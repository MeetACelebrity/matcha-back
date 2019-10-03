import * as express from 'express';

import { getUserByEmail, setPasswordReset } from '../models/user';

const enum SignInStatusCode {
    DONE = 'DONE',
    UNCONFIRM_ACCOUNT = 'UNCONFIRM_ACCOUNT',
    UNKNOWN_EMAIL = 'UNKNOWN_EMAIL',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export default function setupResetPassword(router: express.Router) {
    //asking: Get email, setup token, send uuid and token by email

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
            } else if (user.confirmed === false) {
                res.status(404);
                res.json({ statusCode: SignInStatusCode.UNCONFIRM_ACCOUNT });
                return;
            }

            //write token and uuid
            const result = await setPasswordReset({
                db: res.locals.db,
                id: user.id,
            });
            if (result === null) {
                res.status(404);
                res.json({ statusCode: SignInStatusCode.UNKNOWN_ERROR });
                return;
            }
            //send link
            console.log(`/reset-password/changing/${uuid}/${result}`);
            res.status(200);
            res.json({ statusCode: SignInStatusCode.DONE });
            return;
        } catch (e) {
            console.error(e);
        }
    });

    //Get uuid, token, and desiderd password
    //if all good check token and uuid
    router.post('/reset-password/changing', async (req, res) => {
        try {
        } catch (e) {
            console.error(e);
        }
    });
}
