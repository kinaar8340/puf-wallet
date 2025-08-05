import './globals.css'; // Your global styles

export const metadata = {
  title: 'PUF Wallet', // Tab title
  description: 'Vote and upload vape data for PUF Wallet',
  icons: {
    icon: '/images/logo2.png', // Favicon path (ensure file exists in /public/images/)
  },
};

import Providers from './Providers'; // Import your client wrapper

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers> {/* Wrap with client providers */}
      </body>
    </html>
  );
}