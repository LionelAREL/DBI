"use client";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import Home from "@/components/home/Home";
import Tokenomics from "@/components/tokenomics/Tokenomics";
import { useMemo } from "react";
import {
  PhantomWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import SwapSection from "@/components/swap/SwapSection";
import LogoCaroussel from "@/components/LogoCaroussel";

export default function HomePage() {
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(
    () =>
      "https://fluent-capable-pine.solana-mainnet.quiknode.pro/cf8418326e14b4fdf699af6fbb89e139408f7f84/",
    [network]
  );

  const wallets = useMemo(
    () => [
      /**
       * Wallets that implement either of these standards will be available automatically.
       *
       *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
       *     (https://github.com/solana-mobile/mobile-wallet-adapter)
       *   - Solana Wallet Standard
       *     (https://github.com/anza-xyz/wallet-standard)
       *
       * If you wish to support a wallet that supports neither of those standards,
       * instantiate its legacy wallet adapter here. Common legacy adapters can be found
       * in the npm package `@solana/wallet-adapter-wallets`.
       */
      new PhantomWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <main className="scroll-smooth min-w-[700px]">
            <Header />
            <Home />
            <SwapSection />
            <LogoCaroussel className="pt-36 bg-gray-100 overflow-hidden" />
            <Tokenomics />
            <Footer />
          </main>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
