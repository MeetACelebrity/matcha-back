import * as express from 'express';
import heml from 'heml';

import { FRONT_ENDPOINT } from '../../constants';
import {
    getUserByEmail,
    setPasswordReset,
    resetingPassword,
    internalUserToExternalUser,
    getUserByUuid,
} from '../../models/user';
import { Context } from '../../app';

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
            const { db, email, templates }: Context = res.locals;
            const userEmail = req.body.email;

            const user = await getUserByEmail({
                db,
                email: userEmail,
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
                db,
                id: user.id,
            });
            if (result === null) {
                res.status(404);
                res.json({ statusCode: ResetPasswordStatusCode.UNKNOWN_ERROR });
                return;
            }

            const template = templates.get('PasswordReset');
            if (template === undefined) {
                throw new Error('the template function is undefined');
            }

            const link = `${FRONT_ENDPOINT}/reset-password/password/${user.uuid}/${result}`;

            const { html } = await heml(
                template({
                    reset_password_link: link,
                })
            );

            console.log('generated html =', html);

            await email.sendMail({
                html,
                subject: 'Meet a Celebrity - Password Reset',
                text: link,
                to: userEmail,
            });

            res.status(200);
            res.json({ statusCode: ResetPasswordStatusCode.DONE });
            return;
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
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

            const userToSend = await getUserByUuid({
                db: res.locals.db,
                uuid: user.uuid,
            });

            res.json({
                statusCode: ResetPasswordStatusCode.DONE,
                user:
                    userToSend === null
                        ? null
                        : internalUserToExternalUser(userToSend),
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });
}
