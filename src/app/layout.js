'use client';

import './globals.css'; // Add if you have global styles
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'; // Add more adapters as needed
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useMemo } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css'; // Wallet UI styles

const network = WalletAdapterNetwork.Devnet;

export default function RootLayout({ children }) {
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
    // Add others, but omit KeystoneWalletAdapter to avoid dep conflict
  ], [network]);

  return (
    <html lang="en">
      <body>
        <ConnectionProvider endpoint="https://api.devnet.solana.com">
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}