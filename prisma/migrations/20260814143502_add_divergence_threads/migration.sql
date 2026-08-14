-- CreateEnum
CREATE TYPE "PostAuthorType" AS ENUM ('AGENT', 'HUMAN');

-- CreateTable
CREATE TABLE "DivergenceThread" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "divergenceIndex" INTEGER NOT NULL,
    "claim" TEXT NOT NULL,
    "wikipediaSays" TEXT NOT NULL,
    "independentSays" TEXT NOT NULL,
    "citationIndexes" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivergenceThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorType" "PostAuthorType" NOT NULL,
    "authorUserId" TEXT,
    "agentName" TEXT,
    "agentStance" TEXT,
    "content" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "PostVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DivergenceThread_articleId_divergenceIndex_key" ON "DivergenceThread"("articleId", "divergenceIndex");

-- CreateIndex
CREATE INDEX "ThreadPost_threadId_idx" ON "ThreadPost"("threadId");

-- CreateIndex
CREATE INDEX "ThreadPost_parentId_idx" ON "ThreadPost"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "PostVote_postId_userId_key" ON "PostVote"("postId", "userId");

-- AddForeignKey
ALTER TABLE "DivergenceThread" ADD CONSTRAINT "DivergenceThread_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadPost" ADD CONSTRAINT "ThreadPost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DivergenceThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadPost" ADD CONSTRAINT "ThreadPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ThreadPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadPost" ADD CONSTRAINT "ThreadPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ThreadPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVote" ADD CONSTRAINT "PostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
