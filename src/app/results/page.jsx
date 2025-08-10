
// /puf-wallet-frontend/src/app/results/page.jsx

'use client';

import { supabase } from '../../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import Link from 'next/link';

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

// Solana Devnet connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// $PUF token mint
const TOKEN_MINT = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ');

const voteStrains = [
  { value: 'Item1', label: 'Item1' },
  { value: 'Item2', label: 'Item2' },
  { value: 'Item3', label: 'Item3' },
  { value: 'Item4', label: 'Item4' },
  { value: 'Item5', label: 'Item5' },
];

const openFlights = [5, 6, 7];
const closedFlights = [1, 2, 3, 4];

export default function Results() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState('0');
  const [allVotes, setAllVotes] = useState({});

  useEffect(() => {
    if (publicKey) {
      // Fetch balance
      (async () => {
        try {
          const ata = await getAssociatedTokenAddress(TOKEN_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
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
              <Link href="/minimal">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500">
                  Back
                </button>
              </Link>
            </div>
            <p className="text-2xl font-bold text-center mb-4">$PUF Balance: {Number(balance).toFixed(2)}</p>
          </div>
        </div>

        <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50 text-[#00ff00] mt-8">
          <h2 className="text-4xl font-bold mb-4 text-center">Voting Results</h2>

          <p className="text-lg font-bold text-center mb-2">Flight Status: Open</p>
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