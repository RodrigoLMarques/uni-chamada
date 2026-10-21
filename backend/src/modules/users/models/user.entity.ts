export type UserEntity = {
  id: bigint;
  name: string;
  email: string;
  passwordHash: string;
  createdAt?: Date | null;
};
