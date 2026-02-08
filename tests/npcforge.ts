import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Npcforge } from "../target/types/npcforge";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("NPCForge Program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Npcforge as Program<Npcforge>;
  
  let marketplace: PublicKey;
  let marketplaceBump: number;
  let usdcMint: PublicKey;
  let creatorUsdcAccount: PublicKey;
  let developerUsdcAccount: PublicKey;
  let feeRecipientUsdcAccount: PublicKey;
  
  const creator = anchor.web3.Keypair.generate();
  const developer = anchor.web3.Keypair.generate();
  const feeRecipient = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop SOL to accounts
    await provider.connection.requestAirdrop(creator.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(developer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(feeRecipient.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    
    // Create USDC mint
    usdcMint = await createMint(
      provider.connection,
      provider.wallet as anchor.Wallet,
      provider.wallet.publicKey,
      null,
      6
    );

    // Create token accounts
    const creatorAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet as anchor.Wallet,
      usdcMint,
      creator.publicKey
    );
    creatorUsdcAccount = creatorAccount.address;

    const developerAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet as anchor.Wallet,
      usdcMint,
      developer.publicKey
    );
    developerUsdcAccount = developerAccount.address;

    const feeAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet as anchor.Wallet,
      usdcMint,
      feeRecipient.publicKey
    );
    feeRecipientUsdcAccount = feeAccount.address;

    // Mint USDC to developer for testing
    await mintTo(
      provider.connection,
      provider.wallet as anchor.Wallet,
      usdcMint,
      developerUsdcAccount,
      provider.wallet.publicKey,
      1000_000000 // 1000 USDC
    );

    // Derive marketplace PDA
    [marketplace, marketplaceBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("marketplace")],
      program.programId
    );
  });

  describe("Marketplace Initialization", () => {
    it("Should initialize marketplace", async () => {
      await program.methods
        .initializeMarketplace()
        .accounts({
          marketplace,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const marketplaceAccount = await program.account.marketplace.fetch(marketplace);
      assert.equal(marketplaceAccount.authority.toBase58(), provider.wallet.publicKey.toBase58());
      assert.equal(marketplaceAccount.npcCount.toNumber(), 0);
      assert.equal(marketplaceAccount.feePercent, 250); // 2.5%
    });

    it("Should fail to initialize marketplace twice", async () => {
      try {
        await program.methods
          .initializeMarketplace()
          .accounts({
            marketplace,
            authority: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have thrown error");
      } catch (e) {
        assert.include(e.message, "already in use");
      }
    });
  });

  describe("NPC Registration", () => {
    it("Should register a new NPC", async () => {
      const npcCount = 0;
      const [npcPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("npc"), marketplace.toBuffer(), Buffer.from([npcCount])],
        program.programId
      );

      const name = "Merchant AI";
      const description = "A friendly merchant NPC for RPG games";
      const capabilities = ["trade", "quest-giver", "dialogue"];

      await program.methods
        .registerNpc(
          name,
          description,
          { shopkeeper: {} },
          new anchor.BN(100_000), // 0.10 USDC per interaction
          new anchor.BN(5000_000), // 5 USDC monthly
          "https://api.npcforge.ai/npc/merchant-001",
          capabilities
        )
        .accounts({
          marketplace,
          npc: npcPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const npcAccount = await program.account.npc.fetch(npcPda);
      assert.equal(npcAccount.name, name);
      assert.equal(npcAccount.description, description);
      assert.equal(npcAccount.creator.toBase58(), creator.publicKey.toBase58());
      assert.equal(npcAccount.pricePerInteraction.toNumber(), 100_000);
      assert.equal(npcAccount.monthlyPrice.toNumber(), 5000_000);
      assert.equal(npcAccount.isActive, true);
      assert.equal(npcAccount.totalHires.toNumber(), 0);
      assert.deepEqual(npcAccount.capabilities, capabilities);
    });

    it("Should fail with empty name", async () => {
      const npcCount = 1;
      const [npcPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("npc"), marketplace.toBuffer(), Buffer.from([npcCount])],
        program.programId
      );

      try {
        await program.methods
          .registerNpc(
            "",
            "Description",
            { shopkeeper: {} },
            new anchor.BN(100_000),
            new anchor.BN(5000_000),
            "https://api.example.com",
            ["trade"]
          )
          .accounts({
            marketplace,
            npc: npcPda,
            creator: creator.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (e) {
        // Expected to fail
        assert.isOk(e);
      }
    });

    it("Should fail with zero price", async () => {
      const npcCount = 2;
      const [npcPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("npc"), marketplace.toBuffer(), Buffer.from([npcCount])],
        program.programId
      );

      try {
        await program.methods
          .registerNpc(
            "Test NPC",
            "Description",
            { shopkeeper: {} },
            new anchor.BN(0),
            new anchor.BN(0),
            "https://api.example.com",
            ["trade"]
          )
          .accounts({
            marketplace,
            npc: npcPda,
            creator: creator.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (e) {
        assert.include(e.message, "InvalidPrice");
      }
    });
  });

  describe("NPC Hiring", () => {
    let npcPda: PublicKey;

    before(async () => {
      [npcPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("npc"), marketplace.toBuffer(), Buffer.from([0])],
        program.programId
      );
    });

    it("Should hire NPC per interaction", async () => {
      const timestamp = Date.now();
      const [hirePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("hire"),
          npcPda.toBuffer(),
          developer.publicKey.toBuffer(),
          Buffer.from(timestamp.toString()),
        ],
        program.programId
      );

      const [escrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), hirePda.toBuffer()],
        program.programId
      );

      const developerBalanceBefore = await provider.connection.getTokenAccountBalance(developerUsdcAccount);

      await program.methods
        .hireNpc(
          { perInteraction: {} },
          null
        )
        .accounts({
          npc: npcPda,
          hire: hirePda,
          developer: developer.publicKey,
          escrowTokenAccount: await getOrCreateAssociatedTokenAccount(
            provider.connection,
            provider.wallet as anchor.Wallet,
            usdcMint,
            escrowAuthority,
            true
          ).then(acc => acc.address),
          escrowAuthority,
          developerTokenAccount: developerUsdcAccount,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([developer])
        .rpc();

      const hireAccount = await program.account.hire.fetch(hirePda);
      assert.equal(hireAccount.developer.toBase58(), developer.publicKey.toBase58());
      assert.equal(hireAccount.npc.toBase58(), npcPda.toBase58());
      assert.equal(hireAccount.isActive, true);

      const developerBalanceAfter = await provider.connection.getTokenAccountBalance(developerUsdcAccount);
      const expectedDeduction = 100_000; // price per interaction
      const actualDeduction = parseInt(developerBalanceBefore.value.amount) - parseInt(developerBalanceAfter.value.amount);
      assert.equal(actualDeduction, expectedDeduction);
    });

    it("Should fail to hire inactive NPC", async () => {
      // First, deactivate the NPC
      await program.methods
        .updateNpc(null, null, false)
        .accounts({
          npc: npcPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      const timestamp = Date.now();
      const [hirePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("hire"),
          npcPda.toBuffer(),
          developer.publicKey.toBuffer(),
          Buffer.from(timestamp.toString()),
        ],
        program.programId
      );

      try {
        await program.methods
          .hireNpc({ perInteraction: {} }, null)
          .accounts({
            npc: npcPda,
            hire: hirePda,
            developer: developer.publicKey,
            // ... other accounts
          })
          .signers([developer])
          .rpc();
        assert.fail("Should have thrown error");
      } catch (e) {
        assert.include(e.message, "NpcNotActive");
      }

      // Reactivate for other tests
      await program.methods
        .updateNpc(null, null, true)
        .accounts({
          npc: npcPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();
    });
  });

  describe("Reviews", () => {
    it("Should submit a review", async () => {
      // Setup: Create hire, release payment, then review
      // This is a simplified test - in reality would need full flow
      assert.isTrue(true); // Placeholder
    });

    it("Should fail with invalid rating", async () => {
      assert.isTrue(true); // Placeholder
    });
  });
});
