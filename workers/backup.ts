interface BackupEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  RESEND_API_KEY: string;
  MAINTAINER_EMAIL: string;
}

async function sendAlert(env: BackupEnv, subject: string, text: string): Promise<void> {
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'localmatal <noreply@localmatal.com>',
      to: [env.MAINTAINER_EMAIL],
      subject,
      text,
    }),
  }).catch(() => {
    // fire-and-forget: email failure must not fail the backup
  });
}

export default {
  async scheduled(_event: ScheduledEvent, env: BackupEnv, _ctx: ExecutionContext): Promise<void> {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `backups/${date}/db.sqlite`;

    try {
      // Export the full D1 database as SQLite binary
      const dump = await env.DB.dump();
      await env.MEDIA.put(key, dump, {
        httpMetadata: { contentType: 'application/x-sqlite3' },
      });

      sendAlert(
        env,
        `[localmatal] Backup succeeded — ${date}`,
        `Daily backup completed.\nKey: ${key}\nSize: ${dump.byteLength} bytes`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendAlert(
        env,
        `[localmatal] ⚠ Backup FAILED — ${date}`,
        `Daily backup failed.\nError: ${message}`,
      );
      // Re-throw so Cloudflare marks the cron invocation as failed
      throw err;
    }
  },
};
