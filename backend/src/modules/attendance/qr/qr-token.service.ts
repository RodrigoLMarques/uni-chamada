import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_LENGTH = 16;
const DEFAULT_WINDOW_SECONDS = 3;
const DEFAULT_TICKET_TTL_SECONDS = 180;
const TICKET_PREFIX = 't';

export type QrToken = {
  token: string;
  windowSeconds: number;
  expiresAt: Date;
};

export type ScanTicket = {
  ticket: string;
  expiresAt: Date;
};

@Injectable()
export class QrTokenService {
  private readonly secret: string;
  private readonly windowSeconds: number;
  private readonly ticketTtlSeconds: number;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('QR_SECRET');
    this.windowSeconds = Number(configService.get('QR_WINDOW_SECONDS', DEFAULT_WINDOW_SECONDS));
    this.ticketTtlSeconds = Number(
      configService.get('SCAN_TICKET_TTL_SECONDS', DEFAULT_TICKET_TTL_SECONDS),
    );
  }

  sign(classSessionId: string, now: Date = new Date()): QrToken {
    const window = this.windowOf(now);
    const token = `${classSessionId}.${window.toString(36)}.${this.signature(classSessionId, window)}`;

    return {
      token,
      windowSeconds: this.windowSeconds,
      expiresAt: new Date((window + 1) * this.windowSeconds * 1000),
    };
  }

  verify(token: string, now: Date = new Date()): string | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [classSessionId, encodedWindow, signature] = parts;
    if (!/^[a-z0-9]{1,32}$/.test(classSessionId)) return null;

    const window = parseInt(encodedWindow, 36);
    if (!Number.isInteger(window)) return null;

    const current = this.windowOf(now);
    if (window !== current && window !== current - 1) return null;

    if (!this.matches(signature, this.signature(classSessionId, window))) return null;

    return classSessionId;
  }

  issueTicket(classSessionId: string, now: Date = new Date()): ScanTicket {
    const expiresAtSeconds = Math.floor(now.getTime() / 1000) + this.ticketTtlSeconds;
    const encoded = expiresAtSeconds.toString(36);
    const ticket = `${TICKET_PREFIX}.${classSessionId}.${encoded}.${this.ticketSignature(classSessionId, expiresAtSeconds)}`;

    return { ticket, expiresAt: new Date(expiresAtSeconds * 1000) };
  }

  verifyTicket(ticket: string, now: Date = new Date()): string | null {
    const parts = ticket.split('.');
    if (parts.length !== 4 || parts[0] !== TICKET_PREFIX) return null;

    const [, classSessionId, encodedExpiry, signature] = parts;
    if (!/^[a-z0-9]{1,32}$/.test(classSessionId)) return null;

    const expiresAtSeconds = parseInt(encodedExpiry, 36);
    if (!Number.isInteger(expiresAtSeconds)) return null;
    if (expiresAtSeconds * 1000 <= now.getTime()) return null;

    if (!this.matches(signature, this.ticketSignature(classSessionId, expiresAtSeconds))) {
      return null;
    }

    return classSessionId;
  }

  verifyAny(token: string, now: Date = new Date()): string | null {
    if (token.startsWith(`${TICKET_PREFIX}.`)) return this.verifyTicket(token, now);
    return this.verify(token, now);
  }

  private windowOf(now: Date): number {
    return Math.floor(now.getTime() / 1000 / this.windowSeconds);
  }

  private signature(classSessionId: string, window: number): string {
    return this.hmac(`${classSessionId}.${window}`);
  }

  private ticketSignature(classSessionId: string, expiresAtSeconds: number): string {
    return this.hmac(`${TICKET_PREFIX}.${classSessionId}.${expiresAtSeconds}`);
  }

  private hmac(payload: string): string {
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url')
      .slice(0, SIGNATURE_LENGTH);
  }

  private matches(received: string, expected: string): boolean {
    if (received.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }
}
