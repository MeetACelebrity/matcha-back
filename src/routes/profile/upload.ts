import * as express from 'express';
import fileType from 'file-type';

const enum UploadPicsStatusCode {
    DONE = 'DONE',
    UPLOAD_ERROR = 'UPLOAD_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export default function setupUpload(router: express.Router) {
    router.put('/profile-pics', async (req, res) => {
        try {
            const cloud = res.locals.cloud;

            // uplaod with stream n minio

            if (
                req.files === undefined ||
                req.files.profile === undefined ||
                Array.isArray(req.files.profile)
            ) {
                return;
            }

            await cloud.putObject(
                'profile-pics',
                req.files.profile.name,
                req.files.profile.data,
                { 'Content-Type': fileType(req.files.profile.data)!.mime }
            );

            res.json({
                statusCode: UploadPicsStatusCode.DONE,
            });
        } catch (e) {
            console.error(e);
        }
    });
}
