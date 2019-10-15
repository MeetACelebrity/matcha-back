import * as express from 'express';

import {
    updateGeneralUser,
    updatePasswordUser,
    updateExtendedUser,
    updateBiography,
    updateTags,
    updateAddress,
} from '../../models/user';
import { Validator, ValidatorObject } from '../../utils/validator';
import { Context } from './../../app';
import { verify, hash } from 'argon2';

const enum UpdateUserStatusCode {
    DONE = 'DONE',
    EMAIL_INCORRECT = 'EMAIL_INCORRECT',
    USERNAME_INCORRECT = 'USERNAME_INCORRECT',
    GIVEN_NAME_INCORRECT = 'GIVEN_NAME_INCORRECT',
    FAMILY_NAME_INCORRECT = 'FAMILY_NAME_INCORRECT',
    AGE_INCORRECT = 'AGE_INCORRECT',
    GENDER_INCORRECT = 'GENDER_INCORRECT',
    SEXUAL_ORIENTATION_INCORRECT = 'SEXUAL_ORIENTATION_INCORRECT',
    BIOGRAPHY_INCORRECT = 'BIOGRAPHY_INCORRECT',

    INCORRECT_FIELD = 'INCORRECT_FIELD',
    PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

const stringSchema = Validator.string()
    .min(3)
    .max(20);

// /general
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

// /password
const passwordSchema: ValidatorObject = Validator.object().keys({
    oldPassword: Validator.string().min(6),
    newPassword: Validator.string().min(6),
});
function passwordRouteValidation(req: express.Request): UpdateUserStatusCode {
    const validationResult = Validator.validate(passwordSchema, req.body);
    console.log(validationResult);
    if (typeof validationResult !== 'boolean') {
        const {
            error: { concernedKey },
        } = validationResult;
        if (concernedKey === 'newPassword') {
            return UpdateUserStatusCode.PASSWORD_INCORRECT;
        }
    }
    return UpdateUserStatusCode.DONE;
}

// /extended age, genrem sexualOrientation
const extendedSchema: ValidatorObject = Validator.object().keys({
    age: Validator.number()
        .min(18)
        .max(100),
    gender: Validator.string().whitelist(['MALE', 'FEMALE']),
    sexualOrientation: Validator.string().whitelist([
        'HETEROSEXUAL',
        'HOMOSEXUAL',
        'BISEXUAL',
    ]),
});
function extendedRouteValidation(req: express.Request): UpdateUserStatusCode {
    const validationResult = Validator.validate(extendedSchema, req.body);
    if (typeof validationResult !== 'boolean') {
        const {
            error: { concernedKey },
        } = validationResult;

        switch (concernedKey) {
            case 'age':
                return UpdateUserStatusCode.AGE_INCORRECT;
            case 'gender':
                return UpdateUserStatusCode.GENDER_INCORRECT;
            case 'sexualOrientation':
                return UpdateUserStatusCode.SEXUAL_ORIENTATION_INCORRECT;
        }
    }
    return UpdateUserStatusCode.DONE;
}

// /biography
const biographySchema: ValidatorObject = Validator.object().keys({
    biography: Validator.string()
        .min(1)
        .max(255),
});

function biographyRouteValidation(req: express.Request): UpdateUserStatusCode {
    const validationResult = Validator.validate(biographySchema, req.body);
    if (typeof validationResult !== 'boolean') {
        const {
            error: { concernedKey },
        } = validationResult;
        if (concernedKey === 'biography') {
            return UpdateUserStatusCode.BIOGRAPHY_INCORRECT;
        }
    }
    return UpdateUserStatusCode.DONE;
}

export default function setupTextual(router: express.Router) {
    router.put('/general', async (req, res) => {
        try {
            const { user }: Context = res.locals;
            const statusCode = generalRouteValidation(req);

            if (user === null) {
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
                db: res.locals.db,
                uuid: user.uuid,
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
        } catch (e) {
            console.error(e);
        }
    });

    router.put('/password', async (req, res) => {
        try {
            const { user }: Context = res.locals;
            const statusCode = passwordRouteValidation(req);

            if (user === null) {
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

            if (await verify(user.password, req.body.oldPassword)) {
                const result = await updatePasswordUser({
                    db: res.locals.db,
                    uuid: user.uuid,
                    newPassword: req.body.newPassword,
                });
                if (result === null) {
                    res.status(404);
                    res.json({
                        statusCode: UpdateUserStatusCode.UNKNOWN_ERROR,
                    });
                    return;
                }
                res.json({
                    statusCode: UpdateUserStatusCode.DONE,
                });
                return;
            }
            res.status(401);
            res.json({
                statusCode: UpdateUserStatusCode.PASSWORD_INCORRECT,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.put('/extended', async (req, res) => {
        try {
            const { user }: Context = res.locals;
            const statusCode = extendedRouteValidation(req);

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            if (statusCode !== UpdateUserStatusCode.DONE) {
                res.status(400);
                console.log(statusCode);
                res.json({
                    statusCode,
                });
                return;
            }

            // insert of update
            const result = await updateExtendedUser({
                db: res.locals.db,
                uuid: user.uuid,
                age: req.body.age,
                gender: req.body.gender,
                sexualOrientation: req.body.sexualOrientation,
            });
            if (result === null) {
                res.status(404);
                res.json({ statusCode: UpdateUserStatusCode.UNKNOWN_ERROR });
                return;
            }
            res.json({
                statusCode: UpdateUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.put('/biography', async (req, res) => {
        try {
            const { user }: Context = res.locals;
            const statusCode = biographyRouteValidation(req);

            if (user === null) {
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
            const result = await updateBiography({
                db: res.locals.db,
                uuid: user.uuid,
                biography: req.body.biography,
            });
            if (result === null) {
                res.status(404);
                res.json({ statusCode: UpdateUserStatusCode.UNKNOWN_ERROR });
                return;
            }
            res.json({
                statusCode: UpdateUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.put('/tags', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            // check info

            // insert or update data

            const result = await updateTags({
                db: res.locals.db,
                uuid: user.uuid,
                tags: req.body.tags,
            });
            if (result === null) {
                res.status(404);
                res.json({ statusCode: UpdateUserStatusCode.UNKNOWN_ERROR });
                return;
            }
            res.json({
                statusCode: UpdateUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });

    router.put('/address', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await updateAddress({
                db: res.locals.db,
                uuid: user.uuid,
                lat: req.body.lat,
                long: req.body.long,
                name: req.body.name,
                administrative: req.body.administrative,
                county: req.body.county,
                country: req.body.country,
                city: req.body.city,
            });
            if (result === null) {
                res.status(404);
                console.log('result null');
                res.json({ statusCode: UpdateUserStatusCode.UNKNOWN_ERROR });
                return;
            }
            res.json({
                statusCode: UpdateUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });
}
