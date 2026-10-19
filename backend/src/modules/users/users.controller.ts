import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedItems } from '../../shared/pagination';
import { UserMapper } from './mappers/user.mapper';
import { CreateUserDTO, UpdateUserDTO, UserDTO, UserFilter } from './models/user.dto';
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

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() filter: UserFilter): Promise<PaginatedItems<UserDTO>> {
    const { data, pagination } = await this.usersService.findAll(filter);
    return { data: data.map((user) => UserMapper.entityToDTO(user)), pagination };
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('userId', ParseUUIDPipe) userId: string): Promise<UserDTO> {
    const user = await this.usersService.findById(userId);
    return UserMapper.entityToDTO(user);
  }

  @Patch(':userId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateUserDTO,
  ): Promise<UserDTO> {
    const user = await this.usersService.update(userId, body);
    return UserMapper.entityToDTO(user);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('userId', ParseUUIDPipe) userId: string): Promise<void> {
    await this.usersService.remove(userId);
  }
}
