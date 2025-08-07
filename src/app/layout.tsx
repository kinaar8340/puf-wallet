import { View, StyleSheet } from 'react-native';  // Import RN basics (add more as needed, e.g., Text)
import Providers from './Providers';  // Your context/providers
import SolanaProvider from '../components/SolanaProvider';  // If used

// No metadata export—handle app config in app.json instead

export default function RootLayout() {
  return (
    <Providers>  // Wrap with your providers
      <SolanaProvider>  // If this is your Solana wrapper
        <View style={styles.container}>
          {/* Slot for child pages (Expo Router auto-injects, e.g., renders page.js) */}
          <Slot />
        </View>
      </SolanaProvider>
    </Providers>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },  // Basic full-screen; convert globals.css rules here (e.g., fonts, colors)
});
