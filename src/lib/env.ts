function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "dev-only-change-me-auth-secret-please",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "dev-only-change-me-encryption-key!!",
  cronSecret: process.env.CRON_SECRET ?? "dev-cron-secret",
  aiProvider: process.env.AI_PROVIDER ?? "openai",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30000),
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "Velrix <noreply@localhost>",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "velrix-whatsapp-verify",
  instagramVerifyToken: process.env.INSTAGRAM_VERIFY_TOKEN ?? "velrix-instagram-verify",
};

export function assertProdSecrets() {
  if (!env.isProd) return;
  required("AUTH_SECRET");
  required("ENCRYPTION_KEY");
  required("DATABASE_URL");
}
