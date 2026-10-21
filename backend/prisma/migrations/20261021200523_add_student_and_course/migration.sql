-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'DROPPED');

-- CreateEnum
CREATE TYPE "CoursePeriod" AS ENUM ('FULL_TIME', 'EVENING');

-- CreateTable
CREATE TABLE "student" (
    "id" BIGSERIAL NOT NULL,
    "ra" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "photo_url" TEXT,
    "entry_year" INTEGER,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course" (
    "id" BIGSERIAL NOT NULL,
    "teacher_id" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "period" "CoursePeriod" NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "course_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("course_id","student_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_ra_key" ON "student"("ra");

-- CreateIndex
CREATE INDEX "idx_course_teacher" ON "course"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_teacher_id_code_term_period_key" ON "course"("teacher_id", "code", "term", "period");

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

