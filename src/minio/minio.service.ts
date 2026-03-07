import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET_NAME') || 'ewihub';

    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(
        this.configService.get<string>('MINIO_PORT') || '9000',
        10,
      ),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey:
        this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey:
        this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName);
        console.log(`Bucket "${this.bucketName}" created successfully`);

        // Set bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(
          this.bucketName,
          JSON.stringify(policy),
        );
        console.log(`Bucket policy set for "${this.bucketName}"`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw error;
    }
  }

  async uploadBase64Image(
    base64Data: string,
    folder: string,
    userId: string,
  ): Promise<string> {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');

    // Detect image type from base64 header
    let contentType = 'image/png';
    let extension = 'png';
    if (base64Data.startsWith('data:image/jpeg')) {
      contentType = 'image/jpeg';
      extension = 'jpg';
    } else if (base64Data.startsWith('data:image/gif')) {
      contentType = 'image/gif';
      extension = 'gif';
    } else if (base64Data.startsWith('data:image/webp')) {
      contentType = 'image/webp';
      extension = 'webp';
    }

    const filename = `${folder}/${userId}/${uuidv4()}.${extension}`;

    await this.client.putObject(this.bucketName, filename, buffer, buffer.length, {
      'Content-Type': contentType,
    });

    return this.getPublicUrl(filename);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    userId: string,
  ): Promise<string> {
    const extension = file.originalname.split('.').pop() || 'png';
    const filename = `${folder}/${userId}/${uuidv4()}.${extension}`;

    await this.client.putObject(
      this.bucketName,
      filename,
      file.buffer,
      file.buffer.length,
      {
        'Content-Type': file.mimetype,
      },
    );

    return this.getPublicUrl(filename);
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
  ): Promise<string> {
    await this.client.putObject(
      this.bucketName,
      filename,
      buffer,
      buffer.length,
      {
        'Content-Type': contentType,
      },
    );

    return this.getPublicUrl(filename);
  }

  getPublicUrl(filename: string): string {
    const endpoint =
      this.configService.get<string>('MINIO_PUBLIC_ENDPOINT') ||
      this.configService.get<string>('MINIO_ENDPOINT') ||
      'localhost';
    const port = this.configService.get<string>('MINIO_PUBLIC_PORT') || '9000';
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    await this.client.removeObject(this.bucketName, filename);
  }

  async getPresignedUrl(
    filename: string,
    expiryInSeconds: number = 3600,
  ): Promise<string> {
    return this.client.presignedGetObject(
      this.bucketName,
      filename,
      expiryInSeconds,
    );
  }
}
