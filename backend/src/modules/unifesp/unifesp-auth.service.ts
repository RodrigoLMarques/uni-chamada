import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnifespUnavailableException } from './exceptions/unifesp-unavailable.exception';
import { UnifespSession } from './models/unifesp.model';
import { cookieHeader, extractFirst, parseSetCookie } from './unifesp-http';

const LOGIN_HOST = 'https://siiu.unifesp.br';
const SEARCH_HOST = 'https://busca.siiu.unifesp.br';
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
const SESSION_SAFETY_MARGIN_MS = 60_000;

@Injectable()
export class UnifespAuthService {
  private readonly logger = new Logger(UnifespAuthService.name);
  private readonly username: string;
  private readonly password: string;
  private session: UnifespSession | null = null;
  private pending: Promise<UnifespSession> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('UNIFESP_USERNAME', '');
    this.password = this.configService.get<string>('UNIFESP_PASSWORD', '');
  }

  get configured(): boolean {
    return this.username.length > 0 && this.password.length > 0;
  }

  static get searchHost(): string {
    return SEARCH_HOST;
  }

  static get userAgent(): string {
    return USER_AGENT;
  }

  async current(): Promise<UnifespSession> {
    if (this.session && this.session.expiresAt.getTime() - SESSION_SAFETY_MARGIN_MS > Date.now()) {
      return this.session;
    }
    return this.renew();
  }

  async renew(): Promise<UnifespSession> {
    this.pending ??= this.login().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  invalidate(): void {
    this.session = null;
  }

  private async login(): Promise<UnifespSession> {
    if (!this.configured) {
      throw new UnifespUnavailableException('missing_credentials');
    }

    const cookies = new Map<string, string>();
    const redirectUrl = SEARCH_HOST;

    const loginPage = await this.fetchOrFail(
      `${LOGIN_HOST}/login?redirect_url=${encodeURIComponent(redirectUrl)}`,
      { headers: { 'User-Agent': USER_AGENT } },
      'login_page',
    );
    parseSetCookie(loginPage.headers, cookies);

    const csrf = extractFirst(await loginPage.text(), [
      /name="_token"\s+value="([^"]+)"/,
      /value="([^"]+)"\s+name="_token"/,
      /name="csrf-token"\s+content="([^"]+)"/,
    ]);
    if (!csrf) throw new UnifespUnavailableException('could_not_parse_login_csrf_token');

    const body = new URLSearchParams({
      _token: csrf,
      redirect_url: redirectUrl,
      username: this.username,
      password: this.password,
    });

    const posted = await this.fetchOrFail(
      `${LOGIN_HOST}/login-post`,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
          Origin: LOGIN_HOST,
          Referer: `${LOGIN_HOST}/login?redirect_url=${redirectUrl}`,
          Cookie: cookieHeader(cookies),
        },
        body,
      },
      'login_post',
    );
    parseSetCookie(posted.headers, cookies);

    const location = posted.headers.get('location');
    if (!location?.includes('access_token=')) {
      throw new UnifespUnavailableException('login_rejected');
    }
    const accessToken = new URL(location).searchParams.get('access_token');
    if (!accessToken) throw new UnifespUnavailableException('missing_access_token');

    const landing = await this.fetchOrFail(
      `${SEARCH_HOST}/?access_token=${accessToken}&redirect_url=${redirectUrl}`,
      {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, Referer: `${LOGIN_HOST}/` },
      },
      'landing_redirect',
    );
    parseSetCookie(landing.headers, cookies);

    const page = await this.fetchOrFail(
      `${SEARCH_HOST}/`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: cookieHeader(cookies),
          Referer: `${LOGIN_HOST}/`,
        },
      },
      'search_page',
    );
    parseSetCookie(page.headers, cookies);
    const html = await page.text();

    const bearer = extractFirst(html, [/let\s+hash\s*=\s*"([^"]+)"/, /hash\s*=\s*'([^']+)'/]);
    if (!bearer) throw new UnifespUnavailableException('could_not_parse_api_bearer');

    const csrfToken = extractFirst(html, [/name="csrf-token"\s+content="([^"]+)"/]);
    if (!csrfToken) throw new UnifespUnavailableException('could_not_parse_page_csrf_token');

    this.session = {
      cookies,
      bearer,
      csrfToken,
      expiresAt: new Date(Date.now() + this.jwtLifetimeMs(accessToken)),
    };
    this.logger.log(`unifesp session renewed, expires at ${this.session.expiresAt.toISOString()}`);
    return this.session;
  }

  private jwtLifetimeMs(accessToken: string): number {
    const fallback = 50 * 60_000;
    try {
      const payload = accessToken.split('.')[1];
      if (!payload) return fallback;
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
        exp?: number;
        iat?: number;
      };
      if (!decoded.exp) return fallback;
      const remaining = decoded.exp * 1000 - Date.now();
      return remaining > 0 ? remaining : fallback;
    } catch {
      return fallback;
    }
  }

  private async fetchOrFail(url: string, init: RequestInit, step: string): Promise<Response> {
    try {
      const response = await fetch(url, init);
      if (response.status >= 500) {
        throw new UnifespUnavailableException(`${step}_http_${response.status}`);
      }
      return response;
    } catch (error) {
      if (error instanceof UnifespUnavailableException) throw error;
      throw new UnifespUnavailableException(`${step}_unreachable`);
    }
  }
}
