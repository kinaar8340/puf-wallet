import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createTransferInstruction, getMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

console.log('SPL Token Version:', require('@solana/spl-token').version);
console.log('getMint type with require:', typeof require('@solana/spl-token').getMint);

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('EPvHfFwU6TJhuwvftoxR1xy3WrFroLaEFYEJkp2BUHt6');
const TOKEN_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TREASURY_PUBKEY = new PublicKey('AYtdNKSeZZDDutzVefExeRwMPskLVYZyY6Xd5hceE93E');

export async function POST(request) {
  const { recipient } = await request.json();
  if (!recipient) {
    return Response.json({ error: 'Recipient public key is required' }, { status: 400 });
  }

  try {
    // Load treasury keypair (signer) from env
    const secretKeyString = process.env.PRIVATE_KEY;
    if (!secretKeyString) {
      throw new Error('PRIVATE_KEY not set in environment variables');
    }

    console.log('Imported getMint type:', typeof getMint);  //troubleshooting getMint 

    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);
    const recipientPubkey = new PublicKey(recipient);

    // Get mint info (for decimals)
    const mintInfo = await getMint(connection, TOKEN_MINT, 'confirmed', TOKEN_PROGRAM_ID);

    // Get treasury ATA (source; assumes it exists and holds tokens)
    const treasuryATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      TOKEN_MINT,
      TREASURY_PUBKEY,
      false,
      'confirmed',
      'confirmed',
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get or create recipient ATA (destination)
    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,  // Treasury pays fees
      TOKEN_MINT,
      recipientPubkey,
      false,
      'confirmed',
      'confirmed',
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Transfer 1000 tokens (adjust for decimals)
    const amount = 1000 * 10 ** mintInfo.decimals;

    const transaction = new Transaction().add(
      createTransferInstruction(
        treasuryATA.address,  // Source ATA
        recipientATA.address,  // Destination ATA
        TREASURY_PUBKEY,  // Owner (treasury pubkey)
        amount,
        [],  // No multi-signers
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