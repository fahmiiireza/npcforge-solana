import { Idl } from '@coral-xyz/anchor';

export const IDL: Idl = {
  "version": "0.1.0",
  "name": "npcforge",
  "instructions": [
    {
      "name": "initializeMarketplace",
      "accounts": [
        { "name": "marketplace", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "registerNpc",
      "accounts": [
        { "name": "marketplace", "isMut": true, "isSigner": false },
        { "name": "npc", "isMut": true, "isSigner": false },
        { "name": "creator", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "name", "type": "string" },
        { "name": "description", "type": "string" },
        { "name": "npcType", "type": { "defined": "NpcType" } },
        { "name": "pricePerInteraction", "type": "u64" },
        { "name": "monthlyPrice", "type": "u64" },
        { "name": "apiEndpoint", "type": "string" },
        { "name": "capabilities", "type": { "vec": "string" } }
      ]
    },
    {
      "name": "hireNpc",
      "accounts": [
        { "name": "npc", "isMut": true, "isSigner": false },
        { "name": "hire", "isMut": true, "isSigner": false },
        { "name": "developer", "isMut": true, "isSigner": true },
        { "name": "escrowTokenAccount", "isMut": true, "isSigner": false },
        { "name": "escrowAuthority", "isMut": false, "isSigner": false },
        { "name": "developerTokenAccount", "isMut": true, "isSigner": false },
        { "name": "usdcMint", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "hireType", "type": { "defined": "HireType" } },
        { "name": "durationMonths", "type": { "option": "u8" } }
      ]
    },
    {
      "name": "releasePayment",
      "accounts": [
        { "name": "hire", "isMut": true, "isSigner": false },
        { "name": "npc", "isMut": true, "isSigner": false },
        { "name": "marketplace", "isMut": false, "isSigner": false },
        { "name": "escrowTokenAccount", "isMut": true, "isSigner": false },
        { "name": "creatorTokenAccount", "isMut": true, "isSigner": false },
        { "name": "feeTokenAccount", "isMut": true, "isSigner": false },
        { "name": "escrowAuthority", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "submitReview",
      "accounts": [
        { "name": "npc", "isMut": true, "isSigner": false },
        { "name": "hire", "isMut": false, "isSigner": false },
        { "name": "review", "isMut": true, "isSigner": false },
        { "name": "reviewer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "rating", "type": "u8" },
        { "name": "comment", "type": "string" }
      ]
    },
    {
      "name": "updateNpc",
      "accounts": [
        { "name": "npc", "isMut": true, "isSigner": false },
        { "name": "creator", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "pricePerInteraction", "type": { "option": "u64" } },
        { "name": "monthlyPrice", "type": { "option": "u64" } },
        { "name": "isActive", "type": { "option": "bool" } }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Marketplace",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "npcCount", "type": "u64" },
          { "name": "feePercent", "type": "u16" }
        ]
      }
    },
    {
      "name": "Npc",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "creator", "type": "publicKey" },
          { "name": "name", "type": "string" },
          { "name": "description", "type": "string" },
          { "name": "npcType", "type": { "defined": "NpcType" } },
          { "name": "pricePerInteraction", "type": "u64" },
          { "name": "monthlyPrice", "type": "u64" },
          { "name": "apiEndpoint", "type": "string" },
          { "name": "capabilities", "type": { "vec": "string" } },
          { "name": "isActive", "type": "bool" },
          { "name": "totalHires", "type": "u64" },
          { "name": "ratingSum", "type": "u32" },
          { "name": "ratingCount", "type": "u32" },
          { "name": "createdAt", "type": "i64" }
        ]
      }
    },
    {
      "name": "Hire",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "developer", "type": "publicKey" },
          { "name": "npc", "type": "publicKey" },
          { "name": "creator", "type": "publicKey" },
          { "name": "hireType", "type": { "defined": "HireType" } },
          { "name": "amount", "type": "u64" },
          { "name": "escrowTokenAccount", "type": "publicKey" },
          { "name": "isActive", "type": "bool" },
          { "name": "createdAt", "type": "i64" },
          { "name": "expiresAt", "type": { "option": "i64" } }
        ]
      }
    },
    {
      "name": "Review",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "reviewer", "type": "publicKey" },
          { "name": "npc", "type": "publicKey" },
          { "name": "hire", "type": "publicKey" },
          { "name": "rating", "type": "u8" },
          { "name": "comment", "type": "string" },
          { "name": "createdAt", "type": "i64" }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "NpcType",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "QuestGiver" },
          { "name": "Shopkeeper" },
          { "name": "Enemy" },
          { "name": "Companion" },
          { "name": "StoryTeller" },
          { "name": "Custom" }
        ]
      }
    },
    {
      "name": "HireType",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "PerInteraction" },
          { "name": "Monthly" }
        ]
      }
    }
  ]
} as unknown as Idl;
