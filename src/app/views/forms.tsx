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
} from "@chakra-ui/react";
import { Box, Heading, Stack } from "@chakra-ui/react";
import React, { forwardRef, useState } from "react";

interface FormSectionViewProps {
  title: string;
  children: React.ReactNode;
}

export const FormSectionView: React.FC<FormSectionViewProps> = ({
  title,
  children,
}) => (
  <Stack as="section" spacing={"10px"}>
    <Box>
      <Heading size="small">{title}</Heading>
      <hr />
    </Box>
    {children}
  </Stack>
);
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

interface NumericFormInputViewProps {
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

export const NumericFormInputView: React.FC<
  NumericFormInputViewProps & InputProps
> = ({ value, minValue, maxValue, setValue, isDisabled, ...props }) => {
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
        {props.prefix != null && (
          <InputLeftAddon>{props.prefix}</InputLeftAddon>
        )}
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
