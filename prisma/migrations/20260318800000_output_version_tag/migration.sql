-- AlterTable
ALTER TABLE "GeneratedOutput" ADD COLUMN "revisionNumber" INTEGER;
ALTER TABLE "GeneratedOutput" ADD COLUMN "changesOnly" BOOLEAN NOT NULL DEFAULT false;
