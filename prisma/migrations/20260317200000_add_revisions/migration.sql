-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('draft', 'finalized');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('added', 'modified', 'removed');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('objective', 'user_story', 'requirement', 'requirement_category', 'nfr_metric', 'process_flow', 'project_meta');

-- AlterEnum
ALTER TYPE "OutputType" ADD VALUE 'revision_changelog';

-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "RevisionStatus" NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionChange" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "targetId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Revision_projectId_revisionNumber_key" ON "Revision"("projectId", "revisionNumber");

-- CreateIndex
CREATE INDEX "RevisionChange_revisionId_idx" ON "RevisionChange"("revisionId");

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionChange" ADD CONSTRAINT "RevisionChange_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "Revision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
