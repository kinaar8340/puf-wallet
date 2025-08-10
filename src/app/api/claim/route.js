// /puf-wallet-frontend/src/app/api/claim/route.js

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createMintToInstruction, getMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const TOKEN_MINT = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export async function POST(request) {
  const { recipient } = await request.json();
  if (!recipient) {
    return Response.json({ error: 'Recipient public key is required' }, { status: 400 });
  }

  try {
    // Load the mint authority keypair from env (base58 secret key array)
    const secretKeyString = process.env.PRIVATE_KEY;
    if (!secretKeyString) {
      throw new Error('PRIVATE_KEY not set in environment variables');
    }
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const mintAuthority = Keypair.fromSecretKey(secretKey);

    const recipientPubkey = new PublicKey(recipient);

    // Get mint info with Token-2022 program ID
    const mintInfo = await getMint(connection, TOKEN_MINT, 'confirmed', TOKEN_2022_PROGRAM_ID);

    // Get or create ATA for recipient
    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,  // Payer
      TOKEN_MINT,
      recipientPubkey,
      false,
      'confirmed',
      'confirmed',
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Mint 1000 tokens (adjust amount and decimals as needed)
    const amount = 1000 * 10 ** mintInfo.decimals;

    const transaction = new Transaction().add(
      createMintToInstruction(
        TOKEN_MINT,
        recipientATA.address,
        mintAuthority.publicKey,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [mintAuthority]);

    return Response.json({ signature });
  } catch (error) {
    console.error('Claim error:', error);
    return Response.json({ error: error.message || 'Failed to claim rewards' }, { status: 500 });
  }
}