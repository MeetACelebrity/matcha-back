import { Router, Request } from 'express';
import { Validator, ValidatorObject } from '../utils/validator';
import { createUser } from '../models/user';

const enum SignUpStatusCode {
    /**
     * The provided username is incorrect, go fuck yourself
     */
    DONE = 'DONE',

    EMAIL_INCORRECT = 'EMAIL_INCORRECT',
    USERNAME_INCORRECT = 'USERNAME_INCORRECT',
    GIVEN_NAME_INCORRECT = 'GIVEN_NAME_INCORRECT',
    FAMILY_NAME_INCORRECT = 'FAMILY_NAME_INCORRECT',
    PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',

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

function signUpRouteValidation(req: Request): SignUpStatusCode {
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

export default function authRoutes(): Router {
    const router = Router();

    router.route('/sign-in').get().get;

    router.get('/sign-in', (req, res) => {
        console.log('res.locals =', res.locals);

        res.send('SignIn');
    });

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

            res.json({ statusCode });

            return;

            const result = await createUser({ db: res.locals.db, ...req.body });
            if (result === null) {
                res.status(500);

                res.json({
                    statusCode: SignUpStatusCode.USERNAME_INCORRECT,
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

    return router;
}
