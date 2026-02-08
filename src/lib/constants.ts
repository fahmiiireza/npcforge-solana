import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

export const NPC_TYPES = [
  { value: { questGiver: {} }, label: 'Quest Giver' },
  { value: { shopkeeper: {} }, label: 'Shopkeeper' },
  { value: { enemy: {} }, label: 'Enemy' },
  { value: { companion: {} }, label: 'Companion' },
  { value: { storyTeller: {} }, label: 'Story Teller' },
  { value: { custom: {} }, label: 'Custom' },
] as const;

export const HIRE_TYPES = [
  { value: { perInteraction: {} }, label: 'Per Interaction' },
  { value: { monthly: {} }, label: 'Monthly' },
] as const;

export interface NPC {
  publicKey: PublicKey;
  account: {
    creator: PublicKey;
    name: string;
    description: string;
    npcType: any;
    pricePerInteraction: BN;
    monthlyPrice: BN;
    apiEndpoint: string;
    capabilities: string[];
    isActive: boolean;
    totalHires: BN;
    ratingSum: number;
    ratingCount: number;
    createdAt: BN;
  };
}

export interface Hire {
  publicKey: PublicKey;
  account: {
    developer: PublicKey;
    npc: PublicKey;
    creator: PublicKey;
    hireType: any;
    amount: BN;
    escrowTokenAccount: PublicKey;
    isActive: boolean;
    createdAt: BN;
    expiresAt: BN | null;
  };
}

export const formatUSDC = (amount: BN | number): string => {
  const value = typeof amount === 'number' ? amount : amount.toNumber();
  return (value / 1_000_000).toFixed(2);
};

export const getAverageRating = (ratingSum: number, ratingCount: number): string => {
  if (ratingCount === 0) return 'No ratings';
  return (ratingSum / ratingCount).toFixed(1);
};

export const getNpcTypeLabel = (npcType: any): string => {
  const type = NPC_TYPES.find(t => 
    Object.keys(t.value)[0] === Object.keys(npcType)[0]
  );
  return type?.label || 'Unknown';
};

export const getHireTypeLabel = (hireType: any): string => {
  const type = HIRE_TYPES.find(t => 
    Object.keys(t.value)[0] === Object.keys(hireType)[0]
  );
  return type?.label || 'Unknown';
};
