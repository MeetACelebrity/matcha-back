import { Router, Request } from 'express';

import setupTextual from './textual';

export default function profileRoutes(): Router {
    const router = Router();

    // text info
    setupTextual(router);
    // images --> profile and other

    return router;
}
