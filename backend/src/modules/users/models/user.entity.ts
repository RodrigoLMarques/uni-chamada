import { UserRole } from '../../../../generated/prisma/enums';

export { UserRole };

export type UserEntity = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  deletedAt?: Date | null;
};
