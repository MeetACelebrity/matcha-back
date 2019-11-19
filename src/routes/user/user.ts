import { Router } from 'express';

import { default as publicUser } from './public-user';

export default function publicUserRoutes(): Router {
    const router = Router();

    publicUser(router);

    return router;
}
