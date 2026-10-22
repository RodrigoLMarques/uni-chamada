import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './repositories/auth.repository';
import { AuthResponse, JwtPayload, LoginDTO, UpdatePasswordDTO } from './models/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDTO): Promise<AuthResponse> {
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('invalid_credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('invalid_credentials');

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDTO): Promise<{ message: string }> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException();

    const passwordMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('invalid_credentials');

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', 10));
    const passwordHash = await bcrypt.hash(dto.newPassword, rounds);

    await this.authRepository.updatePassword(userId, passwordHash);

    return { message: 'password_updated' };
  }
}
