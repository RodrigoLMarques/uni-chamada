import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, from, mergeMap } from 'rxjs';
import { StorageService } from './storage.service';

const PHOTO_KEY_FIELD = 'photoKey';
const PHOTO_URL_FIELD = 'photoUrl';
const MAX_DEPTH = 8;

type Holder = Record<string, unknown>;

function isPlainObject(value: unknown): value is Holder {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function collectHolders(value: unknown, into: Holder[], depth: number): void {
  if (depth > MAX_DEPTH) return;

  if (Array.isArray(value)) {
    for (const item of value) collectHolders(item, into, depth + 1);
    return;
  }

  if (!isPlainObject(value)) return;

  if (PHOTO_KEY_FIELD in value) into.push(value);

  for (const nested of Object.values(value)) {
    collectHolders(nested, into, depth + 1);
  }
}

@Injectable()
export class PhotoPresignInterceptor implements NestInterceptor {
  constructor(private readonly storageService: StorageService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(mergeMap((payload) => from(this.resolve(payload))));
  }

  private async resolve(payload: unknown): Promise<unknown> {
    const holders: Holder[] = [];
    collectHolders(payload, holders, 0);
    if (holders.length === 0) return payload;

    const keys = holders
      .map((holder) => holder[PHOTO_KEY_FIELD])
      .filter((key): key is string => typeof key === 'string' && key.length > 0);

    const signed =
      keys.length > 0 && this.storageService.configured
        ? await this.storageService.presignMany(keys)
        : new Map<string, string>();

    for (const holder of holders) {
      const key = holder[PHOTO_KEY_FIELD];
      if (typeof key === 'string') {
        const url = signed.get(key);
        if (url) holder[PHOTO_URL_FIELD] = url;
      }
      delete holder[PHOTO_KEY_FIELD];
    }

    return payload;
  }
}
