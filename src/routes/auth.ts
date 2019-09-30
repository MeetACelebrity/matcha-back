import { Router, Request } from 'express';
import { Validator, ValidatorObject } from '../utils/validator';
import { createUser, getUserByUsername } from '../models/user';

import setupSignUp from './sign-up';
import setupSignIn from './sign-in';

export default function authRoutes(): Router {
    const router = Router();

    setupSignIn(router);

    setupSignUp(router);

    setupConfirmation(router);

    router.get('/logout', req => {
        req.session!.destroy(console.error);
    });

    return router;
}
