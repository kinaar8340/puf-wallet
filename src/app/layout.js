/* ~/puf-wallet-frontend/src/app/layout.js */

'use client';

import { useMemo } from 'react';  // Keep if needed elsewhere, but unused here now
import './globals.css';  // Import global styles including Tailwind

import { Providers } from './Providers';  // Fixed import: relative path and named export

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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