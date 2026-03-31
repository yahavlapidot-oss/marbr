-- AddIndex: compound index on entries for campaign+user+validity lookups
CREATE INDEX "entries_campaignId_userId_isValid_idx" ON "entries"("campaignId", "userId", "isValid");

-- AddIndex: compound index on user_rewards for user+status lookups
CREATE INDEX "user_rewards_userId_status_idx" ON "user_rewards"("userId", "status");

-- AddIndex: compound index on campaigns for business+status lookups
CREATE INDEX "campaigns_businessId_status_idx" ON "campaigns"("businessId", "status");

-- AddIndex: compound index on event_logs for business+time range queries
CREATE INDEX "event_logs_businessId_createdAt_idx" ON "event_logs"("businessId", "createdAt");
