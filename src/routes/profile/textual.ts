import * as express from 'express';
import { differenceInYears } from 'date-fns';

import {
    updateGeneralUser,
    updatePasswordUser,
    updateExtendedUser,
    updateBiography,
    updateAddress,
    updateLocation,
    updateRoaming,
    addTags,
    deleteTags,
    deleteAddress,
    getTags,
} from '../../models/user';
import { Validator, ValidatorObject } from '../../utils/validator';
import { Context } from './../../app';
import { verify, hash } from 'argon2';
import { getPackedSettings } from 'http2';

const enum UpdateUserStatusCode {
    DONE = 'DONE',
    EMAIL_INCORRECT = 'EMAIL_INCORRECT',
    USERNAME_INCORRECT = 'USERNAME_INCORRECT',
    GIVEN_NAME_INCORRECT = 'GIVEN_NAME_INCORRECT',
    FAMILY_NAME_INCORRECT = 'FAMILY_NAME_INCORRECT',
    BIRTHDAY_INCORRECT = 'BIRTHDAY_INCORRECT',
    GENDER_INCORRECT = 'GENDER_INCORRECT',
    SEXUAL_ORIENTATION_INCORRECT = 'SEXUAL_ORIENTATION_INCORRECT',
    BIOGRAPHY_INCORRECT = 'BIOGRAPHY_INCORRECT',
    UNDER_BIRTHDAY = 'UNDER_BIRTHDAY',

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
    currentPassword: Validator.string().password(),
    newPassword: Validator.string().password(),
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

// /extended birthday, genrem sexualOrientation
const extendedSchema: ValidatorObject = Validator.object().keys({
    birthday: Validator.number(),
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
            case 'birthday':
                return UpdateUserStatusCode.BIRTHDAY_INCORRECT;
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

            if (await verify(user.password, req.body.currentPassword)) {
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

            const birthday = new Date(req.body.birthday);
            if (differenceInYears(new Date(), birthday) < 18) {
                res.json({
                    statusCode: UpdateUserStatusCode.UNDER_BIRTHDAY,
                });
                return;
            }

            // insert of update
            const result = await updateExtendedUser({
                db: res.locals.db,
                uuid: user.uuid,
                gender: req.body.gender,
                birthday: birthday.toISOString(),
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
                isPrimary: req.body.isPrimary,
                lat: req.body.lat,
                long: req.body.long,
                name: req.body.name,
                administrative: req.body.administrative,
                county: req.body.county,
                country: req.body.country,
                city: req.body.city,
                auto: req.body.auto,
            });
            if (result !== 'DONE') {
                res.status(404);
                res.json({ statusCode: UpdateUserStatusCode.UNKNOWN_ERROR });
                return;
            }
            res.json({
                statusCode: UpdateUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

    router.delete('/address/delete', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const result = await deleteAddress({
                db: res.locals.db,
                uuid: user.uuid,
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
            res.sendStatus(400);
        }
    });

    router.post('/address/position', async (req, res) => {
        try {
            const result = await updateAddress({
                db: res.locals.db,
                uuid: req.body.uuid,
                isPrimary: req.body.isPrimary,
                lat: req.body.lat,
                long: req.body.long,
                name: '',
                administrative: '',
                county: '',
                country: '',
                city: '',
                auto: true,
            });
            if (result !== 'DONE') {
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
            res.sendStatus(400);
        }
    });
    router.put('/tags/add', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const result = await addTags({
                db: res.locals.db,
                uuid: user.uuid,
                tag: req.body.tag,
            });
            if (result !== 'DONE') {
                res.status(404);
                res.json({ statusCode: UpdateUserStatusCode.UNKNOWN_ERROR });
                return;
            }
            res.json({
                statusCode: UpdateUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

    router.put('/location', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const result = await updateLocation({
                db: res.locals.db,
                uuid: user.uuid,
                value: req.body.acceptGeolocation,
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
            res.sendStatus(400);
        }
    });

    router.put('/roaming', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }
            const result = await updateRoaming({
                db: res.locals.db,
                uuid: user.uuid,
                value: req.body.value,
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
            res.sendStatus(400);
        }
    });

    router.delete('/tags/delete', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await deleteTags({
                db: res.locals.db,
                uuid: user.uuid,
                tag: req.body.tag,
            });

            if (result !== 'DONE') {
                res.status(404);
                res.json({ statusCode: UpdateUserStatusCode.UNKNOWN_ERROR });
                return;
            }
            res.json({
                statusCode: UpdateUserStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

    router.get('/tags', async (req, res) => {
        try {
            const { user }: Context = res.locals;

            if (user === null) {
                res.sendStatus(404);
                return;
            }

            const result = await getTags({ db: res.locals.db });

            res.json(result);
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });
}
