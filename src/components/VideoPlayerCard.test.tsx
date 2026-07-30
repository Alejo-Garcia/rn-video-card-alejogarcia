import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import {
  DETAILS_TEST_ID,
  PROGRESS_FILL_TEST_ID,
  VideoPlayerCard,
  type VideoPlayerCardProps,
} from './VideoPlayerCard';

const props: VideoPlayerCardProps = {
  channelName: 'BBC Two',
  channelInitials: 'B2',
  channelColor: '#1D4ED8',
  programTitle: 'The Blue Planet',
  programDescription: 'Deep oceans and the cold dark below the reef.',
  durationMinutes: 120,
  elapsedMinutes: 37,
};

/** Yoga does not run here, so this is simply the number a test hands over. */
const MEASURED_HEIGHT = 137;

/** What a user can actually reach. */
const REACHABLE = { includeHiddenElements: false } as const;
/** Everything in the tree, including what is hidden from assistive tech. */
const MOUNTED = { includeHiddenElements: true } as const;

interface StyledNode {
  props: Record<string, unknown>;
}

/** Animated values do not flatten to numbers; `__getValue` is how RN reads them. */
function resolveAnimated(value: unknown): unknown {
  if (typeof value === 'object' && value !== null && '__getValue' in value) {
    return (value as { __getValue: () => unknown }).__getValue();
  }
  return value;
}

function styleOf(node: StyledNode): Record<string, unknown> {
  const flattened = StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {};
  return Object.fromEntries(
    Object.entries(flattened).map(([key, value]) => [key, resolveAnimated(value)]),
  );
}

const card = () => screen.getByRole('button');
const region = () => screen.getByTestId(DETAILS_TEST_ID, MOUNTED);
const progressFill = () => screen.getByTestId(PROGRESS_FILL_TEST_ID, MOUNTED);

async function press() {
  await fireEvent.press(card());
}

/** `onLayout` never fires on its own here; RNTL walks up from the description. */
async function reportLayout(description: string, height: number) {
  await fireEvent(screen.getByText(description, MOUNTED), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height } },
  });
}

