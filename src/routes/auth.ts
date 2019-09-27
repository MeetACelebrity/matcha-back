import { Router } from 'express';
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

export default function authRoutes(): Router {
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

    const router = Router();

    router.get('/sign-in', (req, res) => {
        console.log('res.locals =', res.locals);

        res.send('SignIn');
    });

    router.post('/sign-up', async (req, res) => {
        console.log(req.body);
        try {
            const validationResult = Validator.validate(signUpSchema, req.body);

            if (typeof validationResult !== 'boolean') {
                const {
                    error: { concernedKey },
                } = validationResult;

                res.status(400);

                let statusCode: SignUpStatusCode;

                switch (concernedKey) {
                    case 'email':
                        statusCode = SignUpStatusCode.EMAIL_INCORRECT;
                        break;
                    case 'username':
                        statusCode = SignUpStatusCode.USERNAME_INCORRECT;
                        break;
                    case 'givenName':
                        statusCode = SignUpStatusCode.GIVEN_NAME_INCORRECT;
                        break;
                    case 'familyName':
                        statusCode = SignUpStatusCode.FAMILY_NAME_INCORRECT;
                        break;
                    case 'password':
                        statusCode = SignUpStatusCode.PASSWORD_INCORRECT;
                        break;
                    default:
                        statusCode = SignUpStatusCode.UNKNOWN_ERROR;
                }

                res.json({
                    statusCode,
                });

                return;
            }

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
