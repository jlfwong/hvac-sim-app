import { chakra, Flex, FormControl } from "@chakra-ui/react";

export const Paragraphs = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    marginTop: "20px",
    marginBottom: "20px",
    fontSize: "25px",
    fontFamily: "Averia Serif Libre",
    lineHeight: "150%",
    gap: "1em",
  },
});

export const Big = chakra("p", {
  baseStyle: {
    fontSize: "150%",
  },
});

export const FullWidthFormControl = chakra(FormControl, {
  baseStyle: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
  },
});
