-- CreateIndex
CREATE INDEX "campaigns_businessId_idx" ON "campaigns"("businessId");

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
