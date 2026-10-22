export type UserEntity = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt?: Date | null;
};
