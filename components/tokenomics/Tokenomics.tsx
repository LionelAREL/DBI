import React from "react";
import Section from "../Section";
import { PieChart } from "@mui/x-charts/PieChart";
import Title from "../Title";

const Tokenomics = () => {
  const data = [
    { value: 10, label: "series A" },
    { value: 15, label: "series B" },
    { value: 20, label: "series C" },
  ];

  const options = {
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "blue", // Sets the text color of the legend
          font: {
            size: 16, // Sets the font size of the legend
            family: "Arial", // Sets the font family of the legend
            style: "italic", // Sets the font style of the legend
          },
        },
      },
    },
  };

  return (
    <Section id="tokenomics" classNameSection="bg-[#E53935]">
      <Title className="text-center">Tokenomic</Title>
      <div className="flex flex-col items-center gap-6">
        <p>The tokenomic is bad as fuck, so please do not buy it !</p>
        <PieChart
          series={[
            {
              data,
              highlightScope: { faded: "global", highlighted: "item" },
              faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
            },
          ]}
          height={400}
          width={600}
        />
      </div>
    </Section>
  );
};

export default Tokenomics;
