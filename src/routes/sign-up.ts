import * as express from 'express';
import { Validator, ValidatorObject } from '../utils/validator';
import { createUser, getUserByUsername } from '../models/user';

const enum SignUpStatusCode {
    DONE = 'DONE',

    EMAIL_INCORRECT = 'EMAIL_INCORRECT',
    USERNAME_INCORRECT = 'USERNAME_INCORRECT',
    GIVEN_NAME_INCORRECT = 'GIVEN_NAME_INCORRECT',
    FAMILY_NAME_INCORRECT = 'FAMILY_NAME_INCORRECT',
    PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',

    FORBIDDEN_INFORMATION = 'FORBIDDEN_INFORMATION',

    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

const stringSchema = Validator.string()
    .min(3)
    .max(20);

const signUpSchema: ValidatorObject = Validator.object().keys({
    email: Validator.string().email(),
    username: stringSchema,
    givenName: stringSchema,
    familyName: stringSchema,
    password: Validator.string().min(6),
});

function signUpRouteValidation(req: express.Request): SignUpStatusCode {
    const validationResult = Validator.validate(signUpSchema, req.body);

    if (typeof validationResult !== 'boolean') {
        const {
            error: { concernedKey },
        } = validationResult;

        switch (concernedKey) {
            case 'email':
                return SignUpStatusCode.EMAIL_INCORRECT;
            case 'username':
                return SignUpStatusCode.USERNAME_INCORRECT;
            case 'givenName':
                return SignUpStatusCode.GIVEN_NAME_INCORRECT;
            case 'familyName':
                return SignUpStatusCode.FAMILY_NAME_INCORRECT;
            case 'password':
                return SignUpStatusCode.PASSWORD_INCORRECT;
            default:
                return SignUpStatusCode.UNKNOWN_ERROR;
        }
    }

    return SignUpStatusCode.DONE;
}

export default function signUpMiddleware(router: express.Router) {
    router.post('/sign-up', async (req, res) => {
        try {
            const statusCode = signUpRouteValidation(req);

            if (statusCode !== SignUpStatusCode.DONE) {
                res.status(400);

                res.json({
                    statusCode,
                });

                return;
            }

            console.log('request body', req.body);

            const result = await createUser({ db: res.locals.db, ...req.body });

            console.log('result =', result);

            if (result === null) {
                res.status(500);

                res.json({
                    statusCode: SignUpStatusCode.FORBIDDEN_INFORMATION,
                });

                return;
            }

            res.json({
                statusCode: SignUpStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });
}
