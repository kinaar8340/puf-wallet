/* ~/puf-wallet-frontend/src/app/layout.js */

'use client';

import { useMemo } from 'react';
import './globals.css'; 

import { Providers } from './Providers';  

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