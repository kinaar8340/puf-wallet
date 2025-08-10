// /puf-wallet-frontend/src/app/strain/[strain]/page.jsx

'use_client';

import { supabase } from '../../../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

const WalletMultiButton = dynamic(async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false });

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Solana Devnet connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// $PUF token mint
const TOKEN_MINT = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ');

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
          const ata = await getAssociatedTokenAddress(TOKEN_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
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
              <Link href="/history">
                <button className="bg-gray-800 hover:bg-gray-700 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500">
                  Back
                </button>
              </Link>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="bg-orange-500/70 hover:bg-orange-600/70 text-[#00ff00] font-bold py-3 px-5 rounded text-xl border border-green-500"
              >
                Delete
              </button>
            </div>
            <p className="text-2xl font-bold text-center mb-4">$PUF Balance: {Number(balance).toFixed(2)}</p>
          </div>
        </div>

        <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50 text-[#00ff00] mt-8">
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