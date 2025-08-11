// ~/puf-wallet-frontend/src/app/api/claim/route.js
const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const splToken = require('@solana/spl-token');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const TOKEN_MINT = new PublicKey('EPvHfFwU6TJhuwvftoxR1xy3WrFroLaEFYEJkp2BUHt6');
const TOKEN_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TREASURY_PUBKEY = new PublicKey('AYtdNKSeZZDDutzVefExeRwMPskLVYZyY6Xd5hceE93E'); 

exports.POST = async (request) => {  // Use exports for Vercel compatibility if needed
  const { recipient } = await request.json();
  if (!recipient) {
    return new Response(JSON.stringify({ error: 'Recipient public key is required' }), { status: 400 });
  }

  try {
    // Load treasury keypair from env
    const secretKeyString = process.env.PRIVATE_KEY;
    if (!secretKeyString) {
      throw new Error('PRIVATE_KEY not set in environment variables');
    }
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);

    const recipientPubkey = new PublicKey(recipient);

    console.log('SPL Token Version:', splToken.version); // Debug
    console.log('getMint type:', typeof splToken.getMint); // Debug (should be 'function')

    const mintInfo = await splToken.getMint(connection, TOKEN_MINT, 'confirmed', TOKEN_PROGRAM_ID);

    const treasuryATA = await splToken.getOrCreateAssociatedTokenAccount(
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

    const recipientATA = await splToken.getOrCreateAssociatedTokenAccount(
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
      splToken.createTransferInstruction(
        treasuryATA.address,
        recipientATA.address,
        TREASURY_PUBKEY,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);

    return new Response(JSON.stringify({ signature }));
  } catch (error) {
    console.error('Claim error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to claim rewards' }), { status: 500 });
  }
};