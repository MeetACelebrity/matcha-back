declare module 'heml' {
    interface Result {
        errors: string[];
        html: string;
        metadata: {
            meta: any[];
            subject: string;
            size: string;
        };
    }

    function heml(text: string): Promise<Result>;

    export = heml;
}

declare module 'memorystore';
