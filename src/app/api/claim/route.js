import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';

export async function POST(request) {
  const { recipient } = await request.json();

  if (!recipient) {
    return new Response(JSON.stringify({ error: 'Recipient public key required' }), { status: 400 });
  }

  try {
    // Load treasury from env
    const treasurySecretKey = process.env.TREASURY_PRIVATE_KEY;
    if (!treasurySecretKey) {
      throw new Error('Treasury private key not set in env');
    }
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasurySecretKey));

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed'); // Switch to mainnet URL later
    const tokenMint = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ'); // Switch to mainnet mint later

    // Get mint decimals
    const mintInfo = await getMint(connection, tokenMint, 'confirmed', TOKEN_2022_PROGRAM_ID);
    const decimals = mintInfo.decimals;

    const recipientPubkey = new PublicKey(recipient);
    const recipientATA = getAssociatedTokenAddressSync(
      tokenMint,
      recipientPubkey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const treasuryATA = getAssociatedTokenAddressSync(
      tokenMint,
      treasuryKeypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction();

    // Check if recipient ATA exists; create if not (treasury pays)
    const ataInfo = await connection.getAccountInfo(recipientATA);
    if (!ataInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          treasuryKeypair.publicKey, // Payer
          recipientATA,
          recipientPubkey,
          tokenMint,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add transfer instruction (1000 tokens)
    transaction.add(
      createTransferInstruction(
        treasuryATA, // Source
        recipientATA, // Destination
        treasuryKeypair.publicKey, // Owner
        1000 * (10 ** decimals), // Amount
        [], // No multisig
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Set fee payer and blockhash
    transaction.feePayer = treasuryKeypair.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Sign and send
    transaction.sign(treasuryKeypair);
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
    });
    await connection.confirmTransaction({ signature, lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight, blockhash }, 'processed');

    return new Response(JSON.stringify({ success: true, signature }), { status: 200 });
  } catch (error) {
    console.error('Claim error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to claim rewards' }), { status: 500 });
  }
}
