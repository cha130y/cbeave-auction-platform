import { mapPrimaryImage } from './map-primary-image.util';

describe('mapPrimaryImage', () => {
  it('returns null when the auction has no image', () => {
    expect(mapPrimaryImage(null)).toBeNull();
    expect(mapPrimaryImage(undefined)).toBeNull();
  });

  it('maps the url and alt text', () => {
    expect(
      mapPrimaryImage({
        url: 'https://cdn.example.com/auction.jpg',
        altText: 'A vintage watch',
      }),
    ).toEqual({
      url: 'https://cdn.example.com/auction.jpg',
      altText: 'A vintage watch',
    });
  });

  it('keeps a missing alt text as null', () => {
    expect(
      mapPrimaryImage({
        url: 'https://cdn.example.com/auction.jpg',
        altText: null,
      }),
    ).toEqual({
      url: 'https://cdn.example.com/auction.jpg',
      altText: null,
    });
  });

  it('drops fields the response contract does not expose', () => {
    const record = {
      url: 'https://cdn.example.com/auction.jpg',
      altText: null,
      cloudinaryPublicId: 'auctions/secret-public-id',
    };

    expect(mapPrimaryImage(record)).toEqual({
      url: 'https://cdn.example.com/auction.jpg',
      altText: null,
    });

    expect(mapPrimaryImage(record)).not.toBe(record);
  });
});
