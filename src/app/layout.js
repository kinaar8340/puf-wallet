'use client';

import { useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

export function Providers({ children }) {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (mediaQuery.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme(); // Initial apply
    mediaQuery.addEventListener('change', applyTheme); // Listen for changes

    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, []);

  const wallets = [
    new PhantomWalletAdapter(),
    // Add other adapters if needed
  ];

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