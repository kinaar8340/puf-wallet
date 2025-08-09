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

// Current flight (updated to 3 as requested)
const CURRENT_FLIGHT = 4;

// New variable for flight status (0 = Closed, 1 = Open)
const FLIGHT_STATUS = 1; // Set to 1 for Open; change to 0 for Closed

const voteStrains = [
  { value: 'Item 1', label: 'Item 1' },
  { value: 'Item 2', label: 'Item 2' },
  { value: 'Item 3', label: 'Item 3' },
  { value: 'Item 4', label: 'Item 4' },
  { value: 'Item 5', label: 'Item 5' },
];

export default function Home() {
  useEffect(() => {
    fetch('/api/env')
      .then(res => res.json())
      .then(data => console.log('From server API:', data.supabaseUrl))
      .catch(err => console.error('API error:', err));
  }, []);

  const { publicKey } = useWallet(); // No signTransaction needed with API approach
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');

  // State for votes
  const [votes, setVotes] = useState(
    voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: 0 }), {})
  );

  // State for history
  const [strains, setStrains] = useState([]);
  const [aggregatedUploads, setAggregatedUploads] = useState({});
  const [aggregatedDetails, setAggregatedDetails] = useState({});
  const [userVotes, setUserVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState({});

  const fetchHistory = useCallback(async () => {
    if (!publicKey) return;

    const { data: uploadsData, error: uploadsError } = await supabase.from('Uploads').select('*').eq('user_pubkey', publicKey.toBase58());
    if (uploadsError) console.error('Uploads fetch error:', uploadsError);
    const uploads = uploadsData || [];
    const aggUploads = uploads.reduce((acc, u) => {
      if (!acc[u.strain]) {
        acc[u.strain] = { type: u.type, sum_thc: 0, sum_cbd: 0, sum_cbn: 0, sum_cbc: 0, count: 0 };
      }
      acc[u.strain].type = u.type; // Use the last type
      acc[u.strain].sum_thc += u.thc || 0;
      acc[u.strain].sum_cbd += u.cbd || 0;
      acc[u.strain].sum_cbn += u.cbn || 0;
      acc[u.strain].sum_cbc += u.cbc || 0;
      acc[u.strain].count += 1;
      return acc;
    }, {});
    setAggregatedUploads(aggUploads);
    const uniqueFromUploads = Object.keys(aggUploads);

    const { data: detailsData, error: detailsError } = await supabase.from('StrainDetails').select('*').eq('user_pubkey', publicKey.toBase58());
    if (detailsError) console.error('StrainDetails fetch error:', detailsError);
    const details = detailsData || [];
    const aggDetails = details.reduce((acc, d) => {
      acc[d.strain] = { type: d.type, grower: d.grower };
      return acc;
    }, {});
    setAggregatedDetails(aggDetails);
    const uniqueFromDetails = Object.keys(aggDetails);

    setStrains([...new Set([...uniqueFromUploads, ...uniqueFromDetails])]);
  }, [publicKey]);

  useEffect(() => {
    fetchHistory();
    if (publicKey) {
      // Fetch user votes for current flight
      supabase.from('votes').select('*').eq('user_pubkey', publicKey.toBase58()).eq('flight', CURRENT_FLIGHT).then(({ data, error }) => {
        if (error) console.error('Votes fetch error:', error);
        setUserVotes(data || []);
      });
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
    // Fetch all votes for total aggregation (per current flight)
    supabase.from('votes').select('*').eq('flight', CURRENT_FLIGHT).then(({ data, error }) => {
      if (error) console.error('Total votes refresh error:', error);
      const agg = (data || []).reduce((acc, v) => {
        acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
        return acc;
      }, {});
      setTotalVotes(agg);
    });
  }, [publicKey, fetchHistory]);

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
      try {
        const ata = await getAssociatedTokenAddress(TOKEN_MINT, recipient, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
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
      // Check if user has already voted in this flight
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
          {
            user_pubkey: publicKey.toBase58(),
            strain,
            vote_amount,
            flight: CURRENT_FLIGHT, // Add flight to vote
          }
        ]);
        if (error) throw error;
        console.log('Vote Submitted for', strain, ':', { vote_amount });
      }

      await claimRewards(publicKey);
      toast.success('Votes submitted successfully!');
      setVotes(voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: 0 }), {}));
      // Refresh total votes (per flight)
      supabase.from('votes').select('*').eq('flight', CURRENT_FLIGHT).then(({ data, error }) => {
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

  // Aggregate votes by strain (user-specific, per flight)
  const aggregatedVotes = userVotes.reduce((acc, v) => {
    acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
    return acc;
  }, {});

  const handleAddStrain = () => {
    const strainName = window.prompt('Enter the new strain name:');
    if (strainName && strainName.trim()) {
      router.push(`/strain/${encodeURIComponent(strainName.trim())}`);
    }
  };

  return (
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-10 gap-8 sm:p-10 text-xl text-[#00ff00] bg-transparent relative">
      <main className="flex flex-col gap-[24px] row-start-2 items-center justify-center w-full max-w-2xl mx-auto">
        <div className="w-full bg-black/75 p-8 rounded border-4 border-black flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-8">
            <img src="/images/logo0.png" alt="PUF Wallet Logo" className="w-48 h-48 object-contain" />
            <div className="flex flex-col items-end gap-4">
              <WalletMultiButton className="bg-blue-500/70 hover:bg-blue-600/70 font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70" />
              {publicKey && <p className="text-lg font-bold">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
            </div>
          </div>
          <p className="text-2xl font-bold text-center">$PUF Balance: {Number(balance).toFixed(2)}</p>
        </div>

        {publicKey ? (
          <>
            <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50 text-[#00ff00]">
              <h2 className="text-4xl font-bold mb-4 text-center">Voting Results</h2>
              <p className="text-lg font-bold text-center mb-2">|  Flight: {CURRENT_FLIGHT}  |    |  Status: {FLIGHT_STATUS === 1 ? 'Open' : 'Closed'}  |</p>
              <table className="w-full table-auto mx-auto text-center">
                <thead>
                  <tr>
                    <th className="text-center pb-2 font-bold underline">Docket</th>
                    <th className="text-center pb-2 font-bold underline">Total Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {voteStrains.map(s => (
                    <tr key={s.value}>
                      <td className="pr-2 pb-2 font-bold text-center">{s.label}</td>
                      <td className="pb-2 font-bold text-center">{totalVotes[s.value] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* History Dashboard */}
            {publicKey && (
              <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50 mt-4 text-[#00ff00]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-4xl font-bold text-[#00ff00]">Your History</h2>
                  <button
                    onClick={handleAddStrain}
                    className="bg-green-500/70 hover:bg-green-600/70 text-[#00ff00] font-bold py-2 px-4 rounded text-xl"
                  >
                    Add Strain
                  </button>
                </div>
                <table className="w-full table-auto mx-auto text-center">
                  <thead>
                    <tr>
                      <th className="text-center pb-2 font-bold underline">Strain Name</th>
                      <th className="text-center pb-2 font-bold underline">Type</th>
                      <th className="text-center pb-2 font-bold underline">THC</th>
                      <th className="text-center pb-2 font-bold underline">CBD</th>
                      <th className="text-center pb-2 font-bold underline">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strains.map((strain) => {
                      const infoUploads = aggregatedUploads[strain] || { type: null, sum_thc: 0, sum_cbd: 0, count: 0 };
                      const infoDetails = aggregatedDetails[strain] || { type: null };
                      const typeDisplay = infoDetails.type || infoUploads.type || 'N/A';
                      const hasUploadData = !!aggregatedUploads[strain] && infoUploads.count > 0;
                      const thcDisplay = hasUploadData ? (infoUploads.sum_thc / infoUploads.count).toFixed(1) + '%' : 'N/A';
                      const cbdDisplay = hasUploadData ? (infoUploads.sum_cbd / infoUploads.count).toFixed(1) + '%' : 'N/A';
                      return (
                        <tr key={strain}>
                          <td className="pr-2 pb-2 font-bold text-center">{strain}</td>
                          <td className="pr-2 pb-2 font-bold text-center">{typeDisplay}</td>
                          <td className="pr-2 pb-2 font-bold text-center">{thcDisplay}</td>
                          <td className="pb-2 font-bold text-center">{cbdDisplay}</td>
                          <td className="pb-2 text-center">
                            <Link href={`/strain/${encodeURIComponent(strain)}`}>
                              <button className="bg-blue-500/70 hover:bg-blue-600/70 font-bold py-1 px-2 rounded text-sm">
                                Link
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {strains.length === 0 && <p className="text-center font-bold text-lg">No strains yet.</p>}
              </div>
            )}

            <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50">
              <h2 className="text-4xl font-bold mb-4 text-[#00ff00] text-center">Voting Docket</h2>
              <p className="text-xl text-[#00ff00] font-bold text-center mb-2">Slide between (0-10)</p>
              <table className="w-full table-auto mx-auto text-center">
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
                              className="ml-2 p-4 rounded text-[#00ff00] font-bold text-xl border-4 border-black min-w-[80px] text-center"
                              style={{ backgroundColor: color }}
                            >
                              {value > 0 ? value : ''}
                            </span>
                          </div>
                          <p className="text-center mt-2 font-bold">{s.label}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button onClick={handleVoteSubmit} disabled={loading} className="bg-purple-500/70 hover:bg-purple-600/70 text-[#00ff00] font-bold py-3 px-5 rounded w-full text-xl border border-green-500 hover:shadow-green-500/50 bg-gradient-to-br from-purple-500/70 to-purple-600/70 mx-auto mt-4">
                {loading ? 'Claiming...' : 'Submit Votes'}
              </button>
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