// Reverted to original web/Next.js version for Vercel build
// Removed RN imports/styles, restored metadata if any (assume none from adapted), and Slot not needed in web

import '../app/globals.css';  
import Providers from './Providers';  // Your context/providers
import SolanaProvider from '../components/SolanaProvider';  // If used

// Original metadata (add if your web had it; e.g., for Next.js SEO)
export const metadata = {
  title: 'PUF Wallet',
  description: 'This project aims to reflects real-time consumer preference.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/logo2.png" type="image/png" />
      </head>
      <body className="dark">
        <Providers>
          <SolanaProvider>
            {children}
          </SolanaProvider>
        </Providers>
      </body>
    </html>
  );
}