-- AlterTable
ALTER TABLE "rewards" ADD COLUMN     "productId" TEXT;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
