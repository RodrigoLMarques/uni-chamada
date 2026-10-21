import { EnrollmentStatus } from '../../../../generated/prisma/enums';

export { EnrollmentStatus };

export type StudentEntity = {
  id: bigint;
  ra: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  entryYear?: number | null;
};

export type EnrollmentEntity = {
  courseId: bigint;
  studentId: bigint;
  status: EnrollmentStatus;
  enrolledAt?: Date | null;
  student?: StudentEntity;
};
