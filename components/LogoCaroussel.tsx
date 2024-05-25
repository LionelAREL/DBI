import Image from "next/image";
import React, { ComponentPropsWithoutRef } from "react";
import Marquee from "react-fast-marquee";
import logoCrypto from "./assets/logoCrypto.png";

const Logo = () => {
  return (
    <Image
      className="mx-4 inline h-32 w-32"
      height={500}
      width={500}
      src={logoCrypto.src}
      alt="Don't buy it"
    />
  );
};

const LogoCaroussel = (props: ComponentPropsWithoutRef<"div">) => {
  return (
    <Marquee
      gradient={true}
      gradientWidth={300}
      {...props}
      gradientColor="bg-gray-100"
      className={`hover:cursor-pointer ${props.className || ""}`}
    >
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
      <Logo />
    </Marquee>
  );
};

export default LogoCaroussel;
