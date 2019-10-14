import { Cloud } from './../../cloud';
import { Context } from './../../../dist/app.d';
import * as express from 'express';

const enum UploadPicsStatusCode {
    DONE = 'DONE',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export default function setupUpload(router: express.Router) {
    router.put('/profile-pics', async (req, res) => {
        const cloud = res.locals.cloud;

        // upload a new picture

        // get address of it

        // save addresse, user_id, img type (profile pics or other pics) in db

        res.json({
            statusCode: UploadPicsStatusCode.DONE,
        });
    });
}
