// ~/puf-wallet-frontend/src/app/Providers.js

'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
// Add other adapters if needed, e.g., from '@solana/wallet-adapter-wallets'

export function Providers({ children }) {
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    // e.g., new WalletConnectWalletAdapter() if used
  ], []);

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}