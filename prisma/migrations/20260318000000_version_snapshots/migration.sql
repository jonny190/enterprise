-- DropForeignKey
ALTER TABLE "RevisionChange" DROP CONSTRAINT "RevisionChange_revisionId_fkey";

-- DropTable
DROP TABLE "RevisionChange";

-- DropEnum
DROP TYPE "ChangeType";

-- DropEnum
DROP TYPE "TargetType";

-- AlterEnum
-- We need to remove 'revision_changelog' from OutputType enum.
-- PostgreSQL doesn't support dropping enum values directly, so we recreate the enum.
ALTER TYPE "OutputType" RENAME TO "OutputType_old";
CREATE TYPE "OutputType" AS ENUM ('ai_prompt', 'requirements_doc', 'project_brief', 'technical_spec');
ALTER TABLE "GeneratedOutput" ALTER COLUMN "outputType" TYPE "OutputType" USING "outputType"::text::"OutputType";
DROP TYPE "OutputType_old";

-- AlterTable
ALTER TABLE "Revision" ADD COLUMN "snapshot" JSONB NOT NULL DEFAULT '{}';
