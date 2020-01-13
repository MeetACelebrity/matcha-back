import * as express from 'express';
import fileType from 'file-type';
import uuid from 'uuid';
import {
    updateProfilePics,
    insertPics,
    deletePics,
    srcToPath,
} from '../../models/user';

const enum UploadPicsStatusCode {
    DONE = 'DONE',
    TOO_MANY_PICS = 'TOO_MANY_PICS',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    FORBIDDEN_FILE = 'FORBIDDEN_FILE',
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

            await cloud.putObject(
                'profile-pics',
                newPics,
                req.files.profile.data,
                { 'Content-Type': fType!.mime }
            );

            // upsert new pics in db
            const result = await updateProfilePics({
                newPics,
                db: res.locals.db,
                uuid: res.locals.user.uuid,
            });

            // if oldpics exist delete it from minio to
            if (result !== 'DONE' && result !== null) {
                await cloud.removeObject('profile-pics', result);
            }

            res.json({
                statusCode: UploadPicsStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

    router.post('/pics', async (req, res) => {
        try {
            const cloud = res.locals.cloud;
            if (
                req.files === undefined ||
                req.files.profile === undefined ||
                Array.isArray(req.files.profile)
            ) {
                return;
            }

            const fType = fileType(req.files.profile.data);
            const authorizeType = ['png', 'jpg', 'gif'];

            if (fType === undefined || !authorizeType.includes(fType.ext)) {
                res.json({ statusCode: UploadPicsStatusCode.FORBIDDEN_FILE });
                return;
            }

            const newPics = `${uuid()}.${fType!.ext}`;

            // Insert pics in db and check if it's possible
            const result = await insertPics({
                newPics,
                db: res.locals.db,
                uuid1: res.locals.user.uuid,
            });

            if (result === null) {
                res.json({
                    statusCode: UploadPicsStatusCode.UNKNOWN_ERROR,
                });
                return;
            }
            if (result.error !== 'DONE') {
                res.json({
                    statusCode: UploadPicsStatusCode.TOO_MANY_PICS,
                });
                return;
            }

            // If pics well insert in db, upload it in minio cloud
            await cloud.putObject(
                'profile-pics',
                newPics,
                req.files.profile.data,
                { 'Content-Type': fType!.mime }
            );

            res.json({
                statusCode: UploadPicsStatusCode.DONE,
                image: {
                    ...result,
                    src: srcToPath(result.src),
                },
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });

    router.delete('/pics', async (req, res) => {
        try {
            const cloud = res.locals.cloud;

            console.log(req.body.pics);
            // Delete pics in db
            const result = await deletePics({
                db: res.locals.db,
                uuid: res.locals.user.uuid,
                pics: req.body.pics,
            });

            // Delete pics in Minio
            if (result === 'BAD_IMAGE' || result === null) {
                res.json({
                    statusCode: UploadPicsStatusCode.UNKNOWN_ERROR,
                });
                return;
            }
            await cloud.removeObject('profile-pics', result);
            res.json({
                statusCode: UploadPicsStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
            res.sendStatus(400);
        }
    });
}
