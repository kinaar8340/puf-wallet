// /puf-wallet-frontend/src/app/minimal/page.jsx

'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');

const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

export default function Minimal() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState('0');

  useEffect(() => {
    if (publicKey) {
      // Fetch balance
      (async () => {
        try {
          const ata = await getAssociatedTokenAddress(TOKEN_MINT, publicKey);
          const res = await connection.getTokenAccountBalance(ata);
          setBalance(res.value.uiAmountString);
        } catch {
          setBalance('0');
        }
      })();
    }
  }, [publicKey]);

  return (
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[1fr_20px] items-start justify-items-center min-h-screen px-4 pb-4 gap-8 sm:px-10 sm:pb-10 text-xl text-[#00ff00] bg-transparent relative">
      <main className="flex flex-col row-start-1 items-center justify-center w-full max-w-2xl mx-auto">
        <div className="w-full bg-black/75 rounded border-4 border-black">
          <div className="w-full bg-black/75 p-8 flex justify-between items-center">
            <img src="/images/icon2.png" alt="PUF Wallet Logo" className="w-16 h-16 object-contain" />
            <div className="flex flex-col items-end gap-4">
              <WalletMultiButton className="bg-blue-500/70 hover:bg-blue-600/70 font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70" />
              {publicKey && <p className="text-lg font-bold">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
            </div>
          </div>
          <div className="w-full bg-black/75 p-5 rounded-b-lg shadow-md shadow-green-500/50 text-[#00ff00]">
            <div className="w-full flex justify-center gap-4 mb-4">
              <Link href="/results">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500">
                  Results
                </button>
              </Link>
              <Link href="/vote">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500">
                  Vote
                </button>
              </Link>
              <Link href="/upload">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500">
                  Upload
                </button>
              </Link>
              <Link href="/history">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500">
                  History
                </button>
              </Link>
            </div>
            <p className="text-2xl font-bold text-center">$PUF Balance: {Number(balance).toFixed(2)}</p>
          </div>
        </div>
      </main>
    </div>
  );
}