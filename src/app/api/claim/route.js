import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createTransferInstruction, getMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

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

    const mintInfo = await getMint(connection, TOKEN_MINT, 'confirmed', TOKEN_PROGRAM_ID);

    const treasuryATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      TOKEN_MINT,
      treasuryKeypair.publicKey,
      false,
      'confirmed',
      'confirmed',
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      TOKEN_MINT,
      recipientPubkey,
      false,
      'confirmed',
      'confirmed',
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const amount = 1000 * 10 ** mintInfo.decimals;

    const transaction = new Transaction().add(
      createTransferInstruction(
        treasuryATA.address,
        recipientATA.address,
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