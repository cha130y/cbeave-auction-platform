export function getPrimaryImage<T extends { isPrimary: boolean }>(
  images: T[],
): T {
  return images.find((image) => image.isPrimary) ?? images[0];
}
