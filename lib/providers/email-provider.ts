export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailResult = {
  sent: boolean;
  mode: 'resend' | 'mock';
  providerId?: string;
  error?: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

export class MockEmailProvider implements EmailProvider {
  async send(_message: EmailMessage): Promise<EmailResult> {
    return {sent: false, mode: 'mock'};
  }
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {sent: false, mode: 'resend', error: body?.message ?? `RESEND_${response.status}`};
    }
    return {sent: true, mode: 'resend', providerId: body?.id};
  }
}

export function createEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) return new ResendEmailProvider(apiKey, from);
  return new MockEmailProvider();
}

export const emailProvider = createEmailProvider();
