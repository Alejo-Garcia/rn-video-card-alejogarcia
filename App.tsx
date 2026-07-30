import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { VideoPlayerCard } from './src/components/VideoPlayerCard';

export default function App() {
  return (
    <View style={styles.screen}>
      <VideoPlayerCard
        channelName="BBC Two"
        channelInitials="B2"
        channelColor="#1D4ED8"
        programTitle="The Blue Planet"
        programDescription="David Attenborough narrates a journey across the world's oceans, from sunlit coral gardens down to the crushing dark of the abyss."
        durationMinutes={120}
        elapsedMinutes={37}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
  },
});
