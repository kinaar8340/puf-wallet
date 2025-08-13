// ~/puf-wallet-frontend/src/app/vote/page.jsx 

'use client';

import { supabase } from '../../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const splToken = require('@solana/spl-token');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

// Current flight
const CURRENT_FLIGHT = 10;

const voteStrains = [
  { value: 'Item1', label: 'Item1' },
  { value: 'Item2', label: 'Item2' },
  { value: 'Item3', label: 'Item3' },
  { value: 'Item4', label: 'Item4' },
  { value: 'Item5', label: 'Item5' },
];

export default function Vote() {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [votes, setVotes] = useState(
    voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: 0 }), {})
  );
  const [userVotes, setUserVotes] = useState([]);

  useEffect(() => {
    if (publicKey) {
      supabase.from('votes').select('*').eq('user_pubkey', publicKey.toBase58()).eq('flight', CURRENT_FLIGHT).then(({ data, error }) => {
        if (error) console.error('Votes fetch error:', error);
        setUserVotes(data || []);
      });
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

  const claimRewards = useCallback(async (recipient) => {
    if (!recipient) return;

    setLoading(true);
    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: recipient.toBase58() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim');
      }

      toast.success(`Rewards claimed! Tx: ${data.signature}`);
      try {
        const ata = await getAssociatedTokenAddress(TOKEN_MINT, recipient);
        const res = await connection.getTokenAccountBalance(ata);
        setBalance(res.value.uiAmountString);
      } catch {
        setBalance('0');
      }
    } catch (error) {
      console.error('Reward Claim Error:', error);
      toast.error('Failed to claim rewards: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const getBackgroundColor = (value) => {
    if (value === 0) return 'transparent';
    const hue = 120 * (1 - (value - 1) / 9);
    return `hsl(${hue}, 100%, 50%)`;
  };

  const handleVoteChange = (strain, value) => {
    const numValue = Number(value);
    if (numValue >= 0 && numValue <= 10) {
      setVotes(prev => ({ ...prev, [strain]: numValue }));
    }
  };

  const handleVoteSubmit = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const { data: existingVotes, error: checkError } = await supabase.from('votes').select('id').eq('user_pubkey', publicKey.toBase58()).eq('flight', CURRENT_FLIGHT).limit(1);
      if (checkError) throw checkError;
      if (existingVotes.length > 0) {
        toast.error('You have already voted and claimed in this flight');
        return;
      }

      const voteEntries = Object.entries(votes).filter(([_, amount]) => amount > 0);
      if (voteEntries.length === 0) {
        toast.error('No votes entered');
        return;
      }

      for (const [strain, vote_amount] of voteEntries) {
        const { data, error } = await supabase.from('votes').insert([
          { user_pubkey: publicKey.toBase58(), strain, vote_amount, flight: CURRENT_FLIGHT },
        ]);
        if (error) throw error;
        console.log('Vote Submitted for', strain, ':', { vote_amount });
      }

      await claimRewards(publicKey);
      toast.success('Votes submitted successfully!');
      setVotes(voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: 0 }), {}));
    } catch (err) {
      console.error('Vote Error:', JSON.stringify(err, null, 2));
      toast.error('Failed to submit votes: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSliders = () => {
    setVotes(voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: 0 }), {}));
  };

return (
  <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[1fr_20px] items-start justify-items-center min-h-screen px-4 pb-4 gap-8 sm:px-10 sm:pb-10 text-xl text-[#00ff00] bg-transparent relative">
    <main className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-1 sm:p-10">
      {/* Combined container for header and controls on the same background */}
      <div className="w-full rounded-lg shadow-md shadow-green-500/50 mt-8 bg-black/50">
        {/* Header section */}
        <div className="w-full p-5 flex items-center">
          <WalletMultiButton className="font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70 hover:bg-blue-600/70" />
          {publicKey && <p className="text-lg font-bold text-center mx-auto text-[#00ff00]">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
        </div>
        <div className="w-full p-5 flex justify-between items-center">
          <img src="/images/icon0.png" alt="PUF Wallet" className="w-32 h-32 object-contain object-center" />
          <p className="bg-black/10 text-lg font-bold text-center mx-auto text-[#00ff00]">$PUF: {Number(balance).toFixed(2)}</p>
          <div className="flex flex-col items-end gap-4"></div>
        </div>
          <div className="w-full bg-black/10 p-5 rounded-b-lg shadow-md shadow-green-500/50 text-[#00ff00]">
            <p></p>
            <div className="w-full flex justify-center gap-4 mb-4">
              <Link href="/results">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Results
                </button>
              </Link>
              <Link href="/minimal">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Back 
                </button>
              </Link>
                <button onClick={handleResetSliders} className="text-xl font-bold py-3 px-5 rounded border border-green-500 bg-gray-800/50 hover:bg-gray-700/50 text-[#00ff00]">
                  Reset Sliders
                </button>
                <button onClick={handleVoteSubmit} disabled={loading} className="text-xl font-bold py-3 px-5 rounded border border-green-500 bg-gray-800/50 hover:bg-gray-700/50 text-[#00ff00]">
                  Submit Vote
                </button>
            </div>
            <p></p>
          </div>
        </div>

      {/* Vote docket section in its own container below */}
      <div className="w-full p-3 rounded-lg shadow-md shadow-green-500/50 mt-8 bg-black/50">
        <h2 className="text-4xl font-bold mb-4 text-center text-[#00ff00]">Vote Docket</h2>
        <table className="w-full table-auto mx-auto text-center border-collapse border border-black">
          <tbody>
            {voteStrains.map(s => {
              const value = votes[s.value];
              const color = getBackgroundColor(value);
              return (
                <tr key={s.value}>
                  <td className="pb-2">
                    <div className="flex items-center justify-center">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={value}
                        onChange={(e) => handleVoteChange(s.value, e.target.value)}
                        className="slider w-3/4"
                      />
                      <span 
                        className="ml-2 p-2 rounded font-bold text-xl border-4 border-black min-w-[80px] text-center text-white"
                        style={{ backgroundColor: color }}
                      >
                        {value > 0 ? value : ''}
                      </span>
                    </div>
                    <p className="text-center mt-2 font-bold text-[#00ff00]">{s.label}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
    <ToastContainer theme="colored" />
  </div>
);
}