import { CLOUD_ENDPOINT } from './constants';
import { Client } from 'minio';

export class Cloud extends Client {
    constructor() {
        const { MINIO_ACCESS_KEY, MINIO_SECRET_KEY } = process.env;

        super({
            endPoint: CLOUD_ENDPOINT,
            port: 9000,
            useSSL: true,
            accessKey: String(MINIO_ACCESS_KEY),
            secretKey: String(MINIO_SECRET_KEY),
        });
    }
}
