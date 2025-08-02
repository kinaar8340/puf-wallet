import Providers from './Providers';

export const metadata = {
  title: 'Puf Wallet',
  description: 'Vape data and voting app',
  icons: {
    icon: '/favicon.ico', // If using
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}