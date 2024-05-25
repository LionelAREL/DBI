import React from "react";
import { links } from "./links";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import Section from "../Section";
import logoCrypto from "./../assets/logoCrypto.png";

const BaseWalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).BaseWalletMultiButton,
  { ssr: false }
);

const Header = () => {
  const LABELS = {
    "change-wallet": "Change wallet",
    connecting: "Connecting ...",
    "copy-address": "Copy address",
    copied: "Copied",
    disconnect: "Disconnect",
    "has-wallet": "Connect",
    "no-wallet": "Connect",
  };
  return (
    <Section
      className="z-[100] fixed w-full top-0 flex flex-row justify-between backdrop-blur-md h-12 min-h-auto items-center"
      defaultHeight={false}
    >
      <Link href={"/"}>
        <Image
          src={logoCrypto.src}
          className="h-10 w-10"
          alt="logo"
          width={500}
          height={500}
        />
      </Link>
      <div className="flex flex-row gap-10">
        <nav>
          <ul className="flex flex-row gap-10 items-center">
            {links.map((link, index) => (
              <li key={index}>
                <Link
                  className="[text-shadow:_1px_1px_2px_rgb(0_0_0)] hover:underline"
                  href={"/" + link.link}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <BaseWalletMultiButton labels={LABELS} />
          </ul>
        </nav>
      </div>
    </Section>
  );
};

export default Header;
