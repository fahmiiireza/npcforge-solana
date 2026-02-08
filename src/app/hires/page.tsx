'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { IDL } from '@/lib/idl';
import { PROGRAM_ID, Hire, formatUSDC, getHireTypeLabel } from '@/lib/constants';
import { PublicKey } from '@solana/web3.js';

export default function MyHires() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [hires, setHires] = useState<Hire[]>([]);
  const [npcNames, setNpcNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchMyHires();
    }
  }, [connection, wallet.publicKey]);

  const fetchMyHires = async () => {
    if (!wallet.publicKey) return;
    
    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(IDL, PROGRAM_ID, provider);
      
      const allHires = await program.account.hire.all();
      const myHires = allHires.filter(
        (h: any) => h.account.developer.toBase58() === wallet.publicKey?.toBase58()
      ) as Hire[];
      
      setHires(myHires);

      // Fetch NPC names
      const names: Record<string, string> = {};
      for (const hire of myHires) {
        try {
          const npc = await program.account.npc.fetch(hire.account.npc);
          names[hire.account.npc.toBase58()] = npc.name;
        } catch (e) {
          names[hire.account.npc.toBase58()] = 'Unknown NPC';
        }
      }
      setNpcNames(names);
    } catch (error) {
      console.error('Error fetching hires:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: BN) => {
    return new Date(timestamp.toNumber() * 1000).toLocaleDateString();
  };

  if (!wallet.publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to view your hires.</p>
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
      <h1 className="text-3xl font-bold text-gray-900 mb-2">My Hires</h1>
      <p className="text-gray-600 mb-8">NPCs you've hired for your games</p>

      {hires.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NPC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hired On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hires.map((hire) => (
                <tr key={hire.publicKey.toBase58()}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {npcNames[hire.account.npc.toBase58()] || 'Loading...'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {hire.account.npc.toBase58().slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getHireTypeLabel(hire.account.hireType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatUSDC(hire.account.amount)} USDC
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      hire.account.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {hire.account.isActive ? 'Active' : 'Completed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(hire.account.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {hire.account.expiresAt 
                      ? formatDate(hire.account.expiresAt)
                      : 'Per interaction'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
          <div className="text-gray-400 text-6xl mb-4">🎮</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hires yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Browse available NPCs and hire AI characters for your games.
          </p>
        </div>
      )}
    </div>
  );
}
