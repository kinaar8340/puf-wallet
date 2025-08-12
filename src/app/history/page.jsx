// /puf-wallet-frontend/src/app/history/page.jsx

'use client';

import { supabase } from '../../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');

const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

export default function History() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [balance, setBalance] = useState('0');
  const [strains, setStrains] = useState([]);
  const [aggregatedUploads, setAggregatedUploads] = useState({});
  const [aggregatedDetails, setAggregatedDetails] = useState({});

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
    if (publicKey) {
      fetchHistory();
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
  }, [publicKey, fetchHistory]);

  return (
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[1fr_20px] items-start justify-items-center min-h-screen px-4 pb-4 gap-8 sm:px-10 sm:pb-10 text-xl text-[#00ff00] bg-transparent relative">
      <main className="flex flex-col row-start-1 items-center justify-center w-full max-w-2xl mx-auto">
        <div className="w-full bg-black/75 rounded border-4 border-black">
          <div className="w-full bg-black/75 p-8 flex justify-between items-center">
            <img src="/images/icon2.png" alt="PUF Wallet Logo" className="w-16 h-16 object-contain" />
            <div className="flex flex-col items-end gap-4">
              <WalletMultiButton className="bg-blue-500/70 hover:bg-blue-600/70 font-bold py-3 px-5 rounded text-xl bg-gradient-to-br from-blue-500/70 to-blue-600/70" />
              {publicKey && <p className="text-lg font-bold">Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</p>}
            </div>
          </div>
          <div className="w-full bg-black/75 p-5 rounded-b-lg shadow-md shadow-green-500/50 text-[#00ff00]">
            <div className="w-full flex justify-center gap-4 mb-4">
              <Link href="/minimal">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500">
                  Back
                </button>
              </Link>
            </div>
            <p className="text-2xl font-bold text-center mb-4">$PUF Balance: {Number(balance).toFixed(2)}</p>
          </div>
        </div>

        <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50 text-[#00ff00] mt-8">
          <h2 className="text-4xl font-bold text-[#00ff00] mb-4">Your History</h2>
          <table className="w-full table-auto mx-auto text-center">
            <thead>
              <tr>
                <th className="text-center pb-2 font-bold underline">Growers</th>
                <th className="text-center pb-2 font-bold underline">Strain Name</th>
                <th className="text-center pb-2 font-bold underline">THC %</th>
                <th className="text-center pb-2 font-bold underline">Type</th>
                <th className="text-center pb-2 font-bold underline">Action</th>
              </tr>
            </thead>
            <tbody>
              {strains.map((strain) => (
                <tr key={strain}>
                  <td className="pr-2 pb-2 font-bold text-center">{aggregatedDetails[strain]?.grower || ''}</td>
                  <td className="pr-2 pb-2 font-bold text-center">{strain}</td>
                  <td className="pr-2 pb-2 font-bold text-center">
                    {aggregatedUploads[strain] ? (aggregatedUploads[strain].sum_thc / aggregatedUploads[strain].count).toFixed(2) : '0.00'}
                  </td>
                  <td className="pr-2 pb-2 font-bold text-center">{aggregatedDetails[strain]?.type || aggregatedUploads[strain]?.type || ''}</td>
                  <td className="pb-2 text-center">
                    <Link href={`/strain/${encodeURIComponent(strain)}`}>
                      <button className="bg-blue-500/70 hover:bg-blue-600/70 font-bold py-1 px-2 rounded text-sm">
                        Link
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {strains.length === 0 && <p className="text-center font-bold text-lg">No strains yet.</p>}
        </div>
      </main>
    </div>
  );
}