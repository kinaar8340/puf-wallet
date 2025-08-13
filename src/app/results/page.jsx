// /puf-wallet-frontend/src/app/results/page.jsx

'use client';

import { supabase } from '../../lib/supabase';
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

const voteStrains = [
  { value: 'Item1', label: 'Item1' },
  { value: 'Item2', label: 'Item2' },
  { value: 'Item3', label: 'Item3' },
  { value: 'Item4', label: 'Item4' },
  { value: 'Item5', label: 'Item5' },
];

const openFlights = [8,9,10,11];
const closedFlights = [4,5,6,7];

export default function Results() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState('0');
  const [allVotes, setAllVotes] = useState({});

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
    // Fetch all votes for aggregation
    supabase.from('votes').select('*').then(({ data, error }) => {
      if (error) console.error('Total votes refresh error:', error);
      const agg = (data || []).reduce((acc, v) => {
        if (!acc[v.flight]) acc[v.flight] = {};
        acc[v.flight][v.strain] = (acc[v.flight][v.strain] || 0) + v.vote_amount;
        return acc;
      }, {});
      setAllVotes(agg);
    });
  }, [publicKey]);

return (
  <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[1fr_20px] items-start justify-items-center min-h-screen px-4 pb-4 gap-8 sm:px-10 sm:pb-10 text-xl text-[#00ff00] bg-transparent relative">
    <main className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-1 sm:p-10">
      {/* Combined container for header and controls on the same background */}
      <div className="fixed top-0 w-1/2 justify-left rounded-lg shadow-md shadow-green-500/50 bg-black/50 z-10"> {/* Changed to w-full for full-width dashboard */}
        {/* Header section */}
        <div className="w-full p-5 flex justify-top items-center">
          <WalletMultiButton className="font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70 hover:bg-blue-600/70" />
          {publicKey && <p className="text-lg font-bold text-center mx-auto text-[#00ff00]">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
        </div>
        <div className="w-full p-5 flex justify-between items-center">
          <img src="/images/icon0.png" alt="PUF Wallet" className="w-32 h-32 object-contain object-center" />
          <p className="bg-black/1 text-lg font-bold text-center mx-auto text-[#00ff00]">$PUF: {Number(balance).toFixed(2)}</p>
          <div className="flex flex-col items-end gap-4"></div>
        </div>
        <div className="w-full bg-black/1 p-5 rounded-b-lg shadow-md shadow-green-500/50 text-[#00ff00]">
          <p></p>
          <div className="w-full flex justify-center gap-4 mb-4">
            <Link href="/minimal">
              <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                Back
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
          <p></p>
        </div>
      </div>

      <div className="fixed top-0 w-1/2 justify-right rounded-lg shadow-md shadow-green-500/50 bg-black/50 z-10">
        <h2 className="text-4xl font-bold mb-4 text-center">Voting Results</h2>
        <p className="text-lg font-bold text-[#ffffff] text-center mb-2">Flight Status: Open</p>
        <table className="w-full table-auto mx-auto text-center border-b border-r border-green-500 shadow-md shadow-green-500/50 border-collapse">
          <thead>
            <tr>
              <th className="border px-4 py-2 ">Flight</th>
              {voteStrains.map(s => (
                <th key={s.value} className="border px-4 py-2">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {openFlights.map(flight => (
              <tr key={flight}>
                <td className="border px-4 py-2">{flight}</td>
                {voteStrains.map(s => (
                  <td key={s.value} className="border px-4 py-2">{allVotes[flight]?.[s.value] || 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-lg font-bold text-center my-4 text-red-500">Flight Status: Closed</p>
        <table className="w-full table-auto mx-auto text-center border-collapse">
          <thead>
            <tr>
              <th className="border px-4 py-2">Flight</th>
              {voteStrains.map(s => (
                <th key={s.value} className="border px-4 py-2">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {closedFlights.map(flight => (
              <tr key={flight}>
                <td className="border px-4 py-2">{flight}</td>
                {voteStrains.map(s => (
                  <td key={s.value} className="border px-4 py-2">{allVotes[flight]?.[s.value] || 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  </div>
);
} 