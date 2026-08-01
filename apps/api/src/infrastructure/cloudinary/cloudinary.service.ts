import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiOptions } from 'cloudinary';
import { EnvVariable } from '../../config/env.validation';
import { StoredImage } from './types/stored-image.type';

type CloudinaryDeleteResult = {
  result: string;
};

function isCloudinaryDeleteResult(
  value: unknown,
): value is CloudinaryDeleteResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'result' in value &&
    typeof value.result === 'string'
  );
}

@Injectable()
export class CloudinaryService {
  constructor(configService: ConfigService<EnvVariable, true>) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME', {
        infer: true,
      }),
      api_key: configService.get('CLOUDINARY_API_KEY', {
        infer: true,
      }),
      api_secret: configService.get('CLOUDINARY_API_SECRET', {
        infer: true,
      }),
      secure: true,
    });
  }

  private uploadImage(
    fileBuffer: Buffer,
    options: UploadApiOptions,
  ): Promise<StoredImage> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(new Error(error.message));
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary returned no upload result'));
            return;
          }

          resolve({
            storageKey: result.public_id,
            url: result.secure_url,
          });
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  uploadAuctionImage(
    fileBuffer: Buffer,
    auctionId: string,
  ): Promise<StoredImage> {
    return this.uploadImage(fileBuffer, {
      folder: `cbeave/auctions/${auctionId}`,
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
    });
  }

  uploadUserAvatar(fileBuffer: Buffer, userId: string): Promise<StoredImage> {
    return this.uploadImage(fileBuffer, {
      public_id: `cbeave/users/${userId}/avatar`,
      resource_type: 'image',
      unique_filename: false,
      overwrite: true,
      invalidate: true,
    });
  }
  async deleteImage(storageKey: string): Promise<void> {
    const deletionResult: unknown = await cloudinary.uploader.destroy(
      storageKey,
      {
        resource_type: 'image',
      },
    );

    if (!isCloudinaryDeleteResult(deletionResult)) {
      throw new Error('Cloudinary image deletion failed');
    }

    if (
      deletionResult.result !== 'ok' &&
      deletionResult.result !== 'not found'
    ) {
      throw new Error(
        `Cloudinary image deletion failed: ${deletionResult.result}`,
      );
    }
  }
}
