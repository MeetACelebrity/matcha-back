import { server, request, IMessage, connection } from 'websocket';
import { Server } from 'http';

export interface OnMessageCallbackArgs {
    body: any;
    request: request;
    connection: connection;
}

export interface OnCloseCallbackArgs {
    statusCode: number;
    description: string;
    request: request;
    connection: connection;
}

type OnMessageCallback = (args: OnMessageCallbackArgs) => Promise<void> | void;
type OnCloseCallback = (args: OnCloseCallbackArgs) => Promise<void> | void;

export class WS extends server {
    private static ALLOWED_ORIGINS = ['http://localhost:3000'];

    constructor(server: Server) {
        super({
            httpServer: server,
            autoAcceptConnections: false,
        });
    }

    private static isOriginAllowed(origin: string) {
        return WS.ALLOWED_ORIGINS.includes(origin);
    }

    setup(onMessage: OnMessageCallback, onClose: OnCloseCallback) {
        this.on('request', request => {
            if (!WS.isOriginAllowed(request.origin)) {
                request.reject(403);
                console.error('This origin is not allowed', request.origin);
                return;
            }

            console.log('request =', request);

            // who am I ?

            const connection = request.accept('echo-protocol', request.origin);

            connection.on('message', async (message: IMessage) => {
                try {
                    if (
                        message.type !== 'utf8' ||
                        message.utf8Data === undefined
                    ) {
                        console.error('incorrect data');
                        return;
                    }

                    const body = JSON.parse(message.utf8Data);

                    await onMessage({
                        body,
                        request,
                        connection,
                    });
                } catch (e) {
                    console.error('Error on message handler', e);
                }
            });

            connection.on('close', async (statusCode, description) => {
                try {
                    await onClose({
                        request,
                        connection,
                        statusCode,
                        description,
                    });
                } catch (e) {
                    console.error('Error on close handler', e);
                }
            });
        });
    }
}
