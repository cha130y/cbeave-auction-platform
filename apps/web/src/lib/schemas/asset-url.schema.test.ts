import { describe, expect, it } from 'vitest';
import { assetUrlSchema } from './asset-url.schema';

describe('assetUrlSchema', () => {
  it('accepts absolute and app-local asset URLs', () => {
    expect(
      assetUrlSchema.parse('https://res.cloudinary.com/demo/image.jpg'),
    ).toBe('https://res.cloudinary.com/demo/image.jpg');
    expect(assetUrlSchema.parse('/seed-auctions/vintage-camera.svg')).toBe(
      '/seed-auctions/vintage-camera.svg',
    );
  });

  it('rejects relative and protocol-relative paths', () => {
    expect(assetUrlSchema.safeParse('seed-auctions/image.svg').success).toBe(
      false,
    );
    expect(assetUrlSchema.safeParse('//example.com/image.svg').success).toBe(
      false,
    );
  });
});
