import { Router, Request } from 'express';

import setupSignUp from './sign-up';
import setupSignIn from './sign-in';
import setupConfirmation from './confirmation';

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
