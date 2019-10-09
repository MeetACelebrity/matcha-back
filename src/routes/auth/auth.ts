import { Router, Request } from 'express';

import setupSignUp from './sign-up';
import setupSignIn from './sign-in';
import setupConfirmation from './confirmation';
import setupResetPassword from './reset-password';

export default function authRoutes(): Router {
    const router = Router();

    setupSignIn(router);

    setupSignUp(router);

    setupConfirmation(router);

    setupResetPassword(router);

    router.get('/logout', (req, res) => {
        req.session!.destroy(console.error);
    });

    return router;
}
