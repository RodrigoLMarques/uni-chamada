-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'DROPPED');

-- CreateEnum
CREATE TYPE "CoursePeriod" AS ENUM ('FULL_TIME', 'EVENING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" TEXT NOT NULL,
    "ra" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "photo_url" TEXT,
    "entry_year" INTEGER,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "period" "CoursePeriod" NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment" (
    "course_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("course_id","student_id")
);

-- CreateTable
CREATE TABLE "class_session" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "opened_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "accuracy_m" REAL,

    CONSTRAINT "class_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_ra_key" ON "student"("ra");

-- CreateIndex
CREATE INDEX "idx_course_teacher" ON "course"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_teacher_id_code_term_period_key" ON "course"("teacher_id", "code", "term", "period");

-- CreateIndex
CREATE UNIQUE INDEX "class_session_course_id_starts_at_key" ON "class_session"("course_id", "starts_at");

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_session" ADD CONSTRAINT "class_session_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
