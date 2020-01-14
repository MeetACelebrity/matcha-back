import * as express from 'express';
import heml from 'heml';

import { Validator, ValidatorObject } from '../../utils/validator';
import { createUser } from '../../models/user';
import { API_ENDPOINT } from '../../constants';
import { Context } from '../../app';

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
    password: Validator.string().password(),
    acceptGeolocation: Validator.boolean(),
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
            const { db, email, templates }: Context = res.locals;

            const statusCode = signUpRouteValidation(req);

            if (statusCode !== SignUpStatusCode.DONE) {
                res.status(400);
                res.json({
                    statusCode,
                });
                return;
            }

            const result = await createUser({ db, ...req.body });

            if (result === null) {
                res.status(400);
                res.json({
                    statusCode: SignUpStatusCode.FORBIDDEN_INFORMATION,
                });
                return;
            }

            const template = templates.get('Welcome');
            if (template === undefined) {
                throw new Error('the template function is undefined');
            }

            const validationUrl = `${API_ENDPOINT}/auth/confirmation/${result.uuid}/${result.token}`;

            Promise.resolve()
                .then(async () => {
                    const { html } = await heml(
                        template({
                            username: req.body.username,
                            signup_url: validationUrl,
                        })
                    );

                    await email.sendMail({
                        html,
                        subject: 'Welcome to Meet a Celebrity',
                        text: validationUrl,
                        to: req.body.email,
                    });
                })
                .catch(() => {});

            res.json({
                statusCode: SignUpStatusCode.DONE,
                userUuid: result.uuid,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });
}
