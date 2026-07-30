import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';

import { usePlaybackProgress } from '../hooks/usePlaybackProgress';

const CARD_PADDING = 16;
const LOGO_SIZE = 44;
const LOGO_GAP = 12;
const DESCRIPTION_MAX_LINES = 2;
const PROGRESS_ANIMATION_MS = 900;
const EXPAND_ANIMATION_MS = 260;

/** The progress fill holds no text, so no user-facing query can reach it. */
export const PROGRESS_FILL_TEST_ID = 'video-player-card-progress-fill';
/** The details region is a container, reachable only by id. */
export const DETAILS_TEST_ID = 'video-player-card-details';

interface MeasuredDetails {
  contentKey: string;
  height: number;
}

/** Everything the card displays. The caller owns all of the content. */
export interface VideoPlayerCardProps {
  /** Channel the programme is playing on, e.g. `"BBC Two"`. */
  channelName: string;
  /** One or two letters standing in for a channel logo, e.g. `"B2"`. */
  channelInitials: string;
  /** Background colour behind the initials, as any React Native colour value. */
  channelColor: string;
  /** Title of the programme currently playing. */
  programTitle: string;
  /** Synopsis of the programme, clamped to two lines when expanded. */
  programDescription: string;
  /** Total length of the programme, in minutes. */
  durationMinutes: number;
  /** How far playback has reached, in minutes. */
  elapsedMinutes: number;
}

/**
 * A mock "now playing" card. Tapping it toggles between a collapsed summary —
 * channel, title and progress only — and the full detail.
 *
 * Presentational throughout: every value shown arrives as a prop or comes back
 * from `usePlaybackProgress`, and the card performs no arithmetic of its own.
 */
export function VideoPlayerCard({
  channelName,
  channelInitials,
  channelColor,
  programTitle,
  programDescription,
  durationMinutes,
  elapsedMinutes,
}: VideoPlayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [measuredDetails, setMeasuredDetails] = useState<MeasuredDetails | null>(null);
  const { progressPercent, timeRemainingLabel } = usePlaybackProgress(
    durationMinutes,
    elapsedMinutes,
  );

  // Held in state, not refs: they are read during render to build the
  // interpolations below, which react-hooks/refs forbids for refs.
  const [progressAnimation] = useState(() => new Animated.Value(0));
  const [expandAnimation] = useState(() => new Animated.Value(0));

  // Keyed on the description alone. The time label changes far more often while
  // being unable to change the height, and React Native de-duplicates layout
  // events by frame — so a churning key loses measurements rather than refresh.
  const contentKey = programDescription;

  // Derived, not reset in an effect: react-hooks/set-state-in-effect forbids
  // that, and deriving avoids an extra render pass.
  const detailsHeight =
    measuredDetails?.contentKey === contentKey ? measuredDetails.height : null;
  const detailsIsMeasured = detailsHeight !== null;

  const handleDetailsLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height <= 0) return;
      // First positive report per content wins. Once the region is clipped to an
      // animated height, onLayout fires again describing the clipped box, and
      // accepting that report would pin the height near zero for good.
      setMeasuredDetails((previous) =>
        previous?.contentKey === contentKey ? previous : { contentKey, height },
      );
    },
    [contentKey],
  );

  useEffect(() => {
    const animation = Animated.timing(progressAnimation, {
      toValue: progressPercent,
      duration: PROGRESS_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      // Width and height are layout properties, which the native driver cannot
      // animate. Both effects use the JS driver for that reason.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progressAnimation, progressPercent]);

  useEffect(() => {
    const animation = Animated.timing(expandAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: EXPAND_ANIMATION_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expandAnimation, isExpanded]);

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const onExpand = (outputRange: [number, number]) =>
    expandAnimation.interpolate({ inputRange: [0, 1], outputRange });
  const detailsAnimatedHeight = onExpand([0, detailsHeight ?? 0]);
  const logoWidth = onExpand([0, LOGO_SIZE]);
  const logoMarginRight = onExpand([0, LOGO_GAP]);

  let detailsStyle: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  if (detailsIsMeasured) {
    detailsStyle = [styles.details, { height: detailsAnimatedHeight, opacity: expandAnimation }];
  } else if (isExpanded) {
    // Nothing reported layout: show the content rather than hide it for good.
    // Only the animation is lost.
    detailsStyle = styles.details;
  } else {
    detailsStyle = styles.detailsWhileMeasuring;
  }

  const toggleExpanded = useCallback(() => {
    setIsExpanded((previous) => !previous);
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      onPress={toggleExpanded}
      style={styles.card}
    >
      <View style={styles.header}>
        <Animated.View
          // The logo shrinks to zero width rather than unmounting, so hiding it
          // visually is not enough to keep a screen reader out of it.
          accessibilityElementsHidden={!isExpanded}
          importantForAccessibility={isExpanded ? 'auto' : 'no-hide-descendants'}
          style={[
            styles.logo,
            { backgroundColor: channelColor, width: logoWidth, marginRight: logoMarginRight },
          ]}
        >
          <Text style={styles.logoInitials}>{channelInitials}</Text>
        </Animated.View>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.channelName}>
            {channelName}
          </Text>
          <Text style={styles.programTitle}>{programTitle}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: progressWidth }]}
          testID={PROGRESS_FILL_TEST_ID}
        />
      </View>

      <Animated.View
        // Stays mounted so that it can be measured, so the same applies here.
        accessibilityElementsHidden={!isExpanded}
        importantForAccessibility={isExpanded ? 'auto' : 'no-hide-descendants'}
        onLayout={handleDetailsLayout}
        pointerEvents={isExpanded ? 'auto' : 'none'}
        style={detailsStyle}
        testID={DETAILS_TEST_ID}
      >
        <Text ellipsizeMode="tail" numberOfLines={DESCRIPTION_MAX_LINES} style={styles.description}>
          {programDescription}
        </Text>
        <Text numberOfLines={1} style={styles.timeRemaining}>
          {timeRemainingLabel}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: CARD_PADDING, borderRadius: 16, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    height: LOGO_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoInitials: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerText: { flex: 1 },
  channelName: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  programTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '600',
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    marginTop: 14,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#2563EB' },
  details: { overflow: 'hidden' },
  description: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 12,
  },
  timeRemaining: { color: '#6B7280', fontSize: 13, marginTop: 8 },
  // An absolutely positioned child is laid out against its parent's padding box,
  // so these insets must re-apply CARD_PADDING. At left: 0 the text measures
  // 2 * CARD_PADDING wider than it renders in flow, comes back a line short, and
  // the region clips the time-remaining label away entirely.
  detailsWhileMeasuring: {
    position: 'absolute',
    left: CARD_PADDING,
    right: CARD_PADDING,
    opacity: 0,
  },
});
