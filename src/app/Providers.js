// ~/puf-wallet-frontend/src/app/Providers.js

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets'; // Example, adjust as needed

const wallets = useMemo(
  () => [
    // Remove PhantomWalletAdapter here
    new UnsafeBurnerWalletAdapter(), // Keep others if needed
  ],
  [network]
);