// Both animations run on the JS driver, so with real timers their frames land
// outside act() and React warns. Under fake timers nothing ticks unless a
// waitFor advances them, and RNTL advances them inside act().
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('VideoPlayerCard', () => {
  describe('collapsed', () => {
    it('shows the channel and the programme title', async () => {
      await render(<VideoPlayerCard {...props} />);

      expect(screen.getByText(props.channelName, REACHABLE)).toBeOnTheScreen();
      expect(screen.getByText(props.programTitle, REACHABLE)).toBeOnTheScreen();
    });

    it('keeps the description, time remaining and logo out of a user’s reach', async () => {
      await render(<VideoPlayerCard {...props} />);

      expect(screen.queryByText(props.programDescription, REACHABLE)).toBeNull();
      expect(screen.queryByText('1h 23m remaining', REACHABLE)).toBeNull();
      expect(screen.queryByText(props.channelInitials, REACHABLE)).toBeNull();
    });

    it('still hides them once a measurement has been taken', async () => {
      // The measured branch swaps opacity: 0 for an animated opacity, so from
      // here on only the accessibility flags keep assistive tech out.
      await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);

      expect(screen.queryByText(props.programDescription, REACHABLE)).toBeNull();
      expect(screen.queryByText('1h 23m remaining', REACHABLE)).toBeNull();
    });

    it('reports itself collapsed', async () => {
      await render(<VideoPlayerCard {...props} />);

      expect(card()).toBeCollapsed();
    });

    it('hides the details region from assistive tech and from touches', async () => {
      await render(<VideoPlayerCard {...props} />);

      expect(region()).toHaveProp('accessibilityElementsHidden', true);
      expect(region()).toHaveProp('importantForAccessibility', 'no-hide-descendants');
      expect(region()).toHaveProp('pointerEvents', 'none');
    });
  });

  describe('expanded', () => {
    it('reveals every field', async () => {
      await render(<VideoPlayerCard {...props} />);
      await press();

      expect(screen.getByText(props.channelName, REACHABLE)).toBeOnTheScreen();
      expect(screen.getByText(props.programTitle, REACHABLE)).toBeOnTheScreen();
      expect(screen.getByText(props.programDescription, REACHABLE)).toBeOnTheScreen();
      expect(screen.getByText('1h 23m remaining', REACHABLE)).toBeOnTheScreen();
      expect(screen.getByText(props.channelInitials, REACHABLE)).toBeOnTheScreen();
    });

    it('reports itself expanded and stops hiding the details', async () => {
      await render(<VideoPlayerCard {...props} />);
      await press();

      expect(card()).toBeExpanded();
      expect(region()).toHaveProp('accessibilityElementsHidden', false);
      expect(region()).toHaveProp('importantForAccessibility', 'auto');
      expect(region()).toHaveProp('pointerEvents', 'auto');
    });

    it('collapses again on a second press', async () => {
      await render(<VideoPlayerCard {...props} />);
      await press();
      await press();

      expect(card()).toBeCollapsed();
      expect(screen.queryByText(props.programDescription, REACHABLE)).toBeNull();
    });
  });

  describe('content', () => {
    it('clamps the description to two lines with a tail ellipsis', async () => {
      await render(<VideoPlayerCard {...props} />);

      const description = screen.getByText(props.programDescription, MOUNTED);
      expect(description).toHaveProp('numberOfLines', 2);
      expect(description).toHaveProp('ellipsizeMode', 'tail');
    });

    it('clamps the time remaining to one line', async () => {
      // The invariant contentKey depends on: a label that cannot wrap cannot
      // change the measured height.
      await render(<VideoPlayerCard {...props} />);

      expect(screen.getByText('1h 23m remaining', MOUNTED)).toHaveProp('numberOfLines', 1);
    });

    it('renders the initials over the channel colour', async () => {
      await render(<VideoPlayerCard {...props} />);

      const initials = screen.getByText(props.channelInitials, MOUNTED);
      expect(initials).toBeOnTheScreen();
      expect(styleOf(initials.parent as StyledNode).backgroundColor).toBe(props.channelColor);
    });

    it('leaves nothing behind when the programme changes', async () => {
      const { rerender } = await render(<VideoPlayerCard {...props} />);
      await press();

      const next: VideoPlayerCardProps = {
        channelName: 'Channel 4',
        channelInitials: 'C4',
        channelColor: '#DC2626',
        programTitle: 'Grand Designs',
        programDescription: 'A couple build a house on a cliff.',
        durationMinutes: 60,
        elapsedMinutes: 15,
      };
      await rerender(<VideoPlayerCard {...next} />);

      expect(screen.queryByText(props.channelName, MOUNTED)).toBeNull();
      expect(screen.queryByText(props.programTitle, MOUNTED)).toBeNull();
      expect(screen.queryByText(props.programDescription, MOUNTED)).toBeNull();
      expect(screen.queryByText('1h 23m remaining', MOUNTED)).toBeNull();
      expect(screen.getByText(next.channelName, MOUNTED)).toBeOnTheScreen();
      expect(screen.getByText('45m remaining', MOUNTED)).toBeOnTheScreen();
    });
  });

  describe('the progress bar', () => {
    it('fills to the derived percentage in the track colour', async () => {
      await render(<VideoPlayerCard {...props} />);

      // 37 of 120 minutes is 31%, which the hook rounds and the bar animates to.
      await waitFor(() => expect(styleOf(progressFill()).width).toBe('31%'), { timeout: 3000 });
      expect(styleOf(progressFill()).backgroundColor).toBe('#2563EB');
    });

    it('starts from empty', async () => {
      await render(<VideoPlayerCard {...props} />);

      expect(styleOf(progressFill()).width).toBe('0%');
    });
  });

  describe('the measured height', () => {
    it('measures behind the card padding rather than against the padding box', async () => {
      // An absolutely positioned child is laid out against the parent's padding
      // box, so at inset 0 the text is measured 2 * CARD_PADDING too wide, comes
      // back a line short, and the region clips the time-remaining label away.
      await render(<VideoPlayerCard {...props} />);

      const style = styleOf(region());
      expect(style.position).toBe('absolute');
      expect(style.left).toBe(styleOf(card()).padding);
      expect(style.right).toBe(styleOf(card()).padding);
    });

    it('animates the region to the height that was reported', async () => {
      await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);
      await press();

      await waitFor(() => expect(styleOf(region()).height).toBe(MEASURED_HEIGHT));
      // Without this the animated height would not actually clip anything.
      expect(styleOf(region()).overflow).toBe('hidden');
    });

    it('ignores a non-positive report and still opens on a real one', async () => {
      // The region reports height 0 while clipped. Storing that would satisfy
      // the content key and lock the card shut against the real measurement.
      await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, 0);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);
      await press();

      await waitFor(() => expect(styleOf(region()).height).toBe(MEASURED_HEIGHT));
    });

    it('animates back to zero on collapse', async () => {
      await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);
      await press();
      await waitFor(() => expect(styleOf(region()).height).toBe(MEASURED_HEIGHT));

      await press();

      await waitFor(() => expect(styleOf(region()).height).toBe(0));
    });

    it('keeps the first positive report and ignores later ones', async () => {
      // Once clipped to an animated height the region reports its clipped box,
      // and accepting that would pin the height near zero for good.
      await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);
      await reportLayout(props.programDescription, 12);
      await reportLayout(props.programDescription, 400);
      await press();

      await waitFor(() => expect(styleOf(region()).height).toBe(MEASURED_HEIGHT));
    });

    it('stops applying a height measured from other content immediately', async () => {
      // Asserted in the window between the content change and the next report:
      // checking only the height after a fresh report would pass even if
      // staleness were never detected at all.
      const { rerender } = await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);
      await press();
      await waitFor(() => expect(styleOf(region()).height).toBe(MEASURED_HEIGHT));
      await press();

      await rerender(
        <VideoPlayerCard {...props} programDescription="A shorter synopsis entirely." />,
      );

      const style = styleOf(region());
      expect(style.height).toBeUndefined();
      expect(style.position).toBe('absolute');
    });

    it('re-measures after the description changes', async () => {
      const { rerender } = await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);
      await press();
      await waitFor(() => expect(styleOf(region()).height).toBe(MEASURED_HEIGHT));
      await press();

      const nextDescription = 'A shorter synopsis entirely.';
      await rerender(<VideoPlayerCard {...props} programDescription={nextDescription} />);
      await reportLayout(nextDescription, 88);
      await press();

      await waitFor(() => expect(styleOf(region()).height).toBe(88));
    });

    it('retains the measurement when only the time label changes', async () => {
      const { rerender } = await render(<VideoPlayerCard {...props} />);
      await reportLayout(props.programDescription, MEASURED_HEIGHT);
      await press();
      await waitFor(() => expect(styleOf(region()).height).toBe(MEASURED_HEIGHT));

      await rerender(<VideoPlayerCard {...props} elapsedMinutes={38} />);

      // The label moved on; no new layout report has arrived, so the stored
      // height has to still apply.
      expect(screen.getByText('1h 22m remaining', REACHABLE)).toBeOnTheScreen();
      expect(styleOf(region()).height).toBe(MEASURED_HEIGHT);
    });

    it('shows the details at natural height when layout is never reported', async () => {
      // The safety net: no measurement can ever arrive from this host, so the
      // content must still be shown rather than stay invisible for good.
      await render(<VideoPlayerCard {...props} />);
      await press();

      const style = styleOf(region());
      expect(style.height).toBeUndefined();
      expect(style.position).toBeUndefined();
      expect(screen.getByText(props.programDescription, REACHABLE)).toBeOnTheScreen();
      expect(screen.getByText('1h 23m remaining', REACHABLE)).toBeOnTheScreen();
    });
  });
});
