'use client';

import '@solana/wallet-adapter-react-ui/styles.css'; // Wallet UI styles
import './globals.css'; // Add if you have global styles
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'; // Add more adapters as needed
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useMemo } from 'react';

const network = WalletAdapterNetwork.Devnet;

export const metadata = {
  title: 'PUF Wallet', // Sets the tab title (change if needed)
  description: 'Vote and upload vape data for PUF Wallet',
  icons: {
    icon: '/images/logo2.png', // Path to your favicon
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 

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