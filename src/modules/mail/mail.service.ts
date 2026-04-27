import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import type { TemplateDelegate } from 'handlebars';
import { readFile } from 'fs/promises';
import { join } from 'path';

export type SendEmailInput = {
    to: string;
    subject: string;
    text?: string;
    html?: string;
};

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter;
    private readonly from: string;
    private readonly templatesDir = join(__dirname, 'templates');
    private readonly templateCache = new Map<string, TemplateDelegate>();

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');
        const secure =
            this.configService.get<string>('SMTP_SECURE', 'false') === 'true';

        this.from =
            this.configService.get<string>('SMTP_FROM') ||
            this.configService.get<string>('SMTP_USER') ||
            'no-reply@example.com';

        if (!host || !user || !pass) {
            // Keep the app booting (dev/test), but warn loudly.
            this.logger.warn(
                'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS). Emails will fail if attempted.',
            );
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: user && pass ? { user, pass } : undefined,
        });
    }

    async sendEmail(input: SendEmailInput): Promise<void> {
        const { to, subject, text, html } = input;

        await this.transporter.sendMail({
            from: this.from,
            to,
            subject,
            text,
            html,
        });
    }

    /**
     * Renders `src/modules/mail/templates/{name}.hbs` (copied to `dist` via nest-cli assets).
     */
    async renderTemplate(
        name: string,
        context: Record<string, unknown>,
    ): Promise<string> {
        let compiled = this.templateCache.get(name);
        if (!compiled) {
            const filePath = join(this.templatesDir, `${name}.hbs`);
            const source = await readFile(filePath, 'utf-8');
            compiled = Handlebars.compile(source);
            this.templateCache.set(name, compiled);
        }
        return compiled(context);
    }
}

