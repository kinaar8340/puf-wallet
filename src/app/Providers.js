'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'; // Add other adapters if needed

// Import styles for wallet UI
import '@solana/wallet-adapter-react-ui/styles.css';

export default function Providers({ children }) {
  const network = WalletAdapterNetwork.Devnet; // Or MainnetBeta for production
  const wallets = [new PhantomWalletAdapter()]; // Add more wallets as needed

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
