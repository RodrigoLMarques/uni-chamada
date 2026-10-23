import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InstitutionsService } from './institutions.service';
import { SearchStudentsDTO } from './models/institution.dto';
import type { InstitutionDTO, InstitutionStudentDTO } from './models/institution.dto';

@Controller('institutions')
@UseGuards(JwtAuthGuard)
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(): InstitutionDTO[] {
    return this.institutionsService.list();
  }

  @Get('unifesp/students')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ unifesp: { limit: 30, ttl: 60000 } })
  searchUnifespStudents(@Query() filter: SearchStudentsDTO): Promise<InstitutionStudentDTO[]> {
    return this.institutionsService.searchUnifespStudents(filter.query);
  }
}
