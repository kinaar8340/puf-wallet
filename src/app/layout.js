// ~/puf-wallet-frontend/src/app/layout.js

import { Providers } from './Providers';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}