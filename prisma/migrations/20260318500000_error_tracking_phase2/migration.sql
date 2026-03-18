-- AlterTable - Add API key to Project
ALTER TABLE "Project" ADD COLUMN "apiKey" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- AlterTable - Add GitHub token to Organization
ALTER TABLE "Organization" ADD COLUMN "githubToken" TEXT NOT NULL DEFAULT '';

-- AlterTable - Add PR URL to ErrorLog
ALTER TABLE "ErrorLog" ADD COLUMN "prUrl" TEXT NOT NULL DEFAULT '';
