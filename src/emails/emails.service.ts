import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailsService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailsService.name);

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Mail Transporter initialized to ${host}:${port}`);
    } else {
      this.logger.warn('SMTP settings are missing. Mail transporter will run in Ethereal test mode or Console Log mode.');
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    const from = this.config.get<string>('SMTP_FROM') || '"OrderHub Cafe" <receipts@orderhub.com>';

    if (!this.transporter) {
      this.logger.log(`Creating ephemeral Ethereal mail account for testing...`);
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.logger.log(`Ephemeral SMTP initialized: User="${testAccount.user}"`);
      } catch (err) {
        this.logger.error(`Failed to create Ethereal SMTP test account. Falling back to Console Logger.`, err);
      }
    }

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        this.logger.log(`Email dispatched successfully! Message ID: ${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          this.logger.log(`Preview Ethereal Mail URL: ${previewUrl}`);
          return { messageId: info.messageId, previewUrl };
        }
        return { messageId: info.messageId };
      } catch (err: any) {
        this.logger.error(`Failed to send email via SMTP transporter. Falling back to Console Logger. Error: ${err.message}`, err.stack);
        // Fall through to console log dump
      }
    }

    this.logger.log(`[CONSOLE EMAIL DUMP]
To: ${to}
From: ${from}
Subject: ${subject}
HTML Preview: (Logged below)
-----------------------------------------
${html.substring(0, 500)}... [truncated]
-----------------------------------------`);
    return { status: 'logged' };
  }
}
