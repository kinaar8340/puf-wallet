
'use client'; // Client component for hooks and state

import { supabase } from '../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Hardcode program IDs to avoid import issues
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });


// Manual u64 LE set for browser compatibility 
function setU64LE(bytes, offset, value) {
  value = BigInt(value);
  for (let i = 0; i < 8; i++) {
    bytes[offset + i] = Number(value & 0xffn);
    value = value >> 8n;
  }
}

// Custom function for getAssociatedTokenAddress (sync version)
function getCustomAssociatedTokenAddress(mint, owner) {
  return PublicKey.findProgramAddressSync(
    [
      owner.toBuffer(),
      TOKEN_2022_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

// Custom function for createAssociatedTokenAccountInstruction
function createCustomAssociatedTokenAccountInstruction(
  payer, // PublicKey
  associatedToken, // PublicKey
  owner, // PublicKey
  mint // PublicKey
) {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

// Custom function for createMintToInstruction
function createCustomMintToInstruction(
  mint, // PublicKey
  destination, // PublicKey
  authority, // PublicKey
  amount // number
) {
  const data = new Uint8Array(9);
  data[0] = 7; // MintTo opcode
  setU64LE(data, 1, amount);
  return new TransactionInstruction({
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_2022_PROGRAM_ID,
    data,
  });
}

// Custom function to get mint decimals
async function getCustomMintDecimals(connection, mintPubkey) {
  const accountInfo = await connection.getAccountInfo(mintPubkey);
  if (!accountInfo) throw new Error('Mint not found');
  if (accountInfo.data.length < 44) throw new Error('Invalid mint size');
  const decimals = accountInfo.data[36];
  return decimals;
}

// Solana Devnet connection (switch to 'https://api.mainnet-beta.solana.com' later)
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// $PUF token mint address (use your Devnet test mint)
const TOKEN_MINT = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ');

const strains = ['Tropican', 'Kazuma', 'BlueBerry', 'Lemon', 'Pineapple'];

const voteStrains = [
  { value: 'Dinamita', label: 'Dinamita (Sativa)' },
  { value: 'Kazuma', label: 'Kazuma (Hybrid)' },
  { value: 'MAC', label: 'MAC (Sativa-Leaning)' },
];

export default function Home() {
  useEffect(() => {
    fetch('/api/env')
      .then(res => res.json())
      .then(data => console.log('From server API:', data.supabaseUrl))
      .catch(err => console.error('API error:', err));
  }, []);

  const { publicKey, signTransaction } = useWallet(); // Wallet state and signer
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Form states for upload
  const [strain, setStrain] = useState('');
  const [score, setscore] = useState('');
  const [effects, setEffects] = useState('');

  // State for votes
  const [votes, setVotes] = useState(
    voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: '' }), {})
  );

  // Add states for history
  const [userUploads, setUserUploads] = useState([]);
  const [userVotes, setUserVotes] = useState([]);

  useEffect(() => {
    if (publicKey) {
      supabase.from('uploads').select('*').eq('user_pubkey', publicKey.toBase58()).then(({ data }) => setUserUploads(data || []));
      supabase.from('votes').select('*').eq('user_pubkey', publicKey.toBase58()).then(({ data }) => setUserVotes(data || []));
    }
  }, [publicKey]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // document.body.style.backgroundColor = theme === 'dark' ? 'black' : 'white';
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Function to claim rewards (mints $PUF to recipient)
  const claimRewards = useCallback(async (recipient) => {
    if (!publicKey || !signTransaction) return;

    setLoading(true);
    try {
      const decimals = await getCustomMintDecimals(connection, TOKEN_MINT);
      const recipientATA = getCustomAssociatedTokenAddress(TOKEN_MINT, recipient);

      // Check if recipient ATA exists; create if not
      const recipientAccount = await connection.getAccountInfo(recipientATA);
      const transaction = new Transaction();

      if (!recipientAccount) {
        transaction.add(createCustomAssociatedTokenAccountInstruction(
          publicKey,
          recipientATA,
          recipient,
          TOKEN_MINT
        ));
      }

      // Add mintTo instruction (10 tokens; adjust amount/decimals)
      transaction.add(createCustomMintToInstruction(
        TOKEN_MINT,
        recipientATA,
        publicKey, // Mint authority (your wallet)
        100 * (10 ** decimals) // Amount (100 tokens)
      ));

      // Fetch recent blockhash
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      // Sign
      const signedTx = await signTransaction(transaction);

      // Extract signature for potential status check
      const signature = signedTx.signatures[0].signature;

      // Send with skipPreflight
      let txId;
      try {
        txId = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          preflightCommitment: 'processed' // Faster for devnet
        });
      } catch (sendError) {
        if (sendError.message.includes('already been processed')) {
          // Check status if "duplicate"
          const status = await connection.getSignatureStatus(signature);
          if (status.value && (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized')) {
            toast.success('Rewards already claimed successfully!');
            return; // Exit as success
          }
        }
        throw sendError; // Rethrow if not duplicate
      }

      // Confirm
      await connection.confirmTransaction({
        signature: txId,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
        blockhash: transaction.recentBlockhash
      }, 'processed');

      toast.success(`Rewards claimed! Tx: ${txId}`);
    } catch (error) {
      console.error('Reward Claim Error:', error.message, error.stack); // Improved logging
      toast.error('Failed to claim rewards: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction]); 

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!publicKey) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from('uploads').insert([
        {
          user_pubkey: publicKey.toBase58(),
          strain,
          score: parseInt(score),
          effects,
        }
      ]);
      if (error) throw error;

      console.log('Uploaded Data:', { strain, score, effects });
      await claimRewards(publicKey);
      toast.success('Data uploaded successfully!');
      setStrain(''); setscore(''); setEffects('');
    } catch (error) {
      console.error('Upload Error:', error);
      alert('Failed to upload data: ' + error.message);
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
    } catch (err) {
      console.error('Vote Error:', JSON.stringify(err, null, 2)); // Full error log
      toast.error('Failed to submit votes: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Aggregate votes by strain
  const aggregatedVotes = userVotes.reduce((acc, v) => {
    acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
    return acc;
  }, {});

  // Aggregate uploads by strain
  const aggregatedUploads = userUploads.reduce((acc, u) => {
    if (!acc[u.strain]) {
      acc[u.strain] = { score: 0, effects: [] };
    }
    acc[u.strain].score += u.score;
    acc[u.strain].effects.push(u.effects);
    return acc;
  }, {});

  return (
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 text-2xl text-black dark:text-[#22f703] bg-white dark:bg-black">
      {/* Favicon links moved here as a temp fix; better in app/layout.js metadata */}
      {/* <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" /> */}
      {/* <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" /> */}
      {/* <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" /> */}
      {/* <link rel="manifest" href="/site.webmanifest" /> */}

      <main className="flex flex-col gap-[48px] row-start-2 items-center w-full max-w-2xl mx-auto">
        <h1 className="text-6xl font-bold text-center text-black dark:text-[#22f703]">PUF Wallet</h1>
        <div className="flex flex-col items-center gap-8 w-full">
          <WalletMultiButton className="bg-blue-500 dark:bg-gray-800 hover:bg-blue-600 dark:hover:bg-gray-600 text-white dark:text-[#22f703] font-bold py-6 px-10 rounded w-full text-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-gray-800 dark:to-gray-900" />
          {publicKey && <p className="text-xl text-gray-600 dark:text-[#22f703]">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
          <button onClick={toggleTheme} className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-[#22f703] font-bold py-6 px-10 rounded w-full text-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900">
            {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
          </button>
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
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">Number of score</td>
                      <td className="pb-4">
                        <input type="number" placeholder="Number of score" value={score} onChange={(e) => setscore(e.target.value)} className="p-8 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-[#22f703] text-2xl border border-green-500 w-full h-56" required />
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">Effects/Notes</td>
                      <td className="pb-4">
                        <textarea placeholder="Effects/Notes" value={effects} onChange={(e) => setEffects(e.target.value)} className="p-8 rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-[#22f703] text-2xl border border-green-500 w-full h-56" required />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button type="submit" disabled={loading} className="bg-green-500 dark:bg-gray-800 hover:bg-green-600 dark:hover:bg-gray-600 text-white dark:text-[#22f703] font-bold py-6 px-10 rounded text-2xl border border-green-500 hover:shadow-green-500/50 bg-gradient-to-br from-green-500 to-green-600 dark:from-gray-800 dark:to-gray-900 mx-auto">
                  {loading ? 'Claiming...' : 'Upload & Claim $PUF'}
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
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Strain</th>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Total score</th>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Effects/Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(aggregatedUploads).map(([strain, { score, effects }], i) => (
                      <tr key={i}>
                        <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{strain}</td>
                        <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{score}</td>
                        <td className="pb-4 text-black dark:text-[#22f703] text-center">{effects.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(aggregatedUploads).length === 0 && <p className="text-center text-gray-600 dark:text-[#22f703] text-xl">No uploads yet.</p>}

                <h3 className="text-3xl mb-4 text-black dark:text-[#22f703] mt-8">Votes</h3>
                <table className="w-full table-auto mx-auto">
                  <thead>
                    <tr>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Strain</th>
                      <th className="text-center pb-4 text-black dark:text-[#22f703]">Total Votes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(aggregatedVotes).map(([strain, total], i) => (
                      <tr key={i}>
                        <td className="pr-4 pb-4 text-black dark:text-[#22f703] text-center">{strain}</td>
                        <td className="pb-4 text-black dark:text-[#22f703] text-center">{total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {Object.keys(aggregatedVotes).length === 0 && <p className="text-center text-gray-600 dark:text-[#22f703] text-xl">No votes yet.</p>}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-600 dark:text-[#22f703] text-2xl">Connect your wallet to upload data and vote!</p>
        )}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        {/* Footer if needed */}
      </footer>
      <ToastContainer theme={theme} />
    </div>
  ); 
}