import { resolveAntiSnipingExtension } from './resolve-anti-sniping-extension.util';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const TWO_MINUTES_MS = 2 * 60 * 1000;

const endingIn = (milliseconds: number): Date =>
  new Date(NOW.getTime() + milliseconds);

describe('resolveAntiSnipingExtension', () => {
  it('extends a bid inside the final two minutes by two minutes', () => {
    const extension = resolveAntiSnipingExtension(endingIn(30_000), 0, NOW);

    expect(extension.shouldExtend).toBe(true);
    expect(extension.previousEndAt).toEqual(endingIn(30_000));
    expect(extension.newEndAt).toEqual(endingIn(30_000 + TWO_MINUTES_MS));
  });

  it('treats exactly two minutes left as inside the window', () => {
    expect(
      resolveAntiSnipingExtension(endingIn(TWO_MINUTES_MS), 0, NOW)
        .shouldExtend,
    ).toBe(true);
  });

  it('leaves a bid one millisecond outside the window alone', () => {
    const endAt = endingIn(TWO_MINUTES_MS + 1);
    const extension = resolveAntiSnipingExtension(endAt, 0, NOW);

    expect(extension.shouldExtend).toBe(false);
    expect(extension.newEndAt).toEqual(endAt);
  });

  it('still grants the fifth extension', () => {
    expect(
      resolveAntiSnipingExtension(endingIn(30_000), 4, NOW).shouldExtend,
    ).toBe(true);
  });

  it('stops extending once five have been granted', () => {
    const endAt = endingIn(30_000);
    const extension = resolveAntiSnipingExtension(endAt, 5, NOW);

    expect(extension.shouldExtend).toBe(false);
    expect(extension.newEndAt).toEqual(endAt);
  });

  // The deadline to persist, so the caller writes one field either way.
  it('reports the unchanged deadline as the new one when it does not extend', () => {
    const endAt = endingIn(60 * 60 * 1000);
    const extension = resolveAntiSnipingExtension(endAt, 0, NOW);

    expect(extension.previousEndAt).toEqual(endAt);
    expect(extension.newEndAt).toEqual(endAt);
  });
});
