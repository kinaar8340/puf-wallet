// ~/puf-wallet-frontend/src/app/strain/[strain]/page.jsx

'use client';

import { supabase } from '../../../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const splToken = require('@solana/spl-token');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('6sTBrWuViekTdbYPK9kAypnwpXJqqrp6yDzTB1PK3Mp7');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

export default function StrainData() {
  const params = useParams();
  const strainName = decodeURIComponent(params.strain);
  const { publicKey } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');

  const [grower, setGrower] = useState('');
  const [type, setType] = useState('');
  const [thc, setThc] = useState('');
  const [cbd, setCbd] = useState('');
  const [cbn, setCbn] = useState('');
  const [cbc, setCbc] = useState('');
  const [totalCann, setTotalCann] = useState('');
  const [terpenesTotal, setTerpenesTotal] = useState('');
  const [terpenes, setTerpenes] = useState({
    myrcene: '',
    limonene: '',
    pinene: '',
    linalool: '',
    caryophyllene: '',
    humulene: '',
    terpinolene: '',
    ocimene: '',
    geraniol: '',
    borneol: '',
  });

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
    if (publicKey && strainName) {
      // Fetch aggregated from Uploads
      supabase
        .from('Uploads')
        .select('*')
        .eq('user_pubkey', publicKey.toBase58())
        .eq('strain', strainName)
        .then(({ data, error }) => {
          if (error) console.error('Uploads fetch error:', error);
          if (data && data.length > 0) {
            const agg = data.reduce(
              (acc, u) => {
                acc.sum_thc += u.thc || 0;
                acc.sum_cbd += u.cbd || 0;
                acc.sum_cbn += u.cbn || 0;
                acc.sum_cbc += u.cbc || 0;
                acc.count += 1;
                acc.type = u.type; // Use the last type
                return acc;
              },
              { sum_thc: 0, sum_cbd: 0, sum_cbn: 0, sum_cbc: 0, count: 0, type: '' }
            );
            setType(agg.type);
            setThc((agg.sum_thc / agg.count).toFixed(2));
            setCbd((agg.sum_cbd / agg.count).toFixed(2));
            setCbn((agg.sum_cbn / agg.count).toFixed(2));
            setCbc((agg.sum_cbc / agg.count).toFixed(2));
          }
        });

      // Fetch existing StrainDetails if any
      supabase
        .from('StrainDetails')
        .select('*')
        .eq('user_pubkey', publicKey.toBase58())
        .eq('strain', strainName)
        .single()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') console.error('StrainDetails fetch error:', error); // Ignore no rows error
          if (data) {
            setGrower(data.grower || '');
            setTotalCann(data.total_cann || '');
            setCbn(data.cbn || '');
            setCbc(data.cbc || '');
            setTerpenes({
              myrcene: data.myrcene || '',
              limonene: data.limonene || '',
              pinene: data.pinene || '',
              linalool: data.linalool || '',
              caryophyllene: data.caryophyllene || '',
              humulene: data.humulene || '',
              terpinolene: data.terpinolene || '',
              ocimene: data.ocimene || '',
              geraniol: data.geraniol || '',
              borneol: data.borneol || '',
            });
          }
        });
    }
  }, [publicKey, strainName]);

  useEffect(() => {
    const sum = Object.values(terpenes).reduce((acc, value) => acc + parseFloat(value || 0), 0);
    setTerpenesTotal(sum.toFixed(2));
  }, [terpenes]);

  const handleTerpeneChange = (key, value) => {
    setTerpenes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!publicKey) return;

    setLoading(true);
    try {
      const detail = {
        user_pubkey: publicKey.toBase58(),
        strain: strainName,
        grower,
        total_cann: parseFloat(totalCann) || null,
        cbn: parseFloat(cbn) || null,
        cbc: parseFloat(cbc) || null,
        myrcene: parseFloat(terpenes.myrcene) || null,
        limonene: parseFloat(terpenes.limonene) || null,
        pinene: parseFloat(terpenes.pinene) || null,
        linalool: parseFloat(terpenes.linalool) || null,
        caryophyllene: parseFloat(terpenes.caryophyllene) || null,
        humulene: parseFloat(terpenes.humulene) || null,
        terpinolene: parseFloat(terpenes.terpinolene) || null,
        ocimene: parseFloat(terpenes.ocimene) || null,
        geraniol: parseFloat(terpenes.geraniol) || null,
        borneol: parseFloat(terpenes.borneol) || null,
      };
      const { error } = await supabase.from('StrainDetails').upsert([detail]);
      if (error) throw error;
      toast.success('Data saved successfully!');
    } catch (error) {
      console.error('Save Error:', error);
      toast.error('Failed to save data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!publicKey) return;
    if (!confirm('Are you sure you want to delete this strain data?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('StrainDetails')
        .delete()
        .eq('user_pubkey', publicKey.toBase58())
        .eq('strain', strainName);
      if (error) throw error;
      toast.success('Data deleted successfully!');
      router.push('/minimal');
    } catch (error) {
      console.error('Delete Error:', error);
      toast.error('Failed to delete data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const terpeneOrder = [
    'myrcene',
    'humulene',
    'limonene',
    'terpinolene',
    'pinene',
    'ocimene',
    'linalool',
    'geraniol',
    'caryophyllene',
    'borneol',
  ];

  const formatTerpeneName = (key) => key.charAt(0).toUpperCase() + key.slice(1);

return (
  <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[1fr_20px] items-start justify-items-center min-h-screen px-4 pb-4 gap-8 sm:px-10 sm:pb-10 text-xl text-[#00ff00] bg-transparent relative">
    <main className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-1 sm:p-10">
      {/* Combined container for header and controls on the same background */}
      <div className="w-full rounded-lg shadow-md shadow-green-500/50 mt-8 bg-black/50">
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
              <Link href="/upload">
                <button className="bg-gray-700 hover:bg-gray-600 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border-b border-r border-green-500 shadow-md shadow-green-500/50">
                  Upload
                </button>
              </Link>
            </div>
            <p></p>
          </div>
        </div>

        {/* Table - Link to Strain Data */}
        <div className="w-full bg-black/50 p-5 rounded-lg shadow-md shadow-green-500/50 text-[#00ff00] mt-8">
          <h2 className="text-4xl font-bold mb-4 text-[#00ff00] text-center">Link to Strain Data</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 items-center">
            <div className="flex flex-col w-full gap-1 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">Grower :</span>
                <input
                  type="text"
                  value={grower}
                  onChange={(e) => setGrower(e.target.value)}
                  className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">Strain :</span>
                <span className="text-[#00ff00] font-bold text-xl text-right">{strainName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">Type :</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none"
                >
                  <option value="">Select Type</option>
                  <option value="Sativa">Sativa</option>
                  <option value="Indica">Indica</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 w-full mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">THC :</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.00000001"
                    value={thc}
                    onChange={(e) => setThc(e.target.value)}
                    className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none no-spinner w-20"
                  />
                  <span className="text-[#00ff00] font-bold text-xl ml-1">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">CBN :</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.00000001"
                    value={cbn}
                    onChange={(e) => setCbn(e.target.value)}
                    className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none no-spinner w-20"
                  />
                  <span className="text-[#00ff00] font-bold text-xl ml-1">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">CBD :</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.00000001"
                    value={cbd}
                    onChange={(e) => setCbd(e.target.value)}
                    className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none no-spinner w-20"
                  />
                  <span className="text-[#00ff00] font-bold text-xl ml-1">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">CBC :</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.00000001"
                    value={cbc}
                    onChange={(e) => setCbc(e.target.value)}
                    className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none no-spinner w-20"
                  />
                  <span className="text-[#00ff00] font-bold text-xl ml-1">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">Terpenes :</span>
                <span className="text-[#00ff00] font-bold text-xl text-right">{terpenesTotal}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#00ff00] font-bold text-xl">Cannabinoids :</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.00000001"
                    value={totalCann}
                    onChange={(e) => setTotalCann(e.target.value)}
                    className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none no-spinner w-20"
                  />
                  <span className="text-[#00ff00] font-bold text-xl ml-1">%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 w-full">
              {terpeneOrder.map((key) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-[#00ff00] font-bold text-xl">{formatTerpeneName(key)} :</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.00000001"
                      value={terpenes[key]}
                      onChange={(e) => handleTerpeneChange(key, e.target.value)}
                      className="bg-transparent text-[#00ff00] font-bold text-xl text-right border-none outline-none focus:outline-none no-spinner w-20"
                    />
                    <span className="text-[#00ff00] font-bold text-xl ml-1">%</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-500/70 hover:bg-purple-600/70 text-[#00ff00] font-bold py-3 px-5 rounded w-full text-xl border border-green-500 hover:shadow-green-500/50 bg-gradient-to-br from-purple-500/70 to-purple-600/70 mx-auto mt-4"
            >
              {loading ? 'Saving...' : 'SAVE'}
            </button>
          </form>
        </div>
      </main>
      <ToastContainer theme="dark" />
    </div>
  );
}