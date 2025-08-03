'use client'; // Client component for hooks and state

import { supabase } from '../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });
import { useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { ToastContainer, toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

// Hardcode program IDs to avoid import issues
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

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
  const [puffs, setPuffs] = useState('');
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
    document.body.style.backgroundColor = theme === 'dark' ? 'black' : 'white';
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Function to claim rewards (mints $PUF to recipient)
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
      10 * (10 ** decimals) // Amount (10 tokens)
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
          puffs: parseInt(puffs),
          effects,
        }
      ]);
      if (error) throw error;

      console.log('Uploaded Data:', { strain, puffs, effects });
      await claimRewards(publicKey);
      toast.success('Data uploaded successfully!');
      setStrain(''); setPuffs(''); setEffects('');
    } catch (error) {
      console.error('Upload Error:', error);
      alert('Failed to upload data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

// For handleVote
  // For handleVote
const handleVote = async () => {
  if (!publicKey) return;

  const voteEntries = Object.entries(votes)
    .filter(([_, amt]) => amt >= 1 && amt <= 10)
    .map(([strain, vote_amount]) => ({
      user_pubkey: publicKey.toBase58(),
      strain,
      vote_amount: Math.floor(Number(vote_amount)), // Ensure integer
    }));

  if (voteEntries.length === 0) {
    toast.error('Please enter at least one vote between 1 and 10.');
    return;
  }

  setLoading(true);
  try {
    const { data, error } = await supabase.from('votes').insert(voteEntries).select(); // Add .select() for returned rows
    console.log('Insert response:', { data, error }); // Debug full response
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Insert succeeded but no data was added—check table constraints or logs');

    console.log('Votes Submitted:', voteEntries);
    await claimRewards(publicKey);
    toast.success('Votes submitted successfully!');
    setVotes(voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: '' }), {}));
    // Optional: Update local history without refetch
    setUserVotes([...userVotes, ...data]);
  } catch (err) {
    console.error('Vote Error:', err);
    toast.error('Failed to submit votes: ' + (err.message || 'Unknown error'));
  } finally {
    setLoading(false);
  }
}; 

return (
  <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
    <ToastContainer />
    <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-md">
      <h1 className="text-4xl font-bold text-center sm:text-left text-green-500">Welcome to Puf Wallet</h1>
      <div className="flex flex-col items-center gap-4 w-full">
        <WalletMultiButton className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full" />
        {publicKey && <p className="text-sm text-green-500">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
      </div>

      {publicKey ? (
        <>
          <div className="w-full bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-green-500">Upload Vape Data</h2>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <input type="text" placeholder="Strain Name" value={strain} onChange={(e) => setStrain(e.target.value)} className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-green-500 w-full" required />
              <input type="number" placeholder="Number of Puffs" value={puffs} onChange={(e) => setPuffs(e.target.value)} className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-green-500 w-full" required />
              <textarea placeholder="Effects/Notes" value={effects} onChange={(e) => setEffects(e.target.value)} className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-green-500 w-full h-24" required />
              <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                {loading ? 'Claiming...' : 'Upload & Claim $PUF'}
              </button>
            </form>
          </div>

          <div className="w-full bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-green-500">Vote on Strains</h2>
            <table className="w-full table-auto mb-4">
              <thead>
                <tr>
                  <th className="text-left py-2 text-green-500">Strain</th>
                  <th className="text-left py-2 text-green-500">Vote (1-10)</th>
                </tr>
              </thead>
              <tbody>
                {voteStrains.map(({ value, label }) => (
                  <tr key={value}>
                    <td className="py-2 text-green-500">{label}</td>
                    <td className="py-2 flex items-center">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={votes[value] || ''}
                        onChange={(e) => setVotes({ ...votes, [value]: e.target.value ? Number(e.target.value) : '' })}
                        className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-green-500 w-full"
                      />
                      {// Later: Add colored meter here, e.g.:
                      {votes[value] && (
                        <div
                          className="ml-2 w-8 h-4 rounded"
                          style={{
                            backgroundColor: votes[value] <= 5 ? (votes[value] <= 2 ? 'red' : 'lightcoral') : (votes[value] <= 7 ? 'lightgreen' : 'green'),
                          }}
                        ></div>
                      )} }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleVote} disabled={loading} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded w-full">
              {loading ? 'Claiming...' : 'Vote & Claim $PUF'}
            </button>
          </div>

          {/* History Dashboard */}
          {publicKey && (
            <div className="w-full bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
              <h2 className="text-2xl font-semibold mb-4 text-green-500">Your History</h2>
              <h3 className="text-green-500">Uploads</h3>
              <ul className="text-green-500">{userUploads.map((u, i) => <li key={i}>{u.strain} - {u.puffs} puffs</li>)}</ul>
              <h3 className="text-green-500">Votes</h3>
              <ul className="text-green-500">{userVotes.map((v, i) => <li key={i}>{v.strain} - {v.vote_amount} votes</li>)}</ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-green-500">Connect your wallet to upload data and vote!</p>
      )}
    </main>
    <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      {/* Footer if needed */}
    </footer>
  </div>
);
}