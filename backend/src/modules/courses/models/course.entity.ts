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

export type CourseStats = {
  enrolledCount: number;
  lastSessionAt: Date | null;
  openSessionId: string | null;
};

export type CourseWithStats = CourseEntity & { stats: CourseStats };

export const EMPTY_COURSE_STATS: CourseStats = {
  enrolledCount: 0,
  lastSessionAt: null,
  openSessionId: null,
};
