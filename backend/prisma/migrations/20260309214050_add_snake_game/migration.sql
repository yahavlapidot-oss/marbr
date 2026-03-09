-- AlterEnum
ALTER TYPE "CampaignType" ADD VALUE 'SNAKE';

-- CreateTable
CREATE TABLE "game_scores" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "foodEaten" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_scores_campaignId_score_idx" ON "game_scores"("campaignId", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "game_scores_campaignId_userId_key" ON "game_scores"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
