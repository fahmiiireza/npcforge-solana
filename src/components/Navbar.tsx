'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-purple-400">
              NPCForge
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link
                  href="/"
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Browse NPCs
                </Link>
                <Link
                  href="/register"
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Register NPC
                </Link>
                <Link
                  href="/my-npcs"
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My NPCs
                </Link>
                <Link
                  href="/hires"
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Hires
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <WalletMultiButton className="bg-purple-600 hover:bg-purple-700" />
          </div>
        </div>
      </div>
    </nav>
  );
}
