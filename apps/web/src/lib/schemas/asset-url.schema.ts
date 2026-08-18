import { z } from 'zod';

const rootRelativeAssetPathSchema = z
  .string()
  .regex(
    /^\/(?!\/)\S+$/,
    'Expected an absolute URL or a root-relative asset path',
  );

export const assetUrlSchema = z.union([z.url(), rootRelativeAssetPathSchema]);
