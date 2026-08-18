type PrimaryImageSource = { url: string; altText: string | null };

export function mapPrimaryImage(
  image: PrimaryImageSource | null | undefined,
): PrimaryImageSource | null {
  return image ? { url: image.url, altText: image.altText } : null;
}
