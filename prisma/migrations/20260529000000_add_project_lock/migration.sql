-- AlterTable
ALTER TABLE "Project" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "lockedById" TEXT;
ALTER TABLE "Project" ADD COLUMN "buildReadyRevisionId" TEXT;
