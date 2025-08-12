// ~/puf-wallet-frontend/src/app/layout.js

import '../app/globals.css';  
import Providers from './Providers';  // Your context/providers
import SolanaProvider from '../components/SolanaProvider';  // If used

// Original metadata (add if your web had it; e.g., for Next.js SEO)
export const metadata = {
  title: 'PUF Wallet',
  description: 'web3 solana wallet',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
        <link rel="manifest" href="/images/site.webmanifest"></link>
        <link rel="icon" href="/images/icon0.png" type="image/png" />
      </head>
      <body className="bg-[url('/images/bg1.png')] bg-fixed bg-cover bg-center">
        <Providers>
          <SolanaProvider>
            {children}
          </SolanaProvider>
        </Providers>
      </body>
    </html>
  );
}  