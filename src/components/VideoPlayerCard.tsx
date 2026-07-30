import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlaybackProgress } from '../hooks/usePlaybackProgress';

const CARD_PADDING = 16;
const LOGO_SIZE = 44;
const LOGO_GAP = 12;
const DESCRIPTION_MAX_LINES = 2;

/** The progress fill holds no text, so no user-facing query can reach it. */
export const PROGRESS_FILL_TEST_ID = 'video-player-card-progress-fill';
/** The details region is a container, reachable only by id. */
export const DETAILS_TEST_ID = 'video-player-card-details';

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
  const { progressPercent, timeRemainingLabel } = usePlaybackProgress(
    durationMinutes,
    elapsedMinutes,
  );

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
        {isExpanded ? (
          <View style={[styles.logo, { backgroundColor: channelColor }]}>
            <Text style={styles.logoInitials}>{channelInitials}</Text>
          </View>
        ) : null}
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.channelName}>
            {channelName}
          </Text>
          <Text style={styles.programTitle}>{programTitle}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
          testID={PROGRESS_FILL_TEST_ID}
        />
      </View>

      {isExpanded ? (
        <View style={styles.details} testID={DETAILS_TEST_ID}>
          <Text numberOfLines={DESCRIPTION_MAX_LINES} style={styles.description}>
            {programDescription}
          </Text>
          <Text numberOfLines={1} style={styles.timeRemaining}>
            {timeRemainingLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: CARD_PADDING,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginRight: LOGO_GAP,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
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
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  details: {
    overflow: 'hidden',
  },
  description: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 12,
  },
  timeRemaining: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 8,
  },
});
