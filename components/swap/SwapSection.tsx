import React from "react";
import Section from "../Section";
import Swap from "./Swap";
import Title from "../Title";

const SwapSection = () => {
  return (
    <Section
      id="swap"
      classNameSection="bg-gray-100 scroll-mt-12"
      className="flex flex-col"
    >
      <Title className="text-center text-gray-500">Swap</Title>
      <Swap onSwap={() => ""} />
    </Section>
  );
};

export default SwapSection;
