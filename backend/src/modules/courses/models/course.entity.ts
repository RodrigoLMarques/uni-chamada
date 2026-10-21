import { CoursePeriod } from '../../../../generated/prisma/enums';

export { CoursePeriod };

export type CourseEntity = {
  id: bigint;
  teacherId: bigint;
  code: string;
  name: string;
  term: string;
  period: CoursePeriod;
};
