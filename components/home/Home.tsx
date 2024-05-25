import React from "react";
import Section from "../Section";
import Marquee from "react-fast-marquee";
import Title from "../Title";
import Image from "next/image";
import { Button } from "../ui/button";
import Link from "next/link";
import logoCrypto from "./../assets/logoCrypto.png";

const Home = () => {
  return (
    <Section
      id="home"
      classNameSection="bg-[#E53935]"
      className="flex flex-row items-center bg-[#E53935]"
    >
      <div>
        <Title>
          It's not a revolutionize crypto, <br />
          so DO NOT BUY IT
        </Title>
        <p className="text-gray-200 md:text-xl">
          Seamlessly a meme coin token on Solana, it's like thousand other meme
          token so do not buy it
        </p>
        <Button
          asChild
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[#C62828] px-6 text-sm font-medium text-white shadow transition-colors hover:bg-[#B71C1C] focus:outline-none focus:ring-2 focus:ring-[#C62828] focus:ring-offset-2"
          size="sm"
          variant="secondary"
        >
          <Link href={"/#swap"}>Swap</Link>
        </Button>
      </div>
      <div className="flex flex-col justify-center items-center">
        <Image
          width={500}
          height={500}
          src={logoCrypto.src}
          alt="Don't buy it pls"
        />
      </div>
    </Section>
  );
};

export default Home;
