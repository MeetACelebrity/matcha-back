import { Router, Request } from 'express';

import setupTextual from './textual';
import setupUpload from './upload';

export default function profileRoutes(): Router {
    const router = Router();

    setupTextual(router);
    setupUpload(router);

    return router;
}
