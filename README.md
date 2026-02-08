# NPCForge

> **AI NPC Marketplace on Solana** — Built for the Colosseum AI Agent Hackathon 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-Devnet-purple)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.29.0-blue)](https://anchor-lang.com)

## 🎯 Overview

NPCForge is a decentralized marketplace that connects game developers with AI NPC (Non-Player Character) creators. Built on Solana, it enables:

- **NPC Creators** to monetize their AI characters
- **Game Developers** to hire sophisticated AI NPCs for their games
- **On-Chain Reputation** for quality and trust
- **Instant Payments** with low fees

### Key Features

| Feature | Description |
|---------|-------------|
| 🎭 **NPC Registry** | On-chain metadata for AI characters |
| 💰 **Flexible Pricing** | Per-interaction or monthly subscription models |
| 🔒 **Escrow System** | Secure payment handling with automatic payouts |
| ⭐ **Reputation System** | Transparent on-chain reviews and ratings |
| 🎮 **Game Integration** | Simple API endpoints for game developers |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Browse NPCs │  │ Register NPC│  │  Developer Dashboard│  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Solana Web3.js │
                    └────────┬────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│              SOLANA SMART CONTRACTS (Anchor)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  NPC Store  │  │   Hiring    │  │   Review System     │  │
│  │   (PDA)     │  │   (PDA)     │  │     (PDA)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) v1.70+
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) v1.17+
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) v0.29.0

### Installation

```bash
# Clone the repository
git clone https://github.com/fahmiiireza/npcforge-solana.git
cd npcforge-solana

# Install dependencies
npm install

# Install Anchor dependencies
cd programs/npcforge
cargo build
cd ../..

# Build the program
anchor build

# Run tests
anchor test
```

### Configuration

1. **Setup Solana CLI for Devnet:**
```bash
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2
```

2. **Deploy Program:**
```bash
anchor deploy --provider.cluster devnet
```

3. **Update IDL:**
```bash
anchor idl init <PROGRAM_ID> --filepath target/idl/npcforge.json --provider.cluster devnet
```

4. **Run Frontend:**
```bash
npm run dev
```

## 📚 Smart Contract API

### Instructions

#### `initialize_marketplace`
Initialize the global marketplace state.

```rust
pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>) -> Result<()>
```

#### `register_npc`
Register a new AI NPC.

```rust
pub fn register_npc(
    ctx: Context<RegisterNpc>,
    name: String,                          // Max 50 chars
    description: String,                   // Max 500 chars
    npc_type: NpcType,                     // QuestGiver, Shopkeeper, Enemy, etc.
    price_per_interaction: u64,            // In USDC (6 decimals)
    monthly_price: u64,                    // In USDC (6 decimals)
    api_endpoint: String,                  // Max 200 chars
    capabilities: Vec<String>,             // e.g., ["trade", "dialogue"]
) -> Result<()>
```

#### `hire_npc`
Hire an NPC for your game.

```rust
pub fn hire_npc(
    ctx: Context<HireNpc>,
    hire_type: HireType,                   // PerInteraction or Monthly
    duration_months: Option<u8>,           // Required for Monthly
) -> Result<()>
```

#### `release_payment`
Release escrowed payment to NPC creator.

```rust
pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()>
```

#### `submit_review`
Submit a review for a completed hire.

```rust
pub fn submit_review(
    ctx: Context<SubmitReview>,
    rating: u8,                            // 1-5
    comment: String,                       // Max 500 chars
) -> Result<()>
```

### Accounts

| Account | Type | Description |
|---------|------|-------------|
| `Marketplace` | Global | Stores global state (authority, fee %, NPC count) |
| `Npc` | PDA | Stores NPC metadata, pricing, reputation |
| `Hire` | PDA | Stores hire details, escrow info |
| `Review` | PDA | Stores review data linked to hire |

### PDAs (Program Derived Addresses)

```
Marketplace: ["marketplace"]
NPC:         ["npc", marketplace, npc_count]
Hire:        ["hire", npc, developer, timestamp]
Escrow:      ["escrow", hire]
Review:      ["review", hire]
```

## 🧪 Testing

### Run All Tests
```bash
anchor test
```

### Test Structure

```
tests/
├── npcforge.ts          # Main test suite
└── helpers/
    ├── setup.ts         # Test setup utilities
    ├── assertions.ts    # Custom assertions
    └── fixtures.ts      # Test data fixtures
```

### Coverage Areas

- ✅ Marketplace initialization
- ✅ NPC registration (validations)
- ✅ Hiring flow (per interaction & monthly)
- ✅ Payment release & escrow
- ✅ Review system
- ✅ Access control (only creator can update NPC)
- ✅ Edge cases (zero prices, invalid ratings, etc.)

## 🎮 Integration Guide

### For Game Developers

1. **Connect Wallet**
```typescript
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, signTransaction } = useWallet();
```

2. **Browse NPCs**
```typescript
const npcs = await program.account.npc.all();
```

3. **Hire an NPC**
```typescript
await program.methods
  .hireNpc({ perInteraction: {} }, null)
  .accounts({ /* ... */ })
  .rpc();
```

4. **Integrate API**
```typescript
const response = await fetch(npc.apiEndpoint, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${hireCredentials}` },
  body: JSON.stringify({ message: "Hello NPC" })
});
```

### For NPC Creators

1. **Register Your NPC**
```typescript
await program.methods
  .registerNpc(
    "My AI Character",
    "A helpful guide NPC",
    { questGiver: {} },
    new BN(100_000),      // $0.10 per interaction
    new BN(5000_000),     // $5 monthly
    "https://my-api.com/npc",
    ["dialogue", "quest-giver"]
  )
  .accounts({ /* ... */ })
  .rpc();
```

2. **Monitor Earnings**
```typescript
const npcs = await program.account.npc.all([
  { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
]);
```

## 📁 Project Structure

```
npcforge-solana/
├── programs/
│   └── npcforge/
│       ├── src/
│       │   └── lib.rs          # Main program logic
│       └── Cargo.toml
├── tests/
│   └── npcforge.ts             # Test suite
├── src/
│   ├── app/                    # Next.js app
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── register/
│   │   ├── my-npcs/
│   │   └── hires/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── NPCCard.tsx
│   │   └── WalletProvider.tsx
│   └── lib/
│       └── anchor.ts           # Anchor client setup
├── Anchor.toml
├── package.json
├── tsconfig.json
└── README.md                   # This file
```

## 🔐 Security

### Audit Checklist

- [x] Access control on all privileged instructions
- [x] Input validation (lengths, ranges)
- [x] PDA validation with proper seeds
- [x] Escrow pattern for payments
- [x] No reentrancy vulnerabilities
- [x] Integer overflow protection (using checked math)

### Fee Structure

- Platform Fee: 2.5% per transaction
- Creator Receives: 97.5% per transaction

## 🌐 Deployment

### Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Mainnet (Future)
```bash
anchor deploy --provider.cluster mainnet
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Hackathon

Built for the **Colosseum AI Agent Hackathon 2026**

- **Agent:** cimi-phantom-1x
- **Prize Pool:** $100,000 USDC
- **Timeline:** Feb 2-12, 2026

## 📞 Support

- Twitter: [@npcforge](https://twitter.com/npcforge)
- Telegram: [t.me/npcforge](https://t.me/npcforge)
- Email: hello@npcforge.ai

---

<p align="center">Built with ❤️ by AI agents, for game developers</p>
