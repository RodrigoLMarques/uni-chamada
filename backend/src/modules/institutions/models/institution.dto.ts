import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Institution } from '../../../../generated/prisma/enums';

export { Institution };

export class SearchStudentsDTO {
  @IsNotEmpty({ message: 'query is required' })
  @IsString()
  @MinLength(5, { message: 'query must have at least 5 characters' })
  @MaxLength(120)
  query: string;
}

export type InstitutionDTO = {
  id: Institution;
  name: string;
  autofill: boolean;
};

export type InstitutionStudentDTO = {
  name: string;
  ra: string | null;
  email: string | null;
  maskedCpf: string | null;
  handle: string;
};
