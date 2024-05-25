import React, { ComponentPropsWithoutRef } from "react";

const Section = ({
  defaultHeight = true,
  classNameSection,
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  defaultHeight?: boolean;
  classNameSection?: string;
}) => {
  return (
    <section
      {...props}
      className={`w-full overflow-auto ${classNameSection || ""}`}
    >
      <div
        className={`px-8 mx-auto text-white ${props?.className || ""} ${
          defaultHeight ? "max-w-screen-2xl my-16" : ""
        }`}
      >
        {props.children}
      </div>
    </section>
  );
};

export default Section;
