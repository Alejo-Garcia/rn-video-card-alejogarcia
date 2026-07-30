import { useMemo } from 'react';

/** The playback figures a card needs in order to render, already formatted. */
export interface PlaybackProgress {
  /** Share of the programme already played, as an integer from 0 to 100. */
  progressPercent: number;
  /** How much is left, e.g. `"1h 23m remaining"`, `"45s remaining"`, `"Finished"`. */
  timeRemainingLabel: string;
}

/**
 * Reduces a caller-supplied minute count to something displayable. Malformed
 * values are clamped rather than rejected, so one bad payload degrades to a
 * sane card instead of throwing inside a list of them.
 */
function toNonNegativeMinutes(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function formatTimeRemaining(remainingMinutes: number): string {
  const totalSeconds = Math.round(remainingMinutes * 60);

  if (totalSeconds <= 0) {
    return 'Finished';
  }
  if (totalSeconds < 60) {
    return `${totalSeconds}s remaining`;
  }

  // Rounded from the original minutes, not from totalSeconds: rounding twice
  // would move the minute boundaries.
  const wholeMinutes = Math.round(remainingMinutes);
  const hours = Math.floor(wholeMinutes / 60);
  const minutes = wholeMinutes % 60;

  if (hours === 0) {
    return `${minutes}m remaining`;
  }
  if (minutes === 0) {
    return `${hours}h remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
}

/**
 * Derives the position and time-remaining label for a programme, so that
 * `VideoPlayerCard` performs no arithmetic of its own and this logic can be
 * tested exhaustively without rendering anything.
 *
 * @param durationMinutes Total length of the programme, in minutes.
 * @param elapsedMinutes How far playback has reached, in minutes. Values beyond
 * the duration count as fully played.
 */
export function usePlaybackProgress(
  durationMinutes: number,
  elapsedMinutes: number,
): PlaybackProgress {
  return useMemo(() => {
    const duration = toNonNegativeMinutes(durationMinutes);
    const elapsed = Math.min(toNonNegativeMinutes(elapsedMinutes), duration);

    return {
      progressPercent: duration === 0 ? 0 : Math.round((elapsed / duration) * 100),
      timeRemainingLabel: formatTimeRemaining(duration - elapsed),
    };
  }, [durationMinutes, elapsedMinutes]);
}
