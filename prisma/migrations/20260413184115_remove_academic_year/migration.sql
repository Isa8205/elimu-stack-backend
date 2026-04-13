/*
  Warnings:

  - You are about to drop the column `academicYearId` on the `Semester` table. All the data in the column will be lost.
  - You are about to drop the `AcademicYear` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Semester` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academicYear` to the `Semester` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseId` to the `Semester` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AcademicYear" DROP CONSTRAINT "AcademicYear_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Semester" DROP CONSTRAINT "Semester_academicYearId_fkey";

-- DropIndex
DROP INDEX "Semester_academicYearId_name_key";

-- AlterTable
ALTER TABLE "Semester" DROP COLUMN "academicYearId",
ADD COLUMN     "academicYear" INTEGER NOT NULL,
ADD COLUMN     "courseId" TEXT NOT NULL;

-- DropTable
DROP TABLE "AcademicYear";

-- CreateIndex
CREATE UNIQUE INDEX "Semester_name_key" ON "Semester"("name");

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
