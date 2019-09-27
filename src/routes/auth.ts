import { Router } from 'express';
import { Validator, ValidatorObject } from '../utils/validator';

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

export default function AuthRoutes(): Router {
    const router = Router();

    router.get('/sign-in', (_req, res) => {
        console.log('res.locals =', res.locals);

        res.send('SignIn');
    });

    router.post('/sign-up', req => {
        if (Validator.validate(SignUpSchema, req.body) === false) {
            console.error('the schema is not correct');
        }

        // check info
        // email, username, givenName, familyName, password

        // write info
        // call to createUser()
    });

    return router;
}
