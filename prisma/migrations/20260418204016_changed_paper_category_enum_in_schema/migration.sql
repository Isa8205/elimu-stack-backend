/*
  Warnings:

  - Changed the type of `category` on the `Paper` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Paper_Category" AS ENUM ('CAT', 'FINAL_EXAM', 'ASSIGNMENT');

-- AlterTable
ALTER TABLE "Paper" DROP COLUMN "category",
ADD COLUMN     "category" "Paper_Category" NOT NULL;

-- DropEnum
DROP TYPE "Paper_Categories";
