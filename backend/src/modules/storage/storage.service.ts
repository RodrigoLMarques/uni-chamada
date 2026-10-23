import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_PRESIGN_TTL_SECONDS = 900;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly presignTtl: number;

  constructor(configService: ConfigService) {
    const endpoint = configService.get<string>('S3_ENDPOINT', '');
    const accessKeyId = configService.get<string>('S3_ACCESS_KEY_ID', '');
    const secretAccessKey = configService.get<string>('S3_SECRET_ACCESS_KEY', '');

    this.bucket = configService.get<string>('S3_BUCKET', '');
    this.presignTtl = Number(
      configService.get('S3_PRESIGN_TTL_SECONDS', DEFAULT_PRESIGN_TTL_SECONDS),
    );

    this.client =
      endpoint && accessKeyId && secretAccessKey && this.bucket
        ? new S3Client({
            endpoint,
            region: configService.get<string>('S3_REGION', 'garage'),
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
          })
        : null;

    if (!this.client) {
      this.logger.warn('storage is not configured, student photos will not be stored');
    }
  }

  get configured(): boolean {
    return this.client !== null;
  }

  async upload(key: string, bytes: Buffer, contentType: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: bytes,
          ContentType: contentType,
        }),
      );
      return key;
    } catch (error) {
      this.logger.warn(`upload of ${key} failed: ${(error as Error).message}`);
      return null;
    }
  }

  async presign(key: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: this.presignTtl },
      );
    } catch (error) {
      this.logger.warn(`presign of ${key} failed: ${(error as Error).message}`);
      return null;
    }
  }

  async presignMany(keys: Iterable<string>): Promise<Map<string, string>> {
    const unique = [...new Set(keys)];
    const signed = await Promise.all(unique.map((key) => this.presign(key)));

    const resolved = new Map<string, string>();
    unique.forEach((key, index) => {
      const url = signed[index];
      if (url) resolved.set(key, url);
    });
    return resolved;
  }
}
