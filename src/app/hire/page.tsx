'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { IDL } from '@/lib/idl';
import { PROGRAM_ID, NPC, formatUSDC, getNpcTypeLabel, HIRE_TYPES } from '@/lib/constants';
import { useSearchParams } from 'next/navigation';

const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export default function HirePage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const searchParams = useSearchParams();
  const npcPubkey = searchParams.get('npc');
  
  const [npc, setNpc] = useState<NPC | null>(null);
  const [hireType, setHireType] = useState<'perInteraction' | 'monthly'>('perInteraction');
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (npcPubkey) {
      fetchNPC();
    }
  }, [npcPubkey, connection]);

  const fetchNPC = async () => {
    if (!npcPubkey) return;
    
    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(IDL, PROGRAM_ID, provider);
      
      const npcAccount = await program.account.npc.fetch(new PublicKey(npcPubkey));
      setNpc({
        publicKey: new PublicKey(npcPubkey),
        account: npcAccount as any,
      });
    } catch (error) {
      console.error('Error fetching NPC:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!npc) return 0;
    if (hireType === 'perInteraction') {
      return npc.account.pricePerInteraction.toNumber();
    } else {
      return npc.account.monthlyPrice.toNumber() * duration;
    }
  };

  const handleHire = async () => {
    if (!wallet.publicKey || !npc) return;

    setLoading(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(IDL, PROGRAM_ID, provider);

      const [marketplace] = PublicKey.findProgramAddressSync(
        [Buffer.from('marketplace')],
        PROGRAM_ID
      );

      const timestamp = Date.now();
      const [hirePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('hire'),
          npc.publicKey.toBuffer(),
          wallet.publicKey.toBuffer(),
          Buffer.from(timestamp.toString()),
        ],
        PROGRAM_ID
      );

      const [escrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), hirePda.toBuffer()],
        PROGRAM_ID
      );

      const developerTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT_DEVNET,
        wallet.publicKey
      );

      const escrowTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT_DEVNET,
        escrowAuthority,
        true
      );

      // Check if escrow token account exists
      const escrowAccountInfo = await connection.getAccountInfo(escrowTokenAccount);
      const transaction = new web3.Transaction();

      if (!escrowAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            escrowTokenAccount,
            escrowAuthority,
            USDC_MINT_DEVNET
          )
        );
      }

      const hireIx = await program.methods
        .hireNpc(
          hireType === 'perInteraction' ? { perInteraction: {} } : { monthly: {} },
          hireType === 'monthly' ? duration : null
        )
        .accounts({
          npc: npc.publicKey,
          hire: hirePda,
          developer: wallet.publicKey,
          escrowTokenAccount,
          escrowAuthority,
          developerTokenAccount,
          usdcMint: USDC_MINT_DEVNET,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .instruction();

      transaction.add(hireIx);

      const signature = await wallet.sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);

      alert('NPC hired successfully!');
      window.location.href = '/hires';
    } catch (error) {
      console.error('Error hiring NPC:', error);
      alert('Failed to hire NPC. Make sure you have enough USDC.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!npc) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">NPC Not Found</h2>
        <p className="text-gray-600">The NPC you're looking for doesn't exist.</p>
      </div>
    );
  }

  if (!wallet.publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to hire this NPC.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Hire NPC</h1>
      <p className="text-gray-600 mb-8">Add this AI character to your game</p>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{npc.account.name}</h2>
        <p className="text-gray-600 mb-4">{npc.account.description}</p>
        
        <div className="flex items-center gap-4 mb-4">
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
            {getNpcTypeLabel(npc.account.npcType)}
          </span>
          <span className="text-sm text-gray-500">
            ★ {npc.account.ratingCount > 0 
              ? (npc.account.ratingSum / npc.account.ratingCount).toFixed(1) 
              : 'No ratings'}
          </span>
        </div>

        <div className="space-y-2 text-sm border-t border-gray-200 pt-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Per Interaction:</span>
            <span className="font-medium">{formatUSDC(npc.account.pricePerInteraction)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Monthly:</span>
            <span className="font-medium">{formatUSDC(npc.account.monthlyPrice)} USDC</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Hire Type</h3>
        
        <div className="space-y-4 mb-6">
          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              value="perInteraction"
              checked={hireType === 'perInteraction'}
              onChange={(e) => setHireType(e.target.value as any)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">Per Interaction</div>
              <div className="text-sm text-gray-500">
                Pay {formatUSDC(npc.account.pricePerInteraction)} USDC per API call
              </div>
            </div>
          </label>

          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              value="monthly"
              checked={hireType === 'monthly'}
              onChange={(e) => setHireType(e.target.value as any)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium">Monthly Subscription</div>
              <div className="text-sm text-gray-500">
                Unlimited access for a fixed monthly fee
              </div>
            </div>
          </label>
        </div>

        {hireType === 'monthly' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (months)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {[1, 2, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m} month{m > 1 ? 's' : ''} - {formatUSDC(npc.account.monthlyPrice.toNumber() * m)} USDC
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total:</span>
            <span className="text-2xl font-bold text-purple-600">
              {formatUSDC(calculateTotal())} USDC
            </span>
          </div>
        </div>

        <button
          onClick={handleHire}
          disabled={loading || !npc.account.isActive}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : !npc.account.isActive ? 'NPC Not Available' : 'Confirm Hire'}
        </button>
      </div>
    </div>
  );
}
