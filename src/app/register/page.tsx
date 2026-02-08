'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { useRouter } from 'next/navigation';
import { IDL } from '@/lib/idl';
import { PROGRAM_ID, NPC_TYPES } from '@/lib/constants';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export default function RegisterNPC() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    npcType: 'shopkeeper',
    pricePerInteraction: '',
    monthlyPrice: '',
    apiEndpoint: '',
    capabilities: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey) {
      alert('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      const provider = new AnchorProvider(connection, wallet as any, {});
      const program = new Program(IDL, PROGRAM_ID, provider);

      const [marketplace] = PublicKey.findProgramAddressSync(
        [Buffer.from('marketplace')],
        PROGRAM_ID
      );

      const marketplaceAccount = await program.account.marketplace.fetch(marketplace);
      const npcCount = marketplaceAccount.npcCount.toNumber();

      const [npcPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('npc'), marketplace.toBuffer(), Buffer.from([npcCount])],
        PROGRAM_ID
      );

      const npcType = NPC_TYPES.find(t => Object.keys(t.value)[0] === formData.npcType)?.value || { shopkeeper: {} };

      await program.methods
        .registerNpc(
          formData.name,
          formData.description,
          npcType,
          new BN(parseFloat(formData.pricePerInteraction) * 1_000_000),
          new BN(parseFloat(formData.monthlyPrice) * 1_000_000),
          formData.apiEndpoint,
          formData.capabilities.split(',').map(c => c.trim())
        )
        .accounts({
          marketplace,
          npc: npcPda,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert('NPC registered successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error registering NPC:', error);
      alert('Failed to register NPC. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.publicKey) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to register an NPC.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Your AI NPC</h1>
      <p className="text-gray-600 mb-8">
        List your AI character on NPCForge and start earning from game developers.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NPC Name</label>
          <input
            type="text"
            required
            maxLength={50}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            placeholder="e.g., Merchant AI"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            required
            maxLength={500}
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            placeholder="Describe what your NPC can do..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NPC Type</label>
          <select
            value={formData.npcType}
            onChange={(e) => setFormData({ ...formData, npcType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
          >
            {NPC_TYPES.map((type) => (
              <option key={Object.keys(type.value)[0]} value={Object.keys(type.value)[0]}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Per Interaction (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.pricePerInteraction}
              onChange={(e) => setFormData({ ...formData, pricePerInteraction: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              placeholder="0.10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Price (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.monthlyPrice}
              onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              placeholder="5.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
          <input
            type="url"
            required
            maxLength={200}
            value={formData.apiEndpoint}
            onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            placeholder="https://api.yourservice.com/npc/character-001"
          />
          <p className="text-sm text-gray-500 mt-1">
            Game developers will send requests to this endpoint to interact with your NPC.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capabilities</label>
          <input
            type="text"
            required
            value={formData.capabilities}
            onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            placeholder="trade, dialogue, quest-giver"
          />
          <p className="text-sm text-gray-500 mt-1">Comma-separated list of capabilities.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Registering...' : 'Register NPC'}
        </button>
      </form>
    </div>
  );
}
