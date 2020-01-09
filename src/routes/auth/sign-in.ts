import * as express from 'express';
import { verify } from 'argon2';

import { Validator, ValidatorObject } from '../../utils/validator';
import {
    internalUserToExternalUser,
    getUserByUuid,
    getUserByUsername,
} from '../../models/user';

const enum SignInStatusCode {
    DONE = 'DONE',

    USERNAME_INCORRECT = 'USERNAME_INCORRECT',
    PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
    INVALID_ACCOUNT = 'INVALID_ACCOUNT',

    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

const signInSchema: ValidatorObject = Validator.object().keys({
    username: Validator.string()
        .min(3)
        .max(20),
    password: Validator.string().password(),
});

function signUpRouteValidation(req: express.Request): SignInStatusCode {
    const validationResult = Validator.validate(signInSchema, req.body);

    if (typeof validationResult !== 'boolean') {
        const {
            error: { concernedKey },
        } = validationResult;

        switch (concernedKey) {
            case 'username':
                return SignInStatusCode.USERNAME_INCORRECT;
            case 'password':
                return SignInStatusCode.PASSWORD_INCORRECT;
            default:
                return SignInStatusCode.UNKNOWN_ERROR;
        }
    }

    return SignInStatusCode.DONE;
}

export default function signInMiddleware(router: express.Router) {
    router.post('/sign-in', async (req, res) => {
        try {
            const statusCode = signUpRouteValidation(req);

            if (statusCode !== SignInStatusCode.DONE) {
                res.status(400);
                res.json({ statusCode });
                return;
            }

            const user = await getUserByUsername({
                db: res.locals.db,
                ...req.body,
            });

            if (user === null) {
                res.status(404);
                res.json({ statusCode: SignInStatusCode.USERNAME_INCORRECT });
                return;
            }

            if (!user.confirmed) {
                res.status(404);
                res.json({ statusCode: SignInStatusCode.INVALID_ACCOUNT });
                return;
            }

            if (await verify(user.password, req.body.password)) {
                console.log('we will set the session to', user);
                req.session!.user = user.uuid;

                const result = await getUserByUuid({
                    db: res.locals.db,
                    uuid: user.uuid,
                });
                if (result === null) {
                    res.json({ statusCode: SignInStatusCode.UNKNOWN_ERROR });
                    return;
                }
                res.json({
                    statusCode: SignInStatusCode.DONE,
                    user: internalUserToExternalUser(result),
                });

                return;
            }
            res.status(401);
            res.json({ statusCode: SignInStatusCode.PASSWORD_INCORRECT });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });
}
