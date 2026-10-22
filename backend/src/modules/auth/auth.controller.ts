import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDTO, UpdatePasswordDTO } from './models/auth.dto';
import type { AuthResponse, UserPayload } from './models/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDTO): Promise<AuthResponse> {
    return this.authService.login(body);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserPayload): UserPayload {
    return user;
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  updatePassword(
    @CurrentUser() user: UserPayload,
    @Body() body: UpdatePasswordDTO,
  ): Promise<{ message: string }> {
    return this.authService.updatePassword(user.id, body);
  }
}
