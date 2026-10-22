import { CoursePeriod } from '../../../../generated/prisma/enums';

export { CoursePeriod };

export type CourseEntity = {
  id: string;
  teacherId: string;
  code: string;
  name: string;
  term: string;
  period: CoursePeriod;
};
