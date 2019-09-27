import { Express } from 'express';

import AuthRoutes from './auth';

export default function routes(server: Express) {
    server.use('/auth', AuthRoutes());
}
