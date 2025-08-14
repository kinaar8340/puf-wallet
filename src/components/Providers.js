/* ~/puf-wallet-frontend/src/components/SolanaProvider.js */

'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';  // Add this import to fix the error

// If this component needs to provide Solana context (but avoid duplicating layout.js), import providers here
// Otherwise, assume providers are already wrapped higher up and just render the button
export default function Providers({ children }) {
  return (
    <div>
      <WalletMultiButton />  // Place the button here; do NOT wrap providers with it
      {children}  // Render children (e.g., rest of your app) after the button
    </div>
  );
} //eof
