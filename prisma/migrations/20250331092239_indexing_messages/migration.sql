-- DropIndex
DROP INDEX "Message_createdAt_idx";

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
