import { Cloud } from './../../cloud';
import { Context } from './../../../dist/app.d';
import * as express from 'express';

const enum UploadPicsStatusCode {
    DONE = 'DONE',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export default function setupUpload(router: express.Router) {
    router.put('/profile-pics', async (req, res) => {
        console.log('uploding your pics');
        // upload pics

        // if upload is done
        // insert url in db

        res.json({
            statusCode: UploadPicsStatusCode.DONE,
        });
    });
}
