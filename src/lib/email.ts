import { upsertRateLimit } from './db';

const RESEND_API = 'https://api.resend.com/emails';

interface NotifyEnv {
  RESEND_API_KEY?: string;
  MAINTAINER_EMAIL?: string;
  DIGEST_THRESHOLD?: string;
  DB: D1Database;
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'LocalMatal <noreply@localmatal.com>', to, subject, html }),
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
  }
}

export function notifyMaintainerFireAndForget(
  env: NotifyEnv,
  submissionId: string,
  baseUrl: string,
): void {
  const apiKey = env.RESEND_API_KEY;
  const to = env.MAINTAINER_EMAIL;
  if (!apiKey || !to) return;

  const threshold = parseInt(env.DIGEST_THRESHOLD ?? '5', 10);
  const hourKey = `email:${new Date().toISOString().slice(0, 13)}`; // YYYY-MM-DDTHH

  const work = async () => {
    const count = await upsertRateLimit(env.DB, 'maintainer', hourKey);

    if (count <= threshold) {
      const link = `${baseUrl}/admin/queue`;
      await sendEmail(
        apiKey,
        to,
        'New submission pending review',
        `<p>A new submission is waiting in the <a href="${link}">queue</a>.</p>
         <p>Submission ID: <code>${submissionId}</code></p>`,
      );
    } else if (count === threshold + 1) {
      const link = `${baseUrl}/admin/queue`;
      await sendEmail(
        apiKey,
        to,
        `${count} submissions pending review`,
        `<p>There are now <strong>${count}</strong> submissions waiting in the <a href="${link}">queue</a>. Subsequent submissions this hour will not trigger individual emails.</p>`,
      );
    }
    // count > threshold + 1: already sent digest, stay silent
  };

  work().catch((err) => console.error('Email notification failed:', err));
}
