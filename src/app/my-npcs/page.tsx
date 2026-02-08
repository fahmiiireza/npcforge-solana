'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { IDL } from '@/lib/idl';
import { PROGRAM_ID, NPC, formatUSDC, getAverageRating, getNpcTypeLabel } from '@/lib/constants';

export default function MyNPCs() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [myNpcs, setMyNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchMyNPCs();
    }
  }, [connection, wallet.publicKey]);

  const fetchMyNPCs = async () => {
    if (!wallet.publicKey) return;
    
    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(IDL, PROGRAM_ID, provider);
      
      const allNpcs = await program.account.npc.all();
      const filtered = allNpcs.filter(
        (npc: any) => npc.account.creator.toBase58() === wallet.publicKey?.toBase58()
      ) as NPC[];
      
      setMyNpcs(filtered);
    } catch (error) {
      console.error('Error fetching NPCs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to view your NPCs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My NPCs</h1>
          <p className="text-gray-600 mt-1">Manage your AI characters</p>
        </div>
        <Link
          href="/register"
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          + Register New NPC
        </Link>
      </div>

      {myNpcs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myNpcs.map((npc) => (
            <div key={npc.publicKey.toBase58()} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{npc.account.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    npc.account.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {npc.account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {npc.account.description}
                </p>

                <div className="mb-4">
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    {getNpcTypeLabel(npc.account.npcType)}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Per Interaction:</span>
                    <span className="font-medium">{formatUSDC(npc.account.pricePerInteraction)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly:</span>
                    <span className="font-medium">{formatUSDC(npc.account.monthlyPrice)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Hires:</span>
                    <span className="font-medium">{npc.account.totalHires.toNumber()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rating:</span>
                    <span className="font-medium">
                      {getAverageRating(npc.account.ratingSum, npc.account.ratingCount)} ★
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 truncate">
                    API: {npc.account.apiEndpoint}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
          <div className="text-gray-400 text-6xl mb-4">🎭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No NPCs yet</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You haven't registered any AI NPCs yet. Create your first NPC to start earning!
          </p>
          <Link
            href="/register"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Register Your First NPC
          </Link>
        </div>
      )}
    </div>
  );
}
