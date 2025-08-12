import { Providers } from './Providers';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark"> 
      <head>
        <link rel="icon" href="/images/icon0.png" type="image/png" />
      </head>
      <body className="font-sans min-h-screen relative bg-[url('/images/bg1.png')] bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
        <main className="relative z-10">
          <Providers>
            {children}
          </Providers>
        </main>
      </body>
    </html>
  );
} 