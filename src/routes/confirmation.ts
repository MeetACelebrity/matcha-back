import * as express from 'express';

import { userVerify } from '../models/user';

export default function setupConfirmation(router: express.Router) {
    router.get('/confirmation/:uuid/:token', req => {
        userVerify({
            db: res.locals.db,
            uuid: req.params.uuid,
            token: req.params.token,
        });

        // get userby ..
    });
}
