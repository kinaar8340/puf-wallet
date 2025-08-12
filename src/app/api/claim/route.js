// ~/puf-wallet-frontend/src/app/api/claim/route.js

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { Token, createTransferInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export async function POST(request) {
  const { recipient } = await request.json();
  if (!recipient) {
    return Response.json({ error: 'Recipient public key is required' }, { status: 400 });
  }

  try {
    const secretKeyString = process.env.PRIVATE_KEY;
    if (!secretKeyString) {
      throw new Error('PRIVATE_KEY not set in environment variables');
    }
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);

    const recipientPubkey = new PublicKey(recipient);

    // Create Token instance and get mint info
    const token = new Token(connection, TOKEN_MINT, TOKEN_PROGRAM_ID, treasuryKeypair);
    const mintInfo = await token.getMintInfo();

    const treasuryATA = await getAssociatedTokenAddress(TOKEN_MINT, treasuryKeypair.publicKey);
    let info = await connection.getAccountInfo(treasuryATA);
    if (!info) {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          treasuryKeypair.publicKey,
          treasuryATA,
          treasuryKeypair.publicKey,
          TOKEN_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      await sendAndConfirmTransaction(connection, tx, [treasuryKeypair]);
    }

    const recipientATA = await getAssociatedTokenAddress(TOKEN_MINT, recipientPubkey);
    info = await connection.getAccountInfo(recipientATA);
    if (!info) {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          treasuryKeypair.publicKey,
          recipientATA,
          recipientPubkey,
          TOKEN_MINT,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      await sendAndConfirmTransaction(connection, tx, [treasuryKeypair]);
    }

    const amount = 1000 * Math.pow(10, mintInfo.decimals);

    const transaction = new Transaction().add(
      createTransferInstruction(
        treasuryATA,
        recipientATA,
        treasuryKeypair.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);

    return Response.json({ signature });
  } catch (error) {
    console.error('Claim error:', error);
    return Response.json({ error: error.message || 'Failed to claim rewards' }, { status: 500 });
  }
}