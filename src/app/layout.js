// ~/puf-wallet-frontend/src/app/layout.js

import { Providers } from './Providers';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/images/icon0.png" type="image/png"/>
      </head>
      <body>
        <Providers>
            {children}
        </Providers>
      </body>
    </html>
  );
}