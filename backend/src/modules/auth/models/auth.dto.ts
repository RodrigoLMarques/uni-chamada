import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDTO {
  @IsEmail({}, { message: 'email must be a valid email' })
  email: string;

  @IsNotEmpty({ message: 'password is required' })
  password: string;
}

export class UpdatePasswordDTO {
  @IsNotEmpty({ message: 'currentPassword is required' })
  currentPassword: string;

  @MinLength(6)
  newPassword: string;
}

export type UserPayload = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  accessToken: string;
  user: UserPayload;
};

export type JwtPayload = {
  sub: string;
  email: string;
};
