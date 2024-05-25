import type { Metadata } from "next";
require("@solana/wallet-adapter-react-ui/styles.css");
import "./globals.css";

export const metadata: Metadata = {
  title: "Don't buy it",
  description: "Do not buy this crypto please",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
