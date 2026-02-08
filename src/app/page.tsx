'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import NPCCard from '@/components/NPCCard';
import { IDL } from '@/lib/idl';
import { PROGRAM_ID, NPC } from '@/lib/constants';

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNPCs();
  }, [connection]);

  const fetchNPCs = async () => {
    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(IDL, PROGRAM_ID, provider);
      
      const npcAccounts = await program.account.npc.all();
      setNpcs(npcAccounts as NPC[]);
    } catch (error) {
      console.error('Error fetching NPCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHire = (npc: NPC) => {
    // TODO: Implement hire modal/navigation
    console.log('Hiring NPC:', npc);
    alert('Hire functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hire AI NPCs for Your Games
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          NPCForge connects game developers with AI creators. Browse, hire, and integrate 
          sophisticated AI characters into your games — all powered by Solana.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
            {npcs.length} NPCs Available
          </div>
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            Low Fees (2.5%)
          </div>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            Instant Payments
          </div>
        </div>
      </div>

      {/* NPC Grid */}
      {npcs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {npcs.map((npc) => (
            <NPCCard 
              key={npc.publicKey.toBase58()} 
              npc={{
                id: npc.publicKey.toBase58(),
                creator: npc.account.creator.toBase58(),
                name: npc.account.name,
                description: npc.account.description,
                npcType: Object.keys(npc.account.npcType)[0],
                pricePerInteraction: npc.account.pricePerInteraction.toNumber(),
                monthlyPrice: npc.account.monthlyPrice.toNumber(),
                capabilities: npc.account.capabilities,
                totalHires: npc.account.totalHires.toNumber(),
                ratingCount: npc.account.ratingCount,
                ratingSum: npc.account.ratingSum,
                isActive: npc.account.isActive,
              }} 
              onHire={handleHire}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-gray-400 text-6xl mb-4">🎭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No NPCs yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Be the first to register an AI NPC! Connect your wallet and click 
            &quot;Register NPC&quot; to get started.
          </p>
        </div>
      )}
    </div>
  );
}
