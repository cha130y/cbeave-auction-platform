import { Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from '../../infrastructure/cloudinary/cloudinary.service';

@Injectable()
export class AuctionImageStorageService {
  private readonly logger = new Logger(AuctionImageStorageService.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * The database side of the change has already been decided by the time a file
   * is removed, so a failing remote delete must not fail the request. It leaves
   * an orphaned file behind and a log line to find it by.
   */
  async deleteQuietly(storageKey: string, reason?: string): Promise<void> {
    try {
      await this.cloudinaryService.deleteImage(storageKey);
    } catch (error) {
      this.logger.error(
        `Failed to delete Cloudinary image ${storageKey}${reason ? ` (${reason})` : ''}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
