/*
  Warnings:

  - Added the required column `category` to the `Paper` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Paper_Categories" AS ENUM ('CAT', 'FINAL_EXAM', 'ASSIGNMENT');

-- AlterTable
ALTER TABLE "Paper" ADD COLUMN     "category" "Paper_Categories" NOT NULL;
