import { AttendanceMethod } from '../../../../generated/prisma/enums';

export { AttendanceMethod };

export type AttendanceStudent = {
  id: string;
  ra: string;
  name: string;
  photoUrl?: string | null;
  photoKey?: string | null;
};

export type AttendanceEntity = {
  id: string;
  classSessionId: string;
  studentId: string;
  deviceId?: string | null;
  method: AttendanceMethod;
  recordedAt: Date;
  clientIp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
  student?: AttendanceStudent;
};

export type AttendanceFlags = {
  noLocation: boolean;
  farFromTeacher: boolean;
  sharedDevice: boolean;
};
