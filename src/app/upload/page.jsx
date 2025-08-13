// /puf-wallet-frontend/src/app/upload/page.jsx

'use client';

import { supabase } from '../../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const splToken = require('@solana/spl-token');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

export default function Upload() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [grower, setGrower] = useState('');
  const [strainName, setStrainName] = useState('');
  const [thc, setThc] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    if (publicKey) {
      // Fetch balance
      (async () => {
        try {
          const ata = await getAssociatedTokenAddress(TOKEN_MINT, publicKey);
          const res = await connection.getTokenAccountBalance(ata);
          setBalance(res.value.uiAmountString);
        } catch {
          setBalance('0');
        }
      })();
    }
  }, [publicKey]);

  const handleSave = async () => {
    if (!publicKey || !strainName.trim() || !grower.trim() || !type || !thc) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Insert into Uploads (for THC and type)
      const { error: uploadError } = await supabase.from('Uploads').insert([
        {
          user_pubkey: publicKey.toBase58(),
          strain: strainName.trim(),
          thc: parseFloat(thc),
          type,
          // Assuming defaults for cbd, cbn, cbc as 0
          cbd: 0,
          cbn: 0,
          cbc: 0,
        }
      ]);
      if (uploadError) throw uploadError;

      // Insert into StrainDetails (for grower and type)
      const { error: detailsError } = await supabase.from('StrainDetails').insert([
        {
          user_pubkey: publicKey.toBase58(),
          strain: strainName.trim(),
          grower: grower.trim(),
          type,
          // Defaults for others
          total_cann: 0,
          myrcene: 0,
          limonene: 0,
          pinene: 0,
          linalool: 0,
          caryophyllene: 0,
          humulene: 0,
          terpinolene: 0,
          ocimene: 0,
          geraniol: 0,
          borneol: 0,
        }
      ]);
      if (detailsError) throw detailsError;

      toast.success('Strain uploaded successfully!');
      router.push('/history');
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error('Failed to upload strain: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

return (
  <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[1fr_20px] items-start justify-items-center min-h-screen px-4 pb-4 gap-8 sm:px-10 sm:pb-10 text-xl text-[#00ff00] bg-transparent relative">
    <main className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-1 sm:p-10">
      {/* Combined container for header and controls on the same background */}
      <div className="fixed top-0 left-0 w-1/3 mx-auto rounded-lg shadow-md shadow-green-500/50 bg-black/50 z-10">
        {/* Header section */}
        <div className="w-full p-5 flex justify-top items-center">
          <WalletMultiButton className="font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70 hover:bg-blue-600/70" />
          {publicKey && <p className="text-lg font-bold text-center mx-auto text-[#00ff00]">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
        </div>
        <div className="w-full p-5 flex justify-between items-center">
          <img src="/images/icon0.png" alt="PUF Wallet" className="w-32 h-32 object-contain object-center" />
          <p className="bg-black/1 text-lg font-bold text-center mx-auto text-[#00ff00]">$PUF: {Number(balance).toFixed(2)}</p>
          <div className="flex flex-col items-end gap-4"></div>
        </div>
          <div className="w-full bg-black/1 p-5 rounded-b-lg shadow-md shadow-green-500/50 text-[#00ff00]">
            <p></p>
            <div className="w-full flex justify-center gap-4 mb-4">
              <Link href="/results">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Results
                </button>
              </Link>
              <Link href="/vote">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Vote
                </button>
              </Link>
              <Link href="/minimal">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Back
                </button>
              </Link>
              <Link href="/history">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  History
                </button>
              </Link>
            </div>
            <p></p>
          </div>
        </div>

        {/*Table - Upload New Strain*/}
        <div className="fixed top-0 right-0 w-1/3 mx-auto rounded-lg shadow-md shadow-green-500/50 bg-black/50 z-10">
          <h2 className="text-4xl font-bold mb-4 text-[#00ff00] text-center">Upload New Strain</h2>
          <table className="w-full table-auto mx-auto text-center text-[#ffffff]">
            <thead>
              <tr>
                <th className="text-center pb-2 font-bold">Growers</th>
                <th className="text-center pb-2 font-bold">Strain Name</th>
                <th className="text-center pb-2 font-bold">THC %</th>
                <th className="text-center pb-2 font-bold">Type</th>
                <th className="text-center pb-2 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pb-2">
                  <input
                    type="text"
                    value={grower}
                    onChange={(e) => setGrower(e.target.value)}
                    className="bg-gray-800 text-[#00ff00] font-bold text-xl text-center border border-green-500 w-full"
                  />
                </td>
                <td className="pb-2">
                  <input
                    type="text"
                    value={strainName}
                    onChange={(e) => setStrainName(e.target.value)}
                    className="bg-gray-800 text-[#00ff00] font-bold text-xl text-center border border-green-500 w-full"
                  />
                </td>
                <td className="pb-2">
                  <input
                    type="number"
                    step="0.01"
                    value={thc}
                    onChange={(e) => setThc(e.target.value)}
                    className="bg-gray-800 text-[#00ff00] font-bold text-xl text-center border border-green-500 w-full"
                  />
                </td>
                <td className="pb-2">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="bg-gray-800 text-[#00ff00] font-bold text-xl text-center border border-green-500 w-full"
                  >
                    <option value="">Select</option>
                    <option value="Sativa">Sativa</option>
                    <option value="Indica">Indica</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </td>
                <td className="pb-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
      <ToastContainer theme="dark" />
    </div>
  );
}//eof