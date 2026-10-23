import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { PhotoPresignInterceptor } from './photo-presign.interceptor';
import { StorageService } from './storage.service';

const makeInterceptor = (configured: boolean) => {
  const storage = {
    configured,
    presignMany: jest.fn((keys: Iterable<string>) =>
      Promise.resolve(new Map([...keys].map((key) => [key, `https://garage/${key}?signed`]))),
    ),
  } as unknown as StorageService;

  return { interceptor: new PhotoPresignInterceptor(storage), storage };
};

const run = async (interceptor: PhotoPresignInterceptor, payload: unknown) => {
  const next: CallHandler = { handle: () => of(payload) };
  return firstValueFrom(interceptor.intercept({} as ExecutionContext, next));
};

describe('PhotoPresignInterceptor', () => {
  it('signs a key and drops the raw field', async () => {
    const { interceptor } = makeInterceptor(true);

    const result = await run(interceptor, {
      student: { ra: '1', photoUrl: null, photoKey: 'students/a.jpg' },
    });

    expect(result).toEqual({
      student: { ra: '1', photoUrl: 'https://garage/students/a.jpg?signed' },
    });
  });

  it('signs every student inside a paginated list', async () => {
    const { interceptor, storage } = makeInterceptor(true);

    const result = (await run(interceptor, {
      data: [
        { student: { photoUrl: null, photoKey: 'students/a.jpg' } },
        { student: { photoUrl: null, photoKey: 'students/b.jpg' } },
      ],
      pagination: { page: 1 },
    })) as { data: { student: { photoUrl: string } }[] };

    expect(result.data[0].student.photoUrl).toContain('students/a.jpg');
    expect(result.data[1].student.photoUrl).toContain('students/b.jpg');
    expect((storage.presignMany as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('keeps an external photoUrl when there is no key', async () => {
    const { interceptor } = makeInterceptor(true);

    const result = await run(interceptor, {
      student: { photoUrl: 'https://example.com/outside.jpg', photoKey: null },
    });

    expect(result).toEqual({ student: { photoUrl: 'https://example.com/outside.jpg' } });
  });

  it('drops the key without signing when storage is off', async () => {
    const { interceptor, storage } = makeInterceptor(false);

    const result = await run(interceptor, {
      student: { photoUrl: null, photoKey: 'students/a.jpg' },
    });

    expect(result).toEqual({ student: { photoUrl: null } });
    expect(storage.presignMany).not.toHaveBeenCalled();
  });

  it('leaves a payload without photos untouched', async () => {
    const { interceptor, storage } = makeInterceptor(true);
    const payload = { data: [{ id: '1', name: 'Course' }], summary: { students: 1 } };

    expect(await run(interceptor, payload)).toEqual(payload);
    expect(storage.presignMany).not.toHaveBeenCalled();
  });

  it('survives null and primitive payloads', async () => {
    const { interceptor } = makeInterceptor(true);

    expect(await run(interceptor, null)).toBeNull();
    expect(await run(interceptor, undefined)).toBeUndefined();
    expect(await run(interceptor, 'text')).toBe('text');
  });

  it('does not walk into dates or buffers', async () => {
    const { interceptor } = makeInterceptor(true);
    const payload = { recordedAt: new Date('2026-01-01'), bytes: Buffer.from('x') };

    const result = (await run(interceptor, payload)) as typeof payload;
    expect(result.recordedAt).toBeInstanceOf(Date);
    expect(result.bytes).toBeInstanceOf(Buffer);
  });
});
