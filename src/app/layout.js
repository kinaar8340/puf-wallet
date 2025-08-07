// Reverted to original web/Next.js version for Vercel build
// Removed RN imports/styles, restored metadata if any (assume none from adapted), and Slot not needed in web

import Providers from './Providers';  // Your context/providers
import SolanaProvider from '../components/SolanaProvider';  // If used

// Original metadata (add if your web had it; e.g., for Next.js SEO)
export const metadata = {
  title: 'PUF Wallet',
  description: 'Your description here',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers> 
          <SolanaProvider>
            {children}  
          </SolanaProvider>
        </Providers>
      </body>
    </html>
  );
}  