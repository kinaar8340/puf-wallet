/* ~/puf-wallet-frontend/src/app/layout.js */

'use client';

import './globals.css';
import { useMemo } from 'react';
import { Providers } from './Providers'; 
import "tailwindcss"; 

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