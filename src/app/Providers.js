// ~/puf-wallet-frontend/src/app/Providers.js

'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Import styles for wallet UI
import '@solana/wallet-adapter-react-ui/styles.css';

export default function Providers({ children }) {
  const network = WalletAdapterNetwork.Devnet; // Or MainnetBeta for production
  const wallets = []; // Phantom will be detected automatically

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com"> {/* Switch to mainnet endpoint later */}
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
