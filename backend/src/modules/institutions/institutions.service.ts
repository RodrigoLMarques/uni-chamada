import { Injectable } from '@nestjs/common';
import { UnifespUnavailableException } from '../unifesp/exceptions/unifesp-unavailable.exception';
import { UnifespClientService } from '../unifesp/unifesp-client.service';
import { Institution, InstitutionDTO, InstitutionStudentDTO } from './models/institution.dto';

const CATALOG: InstitutionDTO[] = [
  { id: Institution.UNIFESP, name: 'Unifesp', autofill: true },
  { id: Institution.OTHER, name: 'Outra', autofill: false },
];

@Injectable()
export class InstitutionsService {
  constructor(private readonly unifespClient: UnifespClientService) {}

  list(): InstitutionDTO[] {
    return CATALOG.map((institution) => ({
      ...institution,
      autofill: institution.autofill && this.unifespClient.configured,
    }));
  }

  async searchUnifespStudents(query: string): Promise<InstitutionStudentDTO[]> {
    if (!this.unifespClient.configured) {
      throw new UnifespUnavailableException('missing_credentials');
    }

    const hits = await this.unifespClient.search(query);

    return hits.map((hit) => ({
      name: hit.name,
      ra: hit.ra,
      email: this.unifespClient.emailFrom(hit.loginIntranet),
      maskedCpf: hit.maskedCpf,
      handle: hit.handle,
    }));
  }
}
