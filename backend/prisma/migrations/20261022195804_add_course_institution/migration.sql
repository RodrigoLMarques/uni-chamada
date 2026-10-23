-- CreateEnum
CREATE TYPE "Institution" AS ENUM ('UNIFESP', 'OTHER');

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "institution" "Institution" NOT NULL DEFAULT 'OTHER';
