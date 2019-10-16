import * as express from 'express';
import fileType from 'file-type';
import uuid from 'uuid';
import { updateProfilePics } from '../../models/user';

const enum UploadPicsStatusCode {
    DONE = 'DONE',
    UPLOAD_ERROR = 'UPLOAD_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export default function setupUpload(router: express.Router) {
    router.put('/profile-pics', async (req, res) => {
        try {
            const cloud = res.locals.cloud;

            if (
                req.files === undefined ||
                req.files.profile === undefined ||
                Array.isArray(req.files.profile)
            ) {
                return;
            }

            // Upload new pics in minio
            const fType = fileType(req.files.profile.data);
            const newPics = `${uuid()}.${fType!.ext}`;

            // await cloud.putObject(
            //     'profile-pics',
            //     newPics,
            //     req.files.profile.data,
            //     { 'Content-Type': fType!.mime }
            // );

            // upsert new pics in db
            const result = await updateProfilePics({
                newPics,
                db: res.locals.db,
                uuid1: res.locals.user.uuid,
            });

            // if oldpics exist delete it from minio to
            if (result !== null) {
                console.log(result);
            }
            res.json({
                statusCode: UploadPicsStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });
}

// newPics
// minioUpload newPics
//    |
//     if oldPics exist
//        - UPDATE oldPics by newPics AND return oldPics
//        - minioDelete oldPics
//     else
//          INSERT newPics
//
