/* ~/puf-wallet-frontend/src/app/Providers.js */

'use client';

import { useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export function Providers({ children }) {
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  const { connected } = useWallet();  // Add this to listen for connection
  const [isConnected, setIsConnected] = useState(connected);  // Local state for force update

  useEffect(() => {
    setIsConnected(connected);  // Update on connection change
  }, [connected]);

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletMultiButton />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}