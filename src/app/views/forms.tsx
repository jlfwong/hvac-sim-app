import {
  FormControl,
  FormLabel,
  Input,
  Select,
  type InputProps,
  type SelectProps,
  Flex,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  type StackProps,
} from "@chakra-ui/react";
import { Box, Heading, Stack } from "@chakra-ui/react";
import React, { forwardRef, useState } from "react";

interface FormSectionViewProps {
  title: string;
  children: React.ReactNode;
  stripeColor?: string;
}

export const FormSectionView: React.FC<FormSectionViewProps> = (props) => {
  let stackProps: StackProps = {
    spacing: "10px",
    paddingTop: "10px",
  };

  if (props.stripeColor != null) {
    stackProps.borderLeftColor = props.stripeColor;
    stackProps.borderLeftWidth = "5px";
    stackProps.paddingLeft = "10px";
    stackProps.paddingTop = "5px";
  }

  return (
    <Stack as="section" gap={0}>
      <Box>
        <Heading size="small">{props.title}</Heading>
        <hr />
      </Box>
      <Stack {...stackProps}>{props.children}</Stack>
    </Stack>
  );
};

interface FormInputProps {
  label: string;
  placeholder?: string;
}

export const FormRow: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <Flex
      direction={{ base: "column", med: "row" }}
      alignItems="end"
      gap={"10px"}
    >
      {props.children}
    </Flex>
  );
};

export const FormInput = forwardRef<
  HTMLInputElement,
  FormInputProps & InputProps
>(({ label, ...props }, ref) => (
  <FormControl>
    <FormLabel mb={"3px"}>{label}</FormLabel>
    <Input {...props} ref={ref} />
  </FormControl>
));
interface FormSelectProps {
  label: string;
  children: React.ReactNode;
}

export const FormSelect: React.FC<FormSelectProps & SelectProps> = ({
  label,
  children,
  ...props
}) => (
  <FormControl>
    <FormLabel mb={"3px"}>{label}</FormLabel>
    <Select {...props}>{children}</Select>
  </FormControl>
);

interface NumericFormInputViewProps
  extends Omit<InputProps, "value" | "prefix"> {
  label: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  value: number | null;
  setValue: (value: number) => void;
  minValue: number;
  maxValue: number;
  isDisabled?: boolean;
  step?: number;
}

export const NumericFormInputView: React.FC<NumericFormInputViewProps> = ({
  value,
  minValue,
  maxValue,
  setValue,
  isDisabled,
  prefix,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value?.toString() ?? null);

  function isValid(numeric: number) {
    if (isNaN(numeric) || numeric < minValue || numeric > maxValue) {
      return false;
    }
    return true;
  }

  const isInvalid =
    internalValue != null && !isValid(parseFloat(internalValue));

  return (
    <FormControl isInvalid={isInvalid} isDisabled={isDisabled}>
      <FormLabel mb={"3px"}>{props.label}</FormLabel>
      <InputGroup>
        {prefix != null && <InputLeftAddon>{prefix}</InputLeftAddon>}
        <Input
          {...props}
          type="number"
          value={internalValue ?? undefined}
          min={minValue}
          max={maxValue}
          step={props.step ?? 1}
          /*
        // Unfortunately, there's no styling for both invalid & focused, and focus
        // takes precedences. IMO this is a design oversight, though perhaps it's
        // intentional.
        //
        // https://github.com/chakra-ui/chakra-ui/pull/2741
        _focusVisible={isInvalid ? { borderColor: "inherit" } : {}}
        */
          onChange={(ev) => {
            const value = ev.target.value;
            setInternalValue(value);
            const numericValue = parseFloat(value);
            if (isValid(numericValue)) {
              setValue(numericValue);
            }
          }}
          onBlur={() => {
            if (value != null) {
              setInternalValue(value.toString());
            }
          }}
        />
        {props.suffix != null && (
          <InputRightAddon>{props.suffix}</InputRightAddon>
        )}
      </InputGroup>
    </FormControl>
  );
};
