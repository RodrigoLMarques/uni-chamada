-- CreateTable
CREATE TABLE "class_session" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
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
CREATE UNIQUE INDEX "class_session_course_id_starts_at_key" ON "class_session"("course_id", "starts_at");

-- AddForeignKey
ALTER TABLE "class_session" ADD CONSTRAINT "class_session_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
