'use client';

import { supabase } from '../../../lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';

export default function StrainData() {
  const params = useParams();
  const strainName = decodeURIComponent(params.strain);
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);

  const [grower, setGrower] = useState('');
  const [type, setType] = useState('');
  const [thc, setThc] = useState('');
  const [cbd, setCbd] = useState('');
  const [totalCann, setTotalCann] = useState('');
  const [notes, setNotes] = useState('');
  const [terpenes, setTerpenes] = useState({
    alpha_pinene: '',
    beta_pinene: '',
    myrcene: '',
    limonene: '',
    linalool: '',
    terpinolene: '',
    caryophyllene: '',
    humulene: '',
    beta_caryophyllene: '',
  });

  useEffect(() => {
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
                acc.sum_thc += u.thc;
                acc.sum_cbd += u.cbd;
                acc.count += 1;
                acc.type = u.type; // Use the last type
                return acc;
              },
              { sum_thc: 0, sum_cbd: 0, count: 0, type: '' }
            );
            setType(agg.type);
            setThc((agg.sum_thc / agg.count).toFixed(1));
            setCbd((agg.sum_cbd / agg.count).toFixed(1));
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
            setNotes(data.notes || '');
            setTerpenes({
              alpha_pinene: data.alpha_pinene || '',
              beta_pinene: data.beta_pinene || '',
              myrcene: data.myrcene || '',
              limonene: data.limonene || '',
              linalool: data.linalool || '',
              terpinolene: data.terpinolene || '',
              caryophyllene: data.caryophyllene || '',
              humulene: data.humulene || '',
              beta_caryophyllene: data.beta_caryophyllene || '',
            });
          }
        });
    }
  }, [publicKey, strainName]);

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
        notes,
        alpha_pinene: parseFloat(terpenes.alpha_pinene) || null,
        beta_pinene: parseFloat(terpenes.beta_pinene) || null,
        myrcene: parseFloat(terpenes.myrcene) || null,
        limonene: parseFloat(terpenes.limonene) || null,
        linalool: parseFloat(terpenes.linalool) || null,
        terpinolene: parseFloat(terpenes.terpinolene) || null,
        caryophyllene: parseFloat(terpenes.caryophyllene) || null,
        humulene: parseFloat(terpenes.humulene) || null,
        beta_caryophyllene: parseFloat(terpenes.beta_caryophyllene) || null,
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

  return (
    <div suppressHydrationWarning={true} className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-10 gap-8 sm:p-10 text-xl text-[#00ff00] bg-transparent relative">
      <main className="flex flex-col gap-[24px] row-start-2 items-center justify-center w-full max-w-2xl mx-auto">
        <div className="w-full bg-black/75 p-5 rounded-lg shadow-md shadow-green-500/50">
          <h2 className="text-4xl font-bold mb-4 text-[#00ff00] text-center">Strain Data</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 items-center">
            <input
              type="text"
              placeholder="Grower"
              value={grower}
              onChange={(e) => setGrower(e.target.value)}
              className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-xl border-4 border-black w-full h-20"
            />
            <input
              type="text"
              value={strainName}
              disabled
              className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-xl border-4 border-black w-full h-20 opacity-50"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-xl border-4 border-black w-full h-20"
            >
              <option value="">Select Type</option>
              <option value="Sativa">Sativa</option>
              <option value="Indica">Indica</option>
              <option value="Hybrid">Hybrid</option>
            </select>
            <input
              type="number"
              step="0.1"
              placeholder="THC (%)"
              value={thc}
              onChange={(e) => setThc(e.target.value)}
              className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-lg border-4 border-black w-full h-20"
            />
            <input
              type="number"
              step="0.1"
              placeholder="CBD (%)"
              value={cbd}
              onChange={(e) => setCbd(e.target.value)}
              className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-lg border-4 border-black w-full h-20"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Total Cannabinoids (%)"
              value={totalCann}
              onChange={(e) => setTotalCann(e.target.value)}
              className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-lg border-4 border-black w-full h-20"
            />
            <textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-lg border-4 border-black w-full h-32"
            />
            <h3 className="text-3xl font-bold mb-2 text-[#00ff00] text-center">Terpene Data</h3>
            <div className="grid grid-cols-2 gap-4 w-full">
              {Object.keys(terpenes).map((key) => (
                <input
                  key={key}
                  type="number"
                  step="0.01"
                  placeholder={`${key.replace(/_/g, '-').replace('alpha', 'α').replace('beta', 'β')} (%)`}
                  value={terpenes[key]}
                  onChange={(e) => handleTerpeneChange(key, e.target.value)}
                  className="p-4 rounded bg-transparent text-[#00ff00] font-bold text-lg border-4 border-black w-full h-20"
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-500/70 hover:bg-purple-600/70 text-[#00ff00] font-bold py-3 px-5 rounded w-full text-xl border border-green-500 hover:shadow-green-500/50 bg-gradient-to-br from-purple-500/70 to-purple-600/70 mx-auto mt-4"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
          <Link href="/">
            <button className="bg-blue-500/70 hover:bg-blue-600/70 text-[#00ff00] font-bold py-3 px-5 rounded w-full text-xl mx-auto mt-4">
              Back
            </button>
          </Link>
        </div>
      </main>
      <ToastContainer theme="dark" />
    </div>
  );
}