import { EnrollmentStatus } from '../../../../generated/prisma/enums';

export { EnrollmentStatus };

export type StudentEntity = {
  id: string;
  ra: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  entryYear?: number | null;
};

export type EnrollmentEntity = {
  courseId: string;
  studentId: string;
  status: EnrollmentStatus;
  enrolledAt?: Date | null;
  student?: StudentEntity;
};
