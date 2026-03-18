-- CreateTable
CREATE TABLE "ErrorNote" (
    "id" TEXT NOT NULL,
    "errorLogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'comment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorPR" (
    "id" TEXT NOT NULL,
    "errorLogId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorPR_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorNote_errorLogId_idx" ON "ErrorNote"("errorLogId");

-- CreateIndex
CREATE INDEX "ErrorPR_errorLogId_idx" ON "ErrorPR"("errorLogId");

-- AddForeignKey
ALTER TABLE "ErrorNote" ADD CONSTRAINT "ErrorNote_errorLogId_fkey" FOREIGN KEY ("errorLogId") REFERENCES "ErrorLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorNote" ADD CONSTRAINT "ErrorNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorPR" ADD CONSTRAINT "ErrorPR_errorLogId_fkey" FOREIGN KEY ("errorLogId") REFERENCES "ErrorLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorPR" ADD CONSTRAINT "ErrorPR_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
