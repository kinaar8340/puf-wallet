// /puf-wallet-frontend/src/app/minimal/page.jsx 

'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const splToken = require('@solana/spl-token');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
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
  <div className="relative">
    <main className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-1 sm:p-10">
      {/* Combined container for header and controls on the same background */}
      <div className="w-full rounded-lg shadow-md shadow-green-500/50 mt-8 bg-black/50">
        {/* Header section */}
        <div className="w-full p-4 flex justify-between items-center">
          <img src="/images/icon0.png" alt="PUF Wallet Logo" className="w-32 h-32 object-contain object-top object-left" />
          <div className="flex flex-col items-end gap-4">
            <WalletMultiButton className="font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70 hover:bg-blue-600/70" />
            {publicKey && <p className="text-lg font-bold text-[#00ff00]">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
          </div>
        </div>
          <div className="w-full bg-black/75 p-5 rounded-b-lg shadow-md shadow-green-500/50 text-[#00ff00]">
            <div className="w-full flex justify-center gap-4 mb-4">
              <Link href="/results">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500">
                  Results
                </button>
              </Link>
              <Link href="/vote">
                <button className="bg-gray-800 hover:bg-gray-700 shadow-md shadow-green-500/50 text-[#00ff00] font-bold py-3 px-5 rounded text-xl rounded-b-lg shadow-md shadow-green-500/50 border-b border-r border-green-500">
                  Vote
                </button>
              </Link>
              <Link href="/upload">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500">
                  Upload
                </button>
              </Link>
              <Link href="/history">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500">
                  History
                </button>
              </Link>
            </div>
            <p className="text-2xl text-center text-[#333333] bg-[#00ff00] w-1/2 mx-auto">$PUF: {Number(balance).toFixed(2)}</p>
          </div>
        </div>
      </main>
    </div>
  );
} //eof 