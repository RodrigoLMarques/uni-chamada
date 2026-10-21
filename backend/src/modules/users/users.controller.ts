import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserPayload } from '../auth/models/auth.dto';
import { PaginatedItems } from '../../shared/pagination';
import { UserMapper } from './mappers/user.mapper';
import { CreateUserDTO, UpdateMeDTO, UpdateUserDTO, UserFilter } from './models/user.dto';
import type { UserDTO } from './models/user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateUserDTO): Promise<UserDTO> {
    const user = await this.usersService.create(body);
    return UserMapper.entityToDTO(user);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() currentUser: UserPayload,
    @Body() body: UpdateMeDTO,
  ): Promise<UserDTO> {
    const user = await this.usersService.update(BigInt(currentUser.id), body);
    return UserMapper.entityToDTO(user);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async removeMe(@CurrentUser() currentUser: UserPayload): Promise<void> {
    await this.usersService.remove(BigInt(currentUser.id));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() filter: UserFilter): Promise<PaginatedItems<UserDTO>> {
    const { data, pagination } = await this.usersService.findAll(filter);
    return { data: data.map((user) => UserMapper.entityToDTO(user)), pagination };
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('userId', ParseIntPipe) userId: number): Promise<UserDTO> {
    const user = await this.usersService.findById(BigInt(userId));
    return UserMapper.entityToDTO(user);
  }

  @Patch(':userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: UpdateUserDTO,
  ): Promise<UserDTO> {
    const user = await this.usersService.update(BigInt(userId), body);
    return UserMapper.entityToDTO(user);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async remove(@Param('userId', ParseIntPipe) userId: number): Promise<void> {
    await this.usersService.remove(BigInt(userId));
  }
}
