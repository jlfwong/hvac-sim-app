import { Flex, Text } from "@chakra-ui/react";
import React from "react";

export const ChartHeader: React.FC<{
  children?: React.ReactNode | React.ReactNode[];
}> = (props) => {
  return <Text>{props.children}</Text>;
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
      width="full"
    >
      {props.children}
    </Flex>
  );
};
