import React, { PropsWithChildren } from "react";

const Title = ({
  children,
  className,
}: PropsWithChildren & { className?: string }) => {
  return (
    <h1
      className={`text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl my-8 ${
        className || ""
      }`}
    >
      {children}
    </h1>
  );
};

export default Title;
