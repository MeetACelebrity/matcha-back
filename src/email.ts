import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import heml from 'heml';

export interface SendMailArgs {
    text: string;
    html: string;
    subject: string;
    to: string;
}

export default class Email {
    private mailer: Mail = createTransport({
        host: String(process.env.EMAIL_HOST),
        port: Number(process.env.EMAIL_PORT),
        secure: true,
        auth: {
            user: String(process.env.EMAIL_USER),
            pass: String(process.env.EMAIL_PASSWORD),
        },
    });

    async sendMail({ subject, text, html, to }: SendMailArgs) {
        const { html: htmlGeneratedHeml } = await heml(html);

        return this.mailer.sendMail({
            to,
            text,
            subject,
            html: htmlGeneratedHeml,
            from: '"Meet a Celebrity" <contact@meetacelebrity.com>',
        });
    }
}
