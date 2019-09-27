import { Router } from 'express';
import { Validator, ValidatorObject } from '../utils/validator';
import { createUser } from '../models/user';

enum SignUpStatusCode {
    /**
     * The provided username is incorrect, go fuck yourself
     */
    DONE = 'DONE',

    USERNAME_INCORRECT = 'USERNAME_INCORRECT',
    TEST_INCORRECT = 'TEST_INCORRECT',
    PASSWORD_INCORRECT = 'PASSWORD_INCORRECT',
}

type SignUpResponse =
    | {
          statusCode:
              | SignUpStatusCode.USERNAME_INCORRECT
              | SignUpStatusCode.TEST_INCORRECT
              | SignUpStatusCode.DONE;
      }
    | {
          statusCode: SignUpStatusCode.PASSWORD_INCORRECT;
          payload: string;
      };

export default function AuthRoutes(): Router {
    const stringSchema = Validator.string()
        .min(3)
        .max(20);

    const SignUpSchema: ValidatorObject = Validator.object().keys({
        email: Validator.string().email(),
        username: stringSchema,
        givenName: stringSchema,
        familyName: stringSchema,
        password: Validator.string().min(6),
    });

    const router = Router();

    router.get('/sign-in', (_req, res) => {
        console.log('res.locals =', res.locals);

        res.send('SignIn');
    });

    router.post('/sign-up', async (req, res) => {
        console.log(req.body);
        try {
            const validationResult = Validator.validate(SignUpSchema, req.body);

            if (typeof validationResult !== 'boolean') {
                const {
                    error: { error, concernedKey },
                } = validationResult;

                console.error('the schema is not correct', concernedKey, error);
                res.sendStatus(400);

                const response: SignUpResponse = {
                    statusCode: SignUpStatusCode.USERNAME_INCORRECT,
                };
                res.json(response);

                return;
            }
            const result = await createUser({ db: res.locals.db, ...req.body });
            if (result === null) {
                console.error('error in createUser');
                res.sendStatus(500);

                const response: SignUpResponse = {
                    statusCode: SignUpStatusCode.USERNAME_INCORRECT,
                };
                res.json(response);

                return;
            }

            const response: SignUpResponse = {
                statusCode: SignUpStatusCode.DONE,
            };
            res.json(response);
        } catch (e) {
            console.error(e);
        }
    });

    return router;
}
