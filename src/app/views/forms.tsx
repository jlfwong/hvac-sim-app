import { FormControl, FormLabel, Input, Select } from "@chakra-ui/react";
import { Box, Heading, Stack } from "@chakra-ui/react";
import React, { useState } from "react";
import React, { useState } from "react";

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

export const FormInput: React.FC<
  FormInputProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({ label, ...props }) => (
  <FormControl>
    <FormLabel mb={"3px"}>{label}</FormLabel>
    <Input {...props} />
  </FormControl>
);
interface FormSelectProps {
  label: string;
  children: React.ReactNode;
}

export const FormSelect: React.FC<
  FormSelectProps & React.SelectHTMLAttributes<HTMLSelectElement>
> = ({ label, children, ...props }) => (
  <FormControl>
    <FormLabel mb={"3px"}>{label}</FormLabel>
    <Select {...props}>{children}</Select>
  </FormControl>
);
interface NumericFormInputViewProps {
  label: string;
  placeholder?: string;
  value: number | null;
  setValue: (value: number) => void;
  minValue: number;
  maxValue: number;
  step?: number;
}

export const NumericFormInputView: React.FC<NumericFormInputViewProps> = (
  props
) => {
  const [internalValue, setInternalValue] = useState(
    props.value != null ? props.value.toString() : null
  );

  function isValid(numeric: number) {
    if (
      isNaN(numeric) ||
      numeric < props.minValue ||
      numeric > props.maxValue
    ) {
      return false;
    }
    return true;
  }

  const isInvalid =
    internalValue != null && !isValid(parseInt(internalValue, 10));

  return (
    <FormControl isInvalid={isInvalid}>
      <FormLabel mb={"3px"}>{props.label}</FormLabel>
      <Input
        type="number"
        placeholder={props.placeholder}
        min={props.minValue}
        max={props.maxValue}
        step={props.step ?? 1}
        /*
        // Unfortunately, there's no styling for both invalid & focused, and focus
        // takes precedences. IMO this is a design oversight, though perhaps it's
        // intentional.
        //
        // https://github.com/chakra-ui/chakra-ui/pull/2741
        */
        _focusVisible={isInvalid ? { borderColor: "inherit" } : {}}
        onChange={(ev) => {
          const value = ev.target.value;
          setInternalValue(value);
          const numericValue = parseInt(value, 10);
          if (isValid(numericValue)) {
            props.setValue(numericValue);
          }
        }}
        onBlur={() => {
          if (props.value != null) {
            setInternalValue(props.value.toString());
          }
        }}
      />
    </FormControl>
  );
};
