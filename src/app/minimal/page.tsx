/* ~/puf-wallet-frontend/src/app/minimal/page.tsx */

'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');

export default function Minimal() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [balance, setBalance] = useState<string>('0');
  const [buttonLabel, setButtonLabel] = useState<string>('Connect');

  useEffect(() => {
    if (publicKey) {
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

  useEffect(() => {
    if (connected && publicKey) {
      setButtonLabel(`${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`);
    } else {
      setButtonLabel('Connect');
    }
  }, [connected, publicKey]);

  const handleWalletClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  return (
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[1fr_20px] items-start justify-items-center min-h-screen px-4 pb-4 gap-8 sm:px-10 sm:pb-10 text-xl text-[#00ff00] bg-transparent relative">
      <main className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-1 sm:p-10 pt-64">  
        {/* Fixed header - limited height with h-auto */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-1/3 h-auto rounded-lg shadow-md shadow-green-500/50 bg-black/70 z-10 p-4">  
          {/* Header section */}
          <div className="w-full p-5 flex justify-center items-center">
            <button
              onClick={handleWalletClick}
              className="font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70 hover:bg-blue-600/70 text-[#00ff00] shadow-md shadow-green-500/50"
            >
              {buttonLabel}
            </button>
          </div>
          <div className="w-full p-5 flex justify-between items-center">
            <img src="/images/icon0.png" alt="PUF Wallet" className="w-32 h-32 object-contain object-center" />
            <p className="bg-black/10 text-lg font-bold text-center mx-auto text-[#00ff00]">$PUF: {Number(balance).toFixed(2)}</p>
          </div>
          <div className="w-full bg-black/10 p-5 rounded-b-lg shadow-md shadow-green-500/50 text-[#00ff00]">
            <div className="w-full flex justify-center gap-4 mb-4">
              <Link href="/results">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Results
                </button>
              </Link>
              <Link href="/vote">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Vote
                </button>
              </Link>
              <Link href="/upload">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Upload
                </button>
              </Link>
              <Link href="/history">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  History
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Test content to confirm visibility - remove once fixed */}
        <h1 className="text-3xl font-bold mt-8">Welcome to PUF Wallet</h1>
        <p className="text-lg">This content should now be visible below the header. Balance: {balance}</p>
      </main>
    </div>
  );
}