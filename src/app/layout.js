/* ~/puf-wallet-frontend/src/app/layout.js */

'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';
import { Providers } from './Providers';
import './globals.css';  // Import global styles including Tailwind

export default function RootLayout({ children }) {
  const network = 'devnet';  // Or use WalletAdapterNetwork.Devnet
  const endpoint = 'https://api.devnet.solana.com';

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
  );

  return (
    <html lang="en">
      <head>
         <link rel="icon" href="/images/icon0.png" type="image/png"/>
      </head>
      <body>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect={false}>
            {/* Set autoConnect to false to prevent auto-reconnect issues */}
            <WalletModalProvider>
              {children}
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}