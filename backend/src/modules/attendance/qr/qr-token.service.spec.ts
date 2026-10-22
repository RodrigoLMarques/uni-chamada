import { ConfigService } from '@nestjs/config';
import { QrTokenService } from './qr-token.service';

const makeService = (windowSeconds = 3) =>
  new QrTokenService({
    getOrThrow: () => 'qr-test-secret',
    get: (_key: string, fallback: unknown) => (windowSeconds ? windowSeconds : fallback),
  } as unknown as ConfigService);

const sessionId = 'ky4bs1orjoa0xmceza9dw7ek';

describe('QrTokenService', () => {
  let service: QrTokenService;

  beforeEach(() => {
    service = makeService();
  });

  it('accepts a token inside the same window', () => {
    const now = new Date('2026-11-20T19:00:00.000Z');
    const { token } = service.sign(sessionId, now);

    expect(service.verify(token, now)).toBe(sessionId);
  });

  it('still accepts a token from the previous window', () => {
    const now = new Date('2026-11-20T19:00:00.000Z');
    const { token } = service.sign(sessionId, now);

    const threeSecondsLater = new Date(now.getTime() + 3000);
    expect(service.verify(token, threeSecondsLater)).toBe(sessionId);
  });

  it('rejects a token two windows old', () => {
    const now = new Date('2026-11-20T19:00:00.000Z');
    const { token } = service.sign(sessionId, now);

    const sixSecondsLater = new Date(now.getTime() + 6000);
    expect(service.verify(token, sixSecondsLater)).toBeNull();
  });

  it('rejects a token minted for a future window', () => {
    const future = new Date('2026-11-20T19:01:00.000Z');
    const { token } = service.sign(sessionId, future);

    const now = new Date('2026-11-20T19:00:00.000Z');
    expect(service.verify(token, now)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const now = new Date('2026-11-20T19:00:00.000Z');
    const { token } = service.sign(sessionId, now);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(service.verify(tampered, now)).toBeNull();
  });

  it('rejects a token signed for another session', () => {
    const now = new Date('2026-11-20T19:00:00.000Z');
    const { token } = service.sign(sessionId, now);
    const swapped = token.replace(sessionId, 'aaaaaaaaaaaaaaaaaaaaaaaa');

    expect(service.verify(swapped, now)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const now = new Date('2026-11-20T19:00:00.000Z');
    const other = new QrTokenService({
      getOrThrow: () => 'another-secret',
      get: () => 3,
    } as unknown as ConfigService);

    expect(service.verify(other.sign(sessionId, now).token, now)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    const now = new Date('2026-11-20T19:00:00.000Z');
    expect(service.verify('garbage', now)).toBeNull();
    expect(service.verify('a.b', now)).toBeNull();
    expect(service.verify('', now)).toBeNull();
  });

  it('reports when the current token expires', () => {
    const now = new Date('2026-11-20T19:00:01.000Z');
    const { expiresAt, windowSeconds } = service.sign(sessionId, now);

    expect(windowSeconds).toBe(3);
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(3000);
  });
});
