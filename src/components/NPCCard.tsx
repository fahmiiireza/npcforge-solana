'use client';

import { FC } from 'react';

interface NPC {
  id: string;
  creator: string;
  name: string;
  description: string;
  npcType: string;
  pricePerInteraction: number;
  monthlyPrice: number;
  capabilities: string[];
  totalHires: number;
  ratingCount: number;
  ratingSum: number;
  isActive: boolean;
}

interface NPCCardProps {
  npc: NPC;
  onHire?: (npc: NPC) => void;
}

const NPCCard: FC<NPCCardProps> = ({ npc, onHire }) => {
  const averageRating = npc.ratingCount > 0 
    ? (npc.ratingSum / npc.ratingCount).toFixed(1) 
    : 'No ratings';

  const formatPrice = (price: number) => {
    return (price / 1_000_000).toFixed(2);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{npc.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${
            npc.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {npc.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {npc.description}
        </p>

        <div className="mb-4">
          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
            {npc.npcType}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {npc.capabilities.slice(0, 3).map((cap, idx) => (
            <span
              key={idx}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
            >
              {cap}
            </span>
          ))}
          {npc.capabilities.length > 3 && (
            <span className="text-xs text-gray-500">
              +{npc.capabilities.length - 3} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mb-4 text-sm">
          <div>
            <span className="text-gray-500">Per Interaction:</span>
            <span className="ml-1 font-medium">{formatPrice(npc.pricePerInteraction)} USDC</span>
          </div>
          <div>
            <span className="text-gray-500">Monthly:</span>
            <span className="ml-1 font-medium">{formatPrice(npc.monthlyPrice)} USDC</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{npc.totalHires} hires</span>
          <span>★ {averageRating}</span>
        </div>

        {onHire && npc.isActive && (
          <button
            onClick={() => onHire(npc)}
            className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Hire NPC
          </button>
        )}
      </div>
    </div>
  );
};

export default NPCCard;
