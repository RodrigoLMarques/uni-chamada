-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('QR', 'MANUAL');

-- CreateTable
CREATE TABLE "student_device" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "student_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "class_session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "device_id" TEXT,
    "method" "AttendanceMethod" NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_ip" INET,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "accuracy_m" REAL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_device_token_hash_key" ON "student_device"("token_hash");

-- CreateIndex
CREATE INDEX "idx_device_student" ON "student_device"("student_id");

-- CreateIndex
CREATE INDEX "idx_attendance_device" ON "attendance"("device_id", "class_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_class_session_id_student_id_key" ON "attendance"("class_session_id", "student_id");

-- AddForeignKey
ALTER TABLE "student_device" ADD CONSTRAINT "student_device_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "class_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "student_device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
