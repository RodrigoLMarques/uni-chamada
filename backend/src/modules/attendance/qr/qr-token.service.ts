import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_LENGTH = 16;
const DEFAULT_WINDOW_SECONDS = 3;

export type QrToken = {
  token: string;
  windowSeconds: number;
  expiresAt: Date;
};

@Injectable()
export class QrTokenService {
  private readonly secret: string;
  private readonly windowSeconds: number;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('QR_SECRET');
    this.windowSeconds = Number(configService.get('QR_WINDOW_SECONDS', DEFAULT_WINDOW_SECONDS));
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

  private windowOf(now: Date): number {
    return Math.floor(now.getTime() / 1000 / this.windowSeconds);
  }

  private signature(classSessionId: string, window: number): string {
    return createHmac('sha256', this.secret)
      .update(`${classSessionId}.${window}`)
      .digest('base64url')
      .slice(0, SIGNATURE_LENGTH);
  }

  private matches(received: string, expected: string): boolean {
    if (received.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  }
}
