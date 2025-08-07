// Adapted for React Native (RN) as the Home Page component
// Replaces web elements with RN equivalents, uses RN styles, and adapts libraries
// Assumes installation of: yarn add react-native-toast-message @react-native-picker/picker @solana-mobile/wallet-adapter-mobile (for RN wallet button if needed; fallback to Button for connect)
// For tables, uses FlatList for dynamic rendering
// Keeps Supabase and Solana logic intact
// Use in Expo Router as src/app/index.tsx for home route

import { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Picker, Button, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useWallet } from '@solana/wallet-adapter-react';  // Keep for wallet context
import { Connection, PublicKey } from '@solana/web3.js';
import Toast from 'react-native-toast-message';  // Replace react-toastify
import { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { supabase } from '../lib/supabase';  // Your Supabase client (works in RN)

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_MINT = new PublicKey('3o2B9qoezrzED5p47agp8QVtozvjqGXGSvkW42pxyzEJ');
const CURRENT_FLIGHT = 2;

const voteStrains = [
  { value: 'Cartridge 1', label: 'Cartridge 1' },
  { value: 'Cartridge 2', label: 'Cartridge 2' },
  { value: 'Cartridge 3', label: 'Cartridge 3' },
  { value: 'Cartridge 4', label: 'Cartridge 4' },
  { value: 'Cartridge 5', label: 'Cartridge 5' },
];

export default function Home() {
  useEffect(() => {
    // Fetch env from API (adapted for RN; use fetch directly)
    fetch('/api/env')
      .then(res => res.json())
      .then(data => console.log('From server API:', data.supabaseUrl))
      .catch(err => console.error('API error:', err));
  }, []);

  const { publicKey } = useWallet();  // Wallet context
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');

  // Form states for upload
  const [strain, setStrain] = useState('');
  const [type, setType] = useState('');
  const [thc, setThc] = useState('');
  const [terpenes, setTerpenes] = useState('');

  // State for votes
  const [votes, setVotes] = useState(
    voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: '' }), {})
  );

  // State for history
  const [userUploads, setUserUploads] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState({});

  useEffect(() => {
    if (publicKey) {
      supabase.from('uploads').select('*').eq('user_pubkey', publicKey.toBase58()).then(({ data, error }) => {
        if (error) console.error('Uploads fetch error:', error);
        setUserUploads(data || []);
      });
      // Fetch user votes for current flight
      supabase.from('votes').select('*').eq('user_pubkey', publicKey.toBase58()).eq('flight', CURRENT_FLIGHT).then(({ data, error }) => {
        if (error) console.error('Votes fetch error:', error);
        setUserVotes(data || []);
      });
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
    // Fetch all votes for total aggregation (per current flight)
    supabase.from('votes').select('*').eq('flight', CURRENT_FLIGHT).then(({ data, error }) => {
      if (error) console.error('Total votes fetch error:', error);
      const agg = (data || []).reduce((acc, v) => {
        acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
        return acc;
      }, {});
      setTotalVotes(agg);
    });
  }, [publicKey]);

  // Function to claim rewards (calls server API for transfer)
  const claimRewards = useCallback(async (recipient) => {
    if (!recipient) return;

    setLoading(true);
    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: recipient.toBase58() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim');
      }

      Toast.show({ type: 'success', text1: `Rewards claimed! Tx: ${data.signature}` });

      // Refresh balance
      try {
        const ata = await getAssociatedTokenAddress(TOKEN_MINT, recipient, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const res = await connection.getTokenAccountBalance(ata);
        setBalance(res.value.uiAmountString);
      } catch {
        setBalance('0');
      }
    } catch (error) {
      console.error('Reward Claim Error:', error);
      Toast.show({ type: 'error', text1: 'Failed to claim rewards: ' + (error.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpload = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.from('uploads').insert([
        {
          user_pubkey: publicKey.toBase58(),
          strain,
          type,
          thc: parseFloat(thc),
          terpenes: parseFloat(terpenes),
        }
      ]);
      if (error) throw error;

      console.log('Uploaded Data:', { strain, type, thc, terpenes });
      Toast.show({ type: 'success', text1: 'Data uploaded successfully!' });
      setStrain(''); setType(''); setThc(''); setTerpenes('');

      // Refresh user uploads to show in history
      supabase.from('uploads').select('*').eq('user_pubkey', publicKey.toBase58()).then(({ data }) => setUserUploads(data || []));
    } catch (error) {
      console.error('Upload Error:', error);
      Toast.show({ type: 'error', text1: 'Failed to upload data: ' + (error.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  const handleVoteChange = (strain, value) => {
    const numValue = Number(value);
    if (numValue >= 1 && numValue <= 10) {
      setVotes(prev => ({ ...prev, [strain]: numValue }));
    } else if (value === '') {
      setVotes(prev => ({ ...prev, [strain]: 0 }));
    }
  };

  const handleVoteSubmit = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      // Check if user has already voted in this flight
      const { data: existingVotes, error: checkError } = await supabase.from('votes').select('id').eq('user_pubkey', publicKey.toBase58()).eq('flight', CURRENT_FLIGHT).limit(1);
      if (checkError) throw checkError;
      if (existingVotes.length > 0) {
        Toast.show({ type: 'error', text1: 'You have already voted and claimed in this flight' });
        return;
      }

      const voteEntries = Object.entries(votes).filter(([_, amount]) => amount > 0);
      if (voteEntries.length === 0) {
        Toast.show({ type: 'error', text1: 'No votes entered' });
        return;
      }

      for (const [strain, vote_amount] of voteEntries) {
        const { data, error } = await supabase.from('votes').insert([
          {
            user_pubkey: publicKey.toBase58(),
            strain,
            vote_amount,
            flight: CURRENT_FLIGHT,
          }
        ]);
        if (error) throw error;
        console.log('Vote Submitted for', strain, ':', { vote_amount });
      }

      await claimRewards(publicKey);
      Toast.show({ type: 'success', text1: 'Votes submitted successfully!' });
      setVotes(voteStrains.reduce((acc, s) => ({ ...acc, [s.value]: '' }), {}));
      // Refresh total votes (per flight)
      supabase.from('votes').select('*').eq('flight', CURRENT_FLIGHT).then(({ data, error }) => {
        if (error) console.error('Total votes refresh error:', error);
        const agg = (data || []).reduce((acc, v) => {
          acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
          return acc;
        }, {});
        setTotalVotes(agg);
      });
    } catch (err) {
      console.error('Vote Error:', JSON.stringify(err, null, 2));
      Toast.show({ type: 'error', text1: 'Failed to submit votes: ' + (err.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  // Aggregate votes by strain (user-specific, per flight)
  const aggregatedVotes = userVotes.reduce((acc, v) => {
    acc[v.strain] = (acc[v.strain] || 0) + v.vote_amount;
    return acc;
  }, {});

  // Aggregate uploads by strain (no flight filter for uploads)
  const aggregatedUploads = userUploads.reduce((acc, u) => {
    if (!acc[u.strain]) {
      acc[u.strain] = { 
        type: u.type,
        sum_thc: 0,
        sum_terpenes: 0,
        count: 0 
      };
    }
    acc[u.strain].type = u.type; // last type
    acc[u.strain].sum_thc += u.thc;
    acc[u.strain].sum_terpenes += u.terpenes;
    acc[u.strain].count += 1;
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>PUF Wallet Logo</Text>  // Replace with Image component if logo available
      {publicKey && <Text style={styles.balance}>$PUF Balance: {balance}</Text>}

      <View style={styles.walletSection}>
        <Button title="Connect Wallet" onPress={connect} style={styles.walletButton} />  // Adapt for WalletMultiButton if using mobile adapter
        {publicKey && <Text style={styles.connectedText}>Connected: {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-4)}</Text>}
      </View>

      {publicKey ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Vape Data</Text>
            <TextInput placeholder="Strain Name" value={strain} onChangeText={setStrain} style={styles.input} />
            <Picker selectedValue={type} onValueChange={setType} style={styles.picker}>
              <Picker.Item label="Select Type" value="" />
              <Picker.Item label="Sativa" value="Sativa" />
              <Picker.Item label="Indica" value="Indica" />
              <Picker.Item label="Hybrid" value="Hybrid" />
            </Picker>
            <TextInput placeholder="THC (%)" value={thc} onChangeText={setThc} keyboardType="numeric" style={styles.input} />
            <TextInput placeholder="Terpenes (%)" value={terpenes} onChangeText={setTerpenes} keyboardType="numeric" style={styles.input} />
            <Button title={loading ? 'Uploading...' : 'Upload'} onPress={handleUpload} disabled={loading} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vote on Strains</Text>
            <FlatList
              data={voteStrains}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <View style={styles.voteRow}>
                  <Text style={styles.strainLabel}>{item.label}</Text>
                  <TextInput
                    placeholder="Vote (1-10)"
                    value={votes[item.value] || ''}
                    onChangeText={(value) => handleVoteChange(item.value, value)}
                    keyboardType="numeric"
                    style={styles.voteInput}
                  />
                </View>
              )}
            />
            <Button title={loading ? 'Claiming...' : 'Submit Votes & Claim $PUF'} onPress={handleVoteSubmit} disabled={loading} />
          </View>

          {/* History Dashboard */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your History</Text>
            <Text style={styles.subTitle}>Uploads</Text>
            <FlatList
              data={Object.entries(aggregatedUploads)}
              keyExtractor={([strain]) => strain}
              renderItem={({ item: [strain, info] }) => (
                <View style={styles.uploadRow}>
                  <Text>{strain}</Text>
                  <Text>{info.type}</Text>
                  <Text>{(info.sum_thc / info.count).toFixed(1)}%</Text>
                  <Text>{(info.sum_terpenes / info.count).toFixed(1)}%</Text>
                  <Button title="Delete" onPress={async () => {
                    if (await Alert.promise('Delete all uploads for ' + strain + '?', ['Cancel', 'OK']) === 'OK') {
                      try {
                        const { error } = await supabase.from('uploads').delete().eq('user_pubkey', publicKey.toBase58()).eq('strain', strain);
                        if (error) throw error;
                        Toast.show({ type: 'success', text1: 'Upload deleted!' });
                        supabase.from('uploads').select('*').eq('user_pubkey', publicKey.toBase58()).then(({ data }) => setUserUploads(data || []));
                      } catch (err) {
                        Toast.show({ type: 'error', text1: 'Failed to delete: ' + err.message });
                      }
                    }
                  }} />
                </View>
              )}
              ListEmptyComponent={<Text>No uploads yet.</Text>}
            />
          </View>

          {/* Total Votes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Total Votes Across All Users</Text>
            <FlatList
              data={voteStrains}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <View style={styles.totalVoteRow}>
                  <Text>{item.label}</Text>
                  <Text>{totalVotes[item.value] || 0}</Text>
                </View>
              )}
            />
          </View>
        </>
      ) : (
        <Text>Connect your wallet to upload data and vote!</Text>
      )}
      <Toast />  // Add <Toast /> at root level if using react-native-toast-message
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  logo: { fontSize: 24, marginBottom: 20 },  // Adapt for Image if logo PNG
  balance: { fontSize: 18, marginBottom: 10 },
  walletSection: { marginBottom: 20 },
  walletButton: { marginBottom: 10 },
  connectedText: { fontSize: 16 },
  section: { marginBottom: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 },
  sectionTitle: { fontSize: 24, marginBottom: 10 },
  subTitle: { fontSize: 20, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 4 },
  picker: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10, borderRadius: 4 },
  voteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  strainLabel: { fontSize: 16 },
  voteInput: { borderWidth: 1, borderColor: '#ccc', padding: 10, width: 100, textAlign: 'center' },
  uploadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalVoteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
});