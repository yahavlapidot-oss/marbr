/*
  Warnings:

  - You are about to drop the column `branchId` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `redemptions` table. All the data in the column will be lost.
  - You are about to drop the `branches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `campaign_branches` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "branches" DROP CONSTRAINT "branches_businessId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_branches" DROP CONSTRAINT "campaign_branches_branchId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_branches" DROP CONSTRAINT "campaign_branches_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_branchId_fkey";

-- DropForeignKey
ALTER TABLE "redemptions" DROP CONSTRAINT "redemptions_branchId_fkey";

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "branchId";

-- AlterTable
ALTER TABLE "redemptions" DROP COLUMN "branchId";

-- DropTable
DROP TABLE "branches";

-- DropTable
DROP TABLE "campaign_branches";
