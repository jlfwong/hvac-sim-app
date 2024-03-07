import { Flex, Heading } from "@chakra-ui/react";
import React from "react";

export const ChartHeader: React.FC<{
  children?: React.ReactNode | React.ReactNode[];
}> = (props) => {
  return (
    <Heading fontSize={20} fontWeight={"normal"}>
      {props.children}
    </Heading>
  );
};

export const ChartGroup: React.FC<{
  children?: React.ReactNode | React.ReactNode[];
}> = (props) => {
  return (
    <Flex
      display="inline-flex"
      direction="column"
      fontFamily={"sans-serif"}
      textAlign={"center"}
    >
      {props.children}
    </Flex>
  );
};
