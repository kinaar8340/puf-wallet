
'use client'; // Client component for hooks and state

import { supabase } from '../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

// Solana Devnet connection (switch to 'https://api.mainnet-beta.solana.com' later)
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// $PUF token mint address (use your Devnet test mint; switch to mainnet '3RoiaUKQDEED6Uc8Diz6aJ7TVwwe8H15fbrJEYTJbonk' later)
const TOKEN_MINT = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ');

const voteStrains = [
  { value: 'Cartridge 1', label: 'Cartridge 1' },
  { value: 'Cartridge 2', label: 'Cartridge 2' },
  { value: 'Cartridge 3', label: 'Cartridge 3' },
  { value: 'Cartridge 4', label: 'Cartridge 4' },
  { value: 'Cartridge', label: 'Cartridge 5' },
];

export default function Home() {
  useEffect(() => {
    fetch('/api/env')
      .then(res => res.json())
      .then(data => console.log('From server API:', data.supabaseUrl))
      .catch(err => console.error('API error:', err));
  }, []);

  const { publicKey } = useWallet(); // No signTransaction needed with API approach
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');

  // Form states for upload
  const [strain, setStrain] = useState('');
  const [type, setType] = useState('');
  const [thc, setThc] = useState('');
  const [terpenes, setTerpenes] = useState('');

  // State for votes
  const [votes, setVotes] = useState(
    voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: '' }), {})
  );

  // Add states for history
  const [userUploads, setUserUploads] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState({});

  useEffect(() => {
    if (publicKey) {
      supabase.from('uploads').select('*').eq('user_pubkey', publicKey.toBase58()).then(({ data, error }) => {
        if (error) console.error('Uploads fetch error:', error);
        setUserUploads(data || []);
      });
      supabase.from('votes').select('*').eq('user_pubkey', publicKey.toBase58()).then(({ data, error }) => {
        if (error) console.error('Votes fetch error:', error);
        setUserVotes(data || []);
      });
      // Fetch balance
      const ata = getAssociatedTokenAddressSync(TOKEN_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      connection.getTokenAccountBalance(ata).then((res) => {
        setBalance(res.value.uiAmountString);
      }).catch(() => setBalance('0'));
    }
    // Fetch all votes for total aggregation
    supabase.from('votes').select('*').then(({ data, error }) => {
      if (error) console.error('Total votes fetch error:', error);
      const agg = (data || []).reduce((acc, v) => {
        acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
        return acc;
      }, {});
      setTotalVotes(agg);
    });
  }, [publicKey]);

  // Function to claim rewards (calls server API for transfer)
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

      // Refresh balance
      const ata = getAssociatedTokenAddressSync(TOKEN_MINT, recipient, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      connection.getTokenAccountBalance(ata).then((res) => {
        setBalance(res.value.uiAmountString);
      }).catch(() => setBalance('0'));
    } catch (error) {
      console.error('Reward Claim Error:', error);
      toast.error('Failed to claim rewards: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!publicKey) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from('uploads').insert([
        {
          user_pubkey: publicKey.toBase58(),
          strain,
          type,
          thc: parseFloat(thc),
          terpenes: parseFloat(terpenes),
        }
      ]);
      if (error) throw error;

      console.log('Uploaded Data:', { strain, type, thc, terpenes });
      await claimRewards(publicKey);
      toast.success('Data uploaded successfully!');
      setStrain(''); setType(''); setThc(''); setTerpenes('');
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error('Failed to upload data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVoteChange = (strain, value) => {
    const numValue = Number(value);
    if (numValue >= 1 && numValue <= 10) {
      setVotes(prev => ({ ...prev, [strain]: numValue }));
    } else if (value === '') {
      setVotes(prev => ({ ...prev, [strain]: 0 }));
    }
  };

  const handleVoteSubmit = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const voteEntries = Object.entries(votes).filter(([_, amount]) => amount > 0);
      if (voteEntries.length === 0) {
        toast.error('No votes entered');
        return;
      }

      for (const [strain, vote_amount] of voteEntries) {
        const { data, error } = await supabase.from('votes').insert([
          {
            user_pubkey: publicKey.toBase58(),
            strain,
            vote_amount,
          }
        ]);
        if (error) throw error;
        console.log('Vote Submitted for', strain, ':', { vote_amount });
      }

      await claimRewards(publicKey);
      toast.success('Votes submitted successfully!');
      setVotes(voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: '' }), {}));
      // Refresh total votes
      supabase.from('votes').select('*').then(({ data, error }) => {
        if (error) console.error('Total votes refresh error:', error);
        const agg = (data || []).reduce((acc, v) => {
          acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
          return acc;
        }, {});
        setTotalVotes(agg);
      });
    } catch (err) {
      console.error('Vote Error:', JSON.stringify(err, null, 2));
      toast.error('Failed to submit votes: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Aggregate votes by strain (user-specific)
  const aggregatedVotes = userVotes.reduce((acc, v) => {
    acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
    return acc;
  }, {});

  // Aggregate uploads by strain
  const aggregatedUploads = userUploads.reduce((acc, u) => {
    if (!acc[u.strain]) {
      acc[u.strain] = { 
        type: u.type,
        sum_thc: 0,
        sum_terpenes: 0,
        count: 0 
      };
    }
    acc[u.strain].type = u.type; // last type
    acc[u.strain].sum_thc += u.thc;
    acc[u.strain].sum_terpenes += u.terpenes;
    acc[u.strain].count += 1;
    return acc;
  }, {});

  return (
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 text-2xl text-black dark:text-[#22f703] bg-white dark:bg-black relative">
      <main className="flex flex-col gap-[48px] row-start-4 items-center w-full max-w-2xl mx-auto">
        <img src="/images/logo1.png" alt="PUF Wallet Logo" className="w-128 h-128 object-contain" />
        {publicKey && <p className="text-xl dark:text-[#22f703]">$PUF Balance: {balance}</p>}

        <div className="flex flex-col items-center gap-8 w-full">
          <WalletMultiButton className="bg-blue-500 dark:bg-gray-800 hover:bg-blue-600 dark:hover:bg-gray-600 text-white dark:text-[#22f703] font-bold py-6 px-10 rounded w-full text-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-gray-800 dark:to-gray-900" />
          {publicKey && <p className="text-xl text-gray-600 dark:text-[#22f703]">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
        </div>

        {publicKey ? (
          <>
            <div className="w-full bg-white dark:bg-gray-900 p-10 rounded-lg shadow-md shadow-green-500/50">
              <h2 className="text-5xl font-semibold mb-8 text-black dark:text-[#22f703] text-center">Upload Vape Data</h2>
              <form onSubmit={handleUpload} className="flex flex-col gap-10">
                <table className="w-full table-auto mx-auto">
                  <thead>
                    <tr>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Field</th>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">Strain Name</td>
                      <td className="pb-4">
                        <input type="text" placeholder="Strain Name" value={strain} onChange={(e) => setStrain(e.target.value)} className="p-8 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-[#22f703] text-2xl border border-green-500 w-full h-56" required />
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">Type</td>
                      <td className="pb-4">
                        <select value={type} onChange={(e) => setType(e.target.value)} className="p-8 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-[#22f703] text-2xl border border-green-500 w-full h-56" required>
                          <option value="">Select Type</option>
                          <option value="Sativa">Sativa</option>
                          <option value="Indica">Indica</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">THC (%)</td>
                      <td className="pb-4">
                        <input type="number" step="0.1" placeholder="THC (%)" value={thc} onChange={(e) => setThc(e.target.value)} className="p-8 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-[#22f703] text-2xl border border-green-500 w-full h-56" required />
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">Terpenes (%)</td>
                      <td className="pb-4">
                        <input type="number" step="0.1" placeholder="Terpenes (%)" value={terpenes} onChange={(e) => setTerpenes(e.target.value)} className="p-8 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-[#22f703] text-2xl border border-green-500 w-full h-56" required />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button type="submit" disabled={loading} className="bg-green-500 dark:bg-gray-800 hover:bg-green-600 dark:hover:bg-gray-600 text-white dark:text-[#22f703] font-bold py-6 px-10 rounded text-2xl border border-green-500 hover:shadow-green-500/50 bg-gradient-to-br from-green-500 to-green-600 dark:from-gray-800 dark:to-gray-900 mx-auto">
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            </div>

            <div className="w-full bg-white dark:bg-gray-900 p-10 rounded-lg shadow-md shadow-green-500/50">
              <h2 className="text-5xl font-semibold mb-8 text-black dark:text-[#22f703] text-center">Vote on Strains</h2>
              <table className="w-full table-auto mx-auto">
                <thead>
                  <tr>
                    <th className="text-center pb-4 text-black dark:text-[#22f703]">Strain</th>
                    <th className="text-center pb-4 text-black dark:text-[#22f703]">Vote (1-10)</th>
                  </tr>
                </thead>
                <tbody>
                  {voteStrains.map(s => (
                    <tr key={s.value}>
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{s.label}</td>
                      <td className="pb-4">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={votes[s.value] || ''}
                          onChange={(e) => handleVoteChange(s.value, e.target.value)}
                          className="p-8 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-[#22f703] text-2xl border border-green-500 w-full h-56"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={handleVoteSubmit} disabled={loading} className="bg-purple-500 dark:bg-gray-800 hover:bg-purple-600 dark:hover:bg-gray-600 text-white dark:text-[#22f703] font-bold py-6 px-10 rounded w-full text-2xl border border-green-500 hover:shadow-green-500/50 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-gray-800 dark:to-gray-900 mx-auto mt-8">
                {loading ? 'Claiming...' : 'Submit Votes & Claim $PUF'}
              </button>
            </div>

            {/* History Dashboard */}
            {publicKey && (
              <div className="w-full bg-white dark:bg-gray-900 p-10 rounded-lg shadow-md shadow-green-500/50 mt-8">
                <h2 className="text-5xl font-semibold mb-8 text-black dark:text-[#22f703] text-center">Your History</h2>
                <h3 className="text-3xl mb-4 text-black dark:text-[#22f703]">Uploads</h3>
                <table className="w-full table-auto mx-auto">
                  <thead>
                    <tr>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Strain Name</th>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Type</th>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">THC (%)</th>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Terpenes (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(aggregatedUploads).map(([strain, info], i) => (
                      <tr key={i}>
                        <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{strain}</td>
                        <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{info.type}</td>
                        <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{(info.sum_thc / info.count).toFixed(1)}%</td>
                        <td className="pb-4 text-black dark:text-[#22f703] text-center">{(info.sum_terpenes / info.count).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(aggregatedUploads).length === 0 && <p className="text-center text-gray-600 dark:text-[#22f703] text-xl">No uploads yet.</p>}
              </div>
            )}

            {/* Total Votes Across All Users */}
            <div className="w-full bg-white dark:bg-gray-900 p-10 rounded-lg shadow-md shadow-green-500/50 mt-8">
              <h2 className="text-5xl font-semibold mb-8 text-black dark:text-[#22f703] text-center">Total Votes Across All Users</h2>
              <table className="w-full table-auto mx-auto">
                <thead>
                  <tr>
                    <th className="text-center pb-4 text-black dark:text-[#22f703]">Strain</th>
                    <th className="text-center pb-4 text-black dark:text-[#22f703]">Total Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {voteStrains.map(s => (
                    <tr key={s.value}>
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{s.label}</td>
                      <td className="pb-4 text-black dark:text-[#22f703] text-center">{totalVotes[s.value] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600 dark:text-[#22f703] text-2xl">Connect your wallet to upload data and vote!</p>
        )}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        {/* Footer if needed */}
      </footer>
      <ToastContainer theme="dark" />
    </div>
  ); 
}
```
