// /puf-wallet-frontend/src/app/page.js 

'use client'; // Client component for hooks and state

import { supabase } from '../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

// Solana Devnet connection (switch to 'https://api.mainnet-beta.solana.com' later)
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// $PUF token mint address (use your Devnet test mint; switch to mainnet '3RoiaUKQDEED6Uc8Diz6aJ7TVwwe8H15fbrJEYTJbonk' later)
const TOKEN_MINT = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ');

const voteStrains = [
  { value: 'Item1', label: 'Item1' },
  { value: 'Item2', label: 'Item2' },
  { value: 'Item3', label: 'Item3' },
  { value: 'Item4', label: 'Item4' },
  { value: 'Item5', label: 'Item5' },
];

const openFlights = [5];
const closedFlights = [1];

export default function Home() {
  useEffect(() => {
    fetch('/api/env')
      .then(res => res.json())
      .then(data => console.log('From server API:', data.supabaseUrl))
      .catch(err => console.error('API error:', err));
  }, []);

  const { publicKey } = useWallet();
  const router = useRouter();
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
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-10 gap-8 sm:p-10 text-xl text-[#00ff00] bg-transparent relative">
      <main className="flex flex-col gap-[24px] row-start-2 items-center justify-center w-full max-w-2xl mx-auto">
        <div className="w-full bg-black/75 p-8 rounded border-4 border-black flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-8">
            <img src="/images/logo0.png" alt="PUF Wallet Logo" className="w-64 h-64 object-contain" />
            <div className="flex flex-col items-end gap-4">
              <WalletMultiButton className="bg-blue-500/70 hover:bg-blue-600/70 font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70" />
              {publicKey && <p className="text-lg font-bold">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
            </div>
          </div>
          <p className="text-2xl font-bold text-center">$PUF Balance: {Number(balance).toFixed(2)}</p>
        </div>

        {publicKey ? (
          <>
            <div className="w-full flex justify-center gap-4 mb-4">
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

            <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50 text-[#00ff00]">
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
          </>
        ) : (
          <p className="text-center font-bold text-xl">Connect your wallet to upload data and vote!</p>
        )}
      </main>
      <footer className="row-start-3 flex gap-[12px] flex-wrap items-center justify-center">
        {/* Footer if needed */}
      </footer>
      <ToastContainer theme="dark" />
    </div>
  ); 
}