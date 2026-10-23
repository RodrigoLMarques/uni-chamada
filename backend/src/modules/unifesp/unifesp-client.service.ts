import { Injectable, Logger } from '@nestjs/common';
import { UnifespUnavailableException } from './exceptions/unifesp-unavailable.exception';
import { UnifespProfile, UnifespSearchHit, UnifespSession } from './models/unifesp.model';
import { UnifespAuthService } from './unifesp-auth.service';
import { cookieHeader, extractFirst } from './unifesp-http';

const EMAIL_DOMAIN = 'unifesp.br';
const AUTH_FAILURE_STATUSES = new Set([301, 302, 401, 403, 419]);

type RawHit = {
  nome?: string | null;
  nome_social?: string | null;
  cpf?: string | null;
  cpf_hash?: string | null;
  tp_doctos_codigo?: string | null;
  passaporte?: string | null;
  rnm?: string | null;
  alu_matricula?: string | null;
  login_intranet?: string | null;
};

@Injectable()
export class UnifespClientService {
  private readonly logger = new Logger(UnifespClientService.name);

  constructor(private readonly authService: UnifespAuthService) {}

  get configured(): boolean {
    return this.authService.configured;
  }

  async search(query: string): Promise<UnifespSearchHit[]> {
    const normalized = this.normalizeQuery(query);

    const response = await this.withSession((session) =>
      fetch(
        `${UnifespAuthService.searchHost}/api/services/pessoa/view/localiza-unifesp?query=${encodeURIComponent(normalized)}`,
        {
          headers: {
            Authorization: `Bearer ${session.bearer}`,
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'User-Agent': UnifespAuthService.userAgent,
            Cookie: cookieHeader(session.cookies),
            Referer: `${UnifespAuthService.searchHost}/`,
          },
        },
      ),
    );

    const raw = (await response.json()) as RawHit[];
    if (!Array.isArray(raw)) throw new UnifespUnavailableException('unexpected_search_payload');

    return raw.map((hit) => this.toHit(hit)).filter((hit): hit is UnifespSearchHit => hit !== null);
  }

  async profile(handle: string): Promise<UnifespProfile> {
    const response = await this.withSession((session) =>
      fetch(`${UnifespAuthService.searchHost}/consulta-vinculo/${encodeURIComponent(handle)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': UnifespAuthService.userAgent,
          Cookie: cookieHeader(session.cookies),
          Origin: UnifespAuthService.searchHost,
          Referer: `${UnifespAuthService.searchHost}/`,
        },
        body: new URLSearchParams({ _token: session.csrfToken }),
      }),
    );

    return this.parseProfile(await response.text());
  }

  async downloadPhoto(photoPath: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    try {
      const response = await this.withSession((session) =>
        fetch(photoPath, {
          headers: {
            'User-Agent': UnifespAuthService.userAgent,
            Cookie: cookieHeader(session.cookies),
            Referer: `${UnifespAuthService.searchHost}/`,
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
        }),
      );

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.startsWith('image/')) {
        this.logger.warn(`unifesp photo is not an image: ${contentType}`);
        return null;
      }

      return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
    } catch (error) {
      this.logger.warn(`unifesp photo download failed: ${(error as Error).message}`);
      return null;
    }
  }

  emailFrom(loginIntranet: string | null): string | null {
    if (!loginIntranet) return null;
    return `${loginIntranet}@${EMAIL_DOMAIN}`;
  }

  private normalizeQuery(query: string): string {
    const trimmed = query.trim();
    const at = trimmed.indexOf('@');
    return at > 0 ? trimmed.slice(0, at) : trimmed;
  }

  private toHit(hit: RawHit): UnifespSearchHit | null {
    const name = (hit.nome ?? '').trim() || (hit.nome_social ?? '').trim();
    if (!name) return null;

    const handle = [
      hit.tp_doctos_codigo ?? 'null',
      hit.cpf_hash ?? 'null',
      hit.passaporte ?? 'null',
      hit.rnm ?? 'null',
      hit.alu_matricula ?? 'null',
    ].join('|');

    return {
      name,
      ra: hit.alu_matricula ?? null,
      loginIntranet: hit.login_intranet ?? null,
      maskedCpf: hit.cpf ?? null,
      handle,
    };
  }

  private parseProfile(html: string): UnifespProfile {
    const name = extractFirst(html, [/Nome:<\/span>\s*([^<]+)</]);
    const email = extractFirst(html, [/Email:<\/span>\s*([^<\s]+@[^<\s]+)/]);
    const photoPath = extractFirst(html, [/<img\s+src="([^"]*\/cracha\/foto\/[^"]+)"/]);
    const course = extractFirst(html, [/<strong>Curso:\s*<\/strong>\s*([^<]+)</]);
    const entryYear = extractFirst(html, [/<strong>Ingresso:\s*<\/strong>\s*(\d{4})/]);

    if (!name && !email && !photoPath) {
      throw new UnifespUnavailableException('could_not_parse_profile');
    }

    return {
      name: (name ?? '').trim(),
      email: email?.trim() ?? null,
      photoPath: photoPath?.trim() ?? null,
      course: course?.trim() ?? null,
      entryYear: entryYear ? Number(entryYear) : null,
    };
  }

  private async withSession(request: (session: UnifespSession) => Promise<Response>) {
    let session = await this.authService.current();
    let response = await this.send(request, session);

    if (AUTH_FAILURE_STATUSES.has(response.status)) {
      this.logger.warn(`unifesp returned ${response.status}, renewing session`);
      this.authService.invalidate();
      session = await this.authService.renew();
      response = await this.send(request, session);
    }

    if (response.status === 429) throw new UnifespUnavailableException('rate_limited');
    if (!response.ok) throw new UnifespUnavailableException(`http_${response.status}`);

    return response;
  }

  private async send(
    request: (session: UnifespSession) => Promise<Response>,
    session: UnifespSession,
  ): Promise<Response> {
    try {
      return await request(session);
    } catch {
      throw new UnifespUnavailableException('unreachable');
    }
  }
}
