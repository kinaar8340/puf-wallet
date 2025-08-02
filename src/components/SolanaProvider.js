'use client'; // Client-side only

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'; // Add more adapters if needed
import { useMemo } from 'react';
import { Connection } from '@solana/web3.js';

// Use your devnet connection (or env var for mainnet toggle)
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export default function Providers({ children }) {
  // Memoize wallets to avoid re-renders
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={connection.rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
