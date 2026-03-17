-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('as_is', 'to_be');

-- CreateTable
CREATE TABLE "ProcessFlow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "flowType" "FlowType" NOT NULL,
    "diagramData" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessFlow_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProcessFlow" ADD CONSTRAINT "ProcessFlow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
