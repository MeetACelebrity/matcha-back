import * as express from 'express';

import { updateGeneralUser } from '../../models/user';
import { Validator, ValidatorObject } from '../../utils/validator';
import { Context } from './../../app';

const enum UpdateUserStatusCode {
    DONE = 'DONE',
    EMAIL_INCORRECT = 'EMAIL_INCORRECT',
    USERNAME_INCORRECT = 'USERNAME_INCORRECT',
    GIVEN_NAME_INCORRECT = 'GIVEN_NAME_INCORRECT',
    FAMILY_NAME_INCORRECT = 'FAMILY_NAME_INCORRECT',

    INCORRECT_FIELD = 'INCORRECT_FIELD',
    PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

const stringSchema = Validator.string()
    .min(3)
    .max(20);

const generalSchema: ValidatorObject = Validator.object().keys({
    email: Validator.string().email(),
    username: stringSchema,
    givenName: stringSchema,
    familyName: stringSchema,
});

function generalRouteValidation(req: express.Request): UpdateUserStatusCode {
    const validationResult = Validator.validate(generalSchema, req.body);

    if (typeof validationResult !== 'boolean') {
        const {
            error: { concernedKey },
        } = validationResult;

        switch (concernedKey) {
            case 'email':
                return UpdateUserStatusCode.EMAIL_INCORRECT;
            case 'username':
                return UpdateUserStatusCode.USERNAME_INCORRECT;
            case 'givenName':
                return UpdateUserStatusCode.GIVEN_NAME_INCORRECT;
            case 'familyName':
                return UpdateUserStatusCode.FAMILY_NAME_INCORRECT;
            default:
                return UpdateUserStatusCode.UNKNOWN_ERROR;
        }
    }

    return UpdateUserStatusCode.DONE;
}

export default function setupTextual(router: express.Router) {
    router.put('/general', async (req, res) => {
        const { user }: Context = res.locals;
        const statusCode = generalRouteValidation(req);

        if (user === undefined) {
            res.sendStatus(404);
            return;
        }
        if (statusCode !== UpdateUserStatusCode.DONE) {
            res.status(400);

            res.json({
                statusCode,
            });

            return;
        }

        const result = await updateGeneralUser({
            uuid: user.uuid,
            db: res.locals.db,
            email: req.body.email,
            givenName: req.body.givenName,
            familyName: req.body.familyName,
        });

        if (result === null) {
            res.status(404);
            res.json({ statusCode: UpdateUserStatusCode.INCORRECT_FIELD });
            return;
        }
        res.json({
            statusCode: UpdateUserStatusCode.DONE,
        });
    });

    router.put('/extended', async (req, res) => {});

    router.put('/biography', async (req, res) => {});

    router.put('/password', async (req, res) => {});
}
