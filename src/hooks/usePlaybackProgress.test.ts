import { renderHook } from '@testing-library/react-native';

import { usePlaybackProgress } from './usePlaybackProgress';

/** Expresses a sub-minute quantity in the minutes the hook accepts. */
const seconds = (count: number) => count / 60;

async function progressFor(durationMinutes: number, elapsedMinutes: number) {
  const { result } = await renderHook(() =>
    usePlaybackProgress(durationMinutes, elapsedMinutes),
  );
  return result.current;
}

describe('usePlaybackProgress', () => {
  describe('the four cases the brief names', () => {
    it('reports 0% for a programme that has not started', async () => {
      expect(await progressFor(120, 0)).toEqual({
        progressPercent: 0,
        timeRemainingLabel: '2h remaining',
      });
    });

    it('reports 100% for a programme that has run to its end', async () => {
      expect(await progressFor(120, 120)).toEqual({
        progressPercent: 100,
        timeRemainingLabel: 'Finished',
      });
    });

    it('reports hours and minutes with more than 60 minutes remaining', async () => {
      expect(await progressFor(120, 37)).toEqual({
        progressPercent: 31,
        timeRemainingLabel: '1h 23m remaining',
      });
    });

    it('reports minutes alone with less than 60 minutes remaining', async () => {
      expect(await progressFor(120, 90)).toEqual({
        progressPercent: 75,
        timeRemainingLabel: '30m remaining',
      });
    });
  });

  describe('progressPercent', () => {
    it('rounds up when the remainder is over half a percent', async () => {
      // 37 of 120 is 30.83%, so a truncating implementation would say 30.
      expect((await progressFor(120, 37)).progressPercent).toBe(31);
    });

    it('rounds down when the remainder is under half a percent', async () => {
      // 17 of 120 is 14.17%, so a ceiling implementation would say 15.
      expect((await progressFor(120, 17)).progressPercent).toBe(14);
    });

    it('caps at 100 when elapsed runs past the duration', async () => {
      expect((await progressFor(60, 90)).progressPercent).toBe(100);
    });

    it('is 0 rather than NaN for a zero-length programme', async () => {
      expect((await progressFor(0, 0)).progressPercent).toBe(0);
    });
  });

  describe('the 59/60 minute crossover', () => {
    it('stays in minutes at 59 minutes remaining', async () => {
      expect((await progressFor(120, 61)).timeRemainingLabel).toBe('59m remaining');
    });

    it('switches to hours at exactly 60 minutes remaining', async () => {
      expect((await progressFor(120, 60)).timeRemainingLabel).toBe('1h remaining');
    });

    it('carries the leftover minute just past the hour', async () => {
      expect((await progressFor(120, 59)).timeRemainingLabel).toBe('1h 1m remaining');
    });

    it('rounds 59.5 minutes remaining back up to the hour', async () => {
      // Whole minutes are rounded half-up, so the hour survives a little past it.
      expect((await progressFor(120, 60.5)).timeRemainingLabel).toBe('1h remaining');
    });

    it('drops into minutes once under 59.5 minutes remain', async () => {
      expect((await progressFor(120, 60.6)).timeRemainingLabel).toBe('59m remaining');
    });

    it('reports a single minute without pluralising the unit away', async () => {
      expect((await progressFor(10, 9)).timeRemainingLabel).toBe('1m remaining');
    });
  });

  describe('exact hours', () => {
    it.each([
      { duration: 60, elapsed: 0, label: '1h remaining' },
      { duration: 120, elapsed: 0, label: '2h remaining' },
      { duration: 180, elapsed: 60, label: '2h remaining' },
    ])(
      'says "$label" rather than naming zero minutes, at $duration minutes long and $elapsed in',
      async ({ duration, elapsed, label }) => {
        expect((await progressFor(duration, elapsed)).timeRemainingLabel).toBe(label);
      },
    );
  });

  describe('the sub-minute band', () => {
    it.each([
      { left: 1, label: '1s remaining' },
      { left: 24, label: '24s remaining' },
      { left: 29, label: '29s remaining' },
      { left: 30, label: '30s remaining' },
      { left: 45, label: '45s remaining' },
      { left: 59, label: '59s remaining' },
      { left: 59.4, label: '59s remaining' },
    ])('a clip with $left s left reads "$label"', async ({ left, label }) => {
      expect((await progressFor(seconds(left), 0)).timeRemainingLabel).toBe(label);
    });

    it('does not call a clip that has not started "Finished"', async () => {
      // The sharp case for the band: rounding the remainder to whole minutes
      // would put 0% on the bar and "Finished" on the label at the same time.
      expect(await progressFor(seconds(24), 0)).toEqual({
        progressPercent: 0,
        timeRemainingLabel: '24s remaining',
      });
    });

    it('rounds the seconds rather than rounding them up', async () => {
      // 24.24s: a ceiling implementation would say 25.
      expect((await progressFor(seconds(24.24), 0)).timeRemainingLabel).toBe('24s remaining');
    });

    it('says "Finished" only once nothing is left', async () => {
      expect((await progressFor(seconds(30), seconds(30))).timeRemainingLabel).toBe('Finished');
    });
  });

  describe('boundary guards', () => {
    it.each([
      { left: 59.5, note: 'the first value that rounds to a full minute' },
      { left: 60, note: 'exactly one minute' },
      { left: 60.4, note: 'just over one minute' },
    ])('never says "60s remaining" — $note', async ({ left }) => {
      expect((await progressFor(seconds(left), 0)).timeRemainingLabel).toBe('1m remaining');
    });

    it('rounds whole minutes from the original value, not from the seconds', async () => {
      // 89.94s left. Rounding the minutes off totalSeconds would round twice —
      // 89.94 to 90s, 90s to 1.5m, 1.5m up to 2m — overstating by a minute.
      expect((await progressFor(seconds(89.94), 0)).timeRemainingLabel).toBe('1m remaining');
    });

    it('never says "0m remaining" at the bottom of the minutes branch', async () => {
      // 59.5s is the least that reaches the minutes branch, and it cannot
      // round to zero minutes.
      const { timeRemainingLabel } = await progressFor(seconds(59.5), 0);
      expect(timeRemainingLabel).not.toBe('0m remaining');
      expect(timeRemainingLabel).toBe('1m remaining');
    });
  });

  describe('clamping malformed input', () => {
    it.each([
      { name: 'a NaN duration', duration: NaN, elapsed: 10, percent: 0, label: 'Finished' },
      { name: 'an infinite duration', duration: Infinity, elapsed: 10, percent: 0, label: 'Finished' },
      { name: 'a negative duration', duration: -30, elapsed: 10, percent: 0, label: 'Finished' },
      { name: 'a zero duration', duration: 0, elapsed: 0, percent: 0, label: 'Finished' },
      { name: 'a zero duration with elapsed time', duration: 0, elapsed: 5, percent: 0, label: 'Finished' },
      { name: 'a NaN elapsed', duration: 120, elapsed: NaN, percent: 0, label: '2h remaining' },
      { name: 'an infinite elapsed', duration: 120, elapsed: Infinity, percent: 0, label: '2h remaining' },
      { name: 'a negatively infinite elapsed', duration: 120, elapsed: -Infinity, percent: 0, label: '2h remaining' },
      { name: 'a negative elapsed', duration: 120, elapsed: -10, percent: 0, label: '2h remaining' },
      { name: 'elapsed beyond the duration', duration: 60, elapsed: 90, percent: 100, label: 'Finished' },
    ])('degrades $name to $percent% and "$label"', async ({ duration, elapsed, percent, label }) => {
      expect(await progressFor(duration, elapsed)).toEqual({
        progressPercent: percent,
        timeRemainingLabel: label,
      });
    });

    it('treats an unusable elapsed as zero rather than as an over-run', async () => {
      // Sanitising runs before the over-run check, so a non-finite elapsed
      // reads as "not started", not as "finished".
      expect((await progressFor(120, Infinity)).progressPercent).toBe(0);
    });
  });

  describe('memoisation', () => {
    it('returns the same object when neither input has changed', async () => {
      const { result, rerender } = await renderHook(
        ({ duration, elapsed }: { duration: number; elapsed: number }) =>
          usePlaybackProgress(duration, elapsed),
        { initialProps: { duration: 120, elapsed: 37 } },
      );
      const first = result.current;

      await rerender({ duration: 120, elapsed: 37 });

      expect(result.current).toBe(first);
    });

    it('recomputes when elapsed changes', async () => {
      const { result, rerender } = await renderHook(
        ({ duration, elapsed }: { duration: number; elapsed: number }) =>
          usePlaybackProgress(duration, elapsed),
        { initialProps: { duration: 120, elapsed: 37 } },
      );
      const first = result.current;

      await rerender({ duration: 120, elapsed: 38 });

      expect(result.current).not.toBe(first);
      expect(result.current).toEqual({
        progressPercent: 32,
        timeRemainingLabel: '1h 22m remaining',
      });
    });
  });
});
