import { CoursePeriod, Institution } from '../../../../generated/prisma/enums';

export { CoursePeriod, Institution };

export type CourseEntity = {
  id: string;
  teacherId: string;
  code: string;
  name: string;
  term: string;
  period: CoursePeriod;
  institution: Institution;
};
