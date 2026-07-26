process.env.NODE_ENV = "test";
process.env.API_HOST = "127.0.0.1";
process.env.API_PORT = "3000";
process.env.APP_URL = "http://localhost:5173";
process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/test";
process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
process.env.REDIS_PREFIX = "test";
process.env.COOKIE_SECRET = "0123456789abcdef0123456789abcdef";
process.env.TOKEN_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.GOOGLE_CLIENT_ID = "test-client";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:3000/api/v1/auth/google/callback";
process.env.GOOGLE_DRIVE_CALLBACK_URL =
  "http://localhost:3000/api/v1/drive/oauth/callback";
process.env.GOOGLE_PICKER_API_KEY = "test-picker-key";
process.env.GOOGLE_CLOUD_PROJECT_NUMBER = "123456789";
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL =
  "drive-worker@test-project.iam.gserviceaccount.com";
process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE = "/tmp/test-service-account.json";
process.env.SESSION_TTL_DAYS = "7";
