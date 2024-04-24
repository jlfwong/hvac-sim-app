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
  Tooltip,
  type FormLabelProps,
  HStack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Box, Heading, Stack } from "@chakra-ui/react";
import React, { forwardRef, useState } from "react";
import { InfoOutlineIcon, QuestionOutlineIcon } from "@chakra-ui/icons";

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
    <Stack as="section" gap={0} w="full">
      <Box>
        <Heading size="small">{props.title}</Heading>
        <hr />
      </Box>
      <Stack {...stackProps}>{props.children}</Stack>
    </Stack>
  );
};

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

export const FormLabelWithTooltipOption: React.FC<
  { label: string; tooltip?: React.ReactNode } & FormLabelProps
> = ({ label, tooltip, ...props }) => {
  return (
    <FormLabel mb={"3px"} marginInlineEnd={"1px"} {...props}>
      <HStack w="full" gap={"5px"}>
        <Text flex={1}>{label}</Text>
        {tooltip != null && <InfoTooltipView message={tooltip} />}
      </HStack>
    </FormLabel>
  );
};

interface FormInputProps {
  label: string;
  placeholder?: string;
  tooltip?: React.ReactNode;
}

export const FormInput = forwardRef<
  HTMLInputElement,
  FormInputProps & InputProps
>(({ label, tooltip, ...props }, ref) => (
  <FormControl>
    <FormLabelWithTooltipOption label={label} tooltip={tooltip} />
    <Input {...props} ref={ref} />
  </FormControl>
));
interface FormSelectProps {
  label: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
}

export const FormSelect: React.FC<FormSelectProps & SelectProps> = ({
  label,
  children,
  tooltip,
  ...props
}) => (
  <FormControl>
    <FormLabelWithTooltipOption label={label} tooltip={tooltip} />
    <Select {...props}>{children}</Select>
  </FormControl>
);

interface NumericFormInputViewProps
  extends Omit<InputProps, "value" | "prefix"> {
  label: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  tooltip?: React.ReactNode;
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
  tooltip,
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
      <FormLabelWithTooltipOption label={props.label} tooltip={tooltip} />
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
          onBlur={(ev) => {
            if (value != null) {
              setInternalValue(value.toString());
            }
            if (props.onBlur != null) {
              props.onBlur(ev);
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

interface InfoTooltipViewProps {
  message: React.ReactNode;
}

export const InfoTooltipView: React.FC<InfoTooltipViewProps> = (props) => {
  const { isOpen, onOpen, onClose, onToggle } = useDisclosure();

  const isTouchDevice = window.matchMedia(
    "(hover: none) and (pointer: coarse)"
  ).matches;

  return (
    <>
      <Tooltip
        hasArrow
        label={props.message}
        placement="top"
        bg="gray.50"
        color="black"
        isOpen={isOpen}
      >
        <QuestionOutlineIcon
          color={"gray.500"}
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          onClick={(ev) => {
            if (isTouchDevice) {
              onToggle();

              // Stop propagation to prevent labels from focusing their associated
              // input elements
              ev.preventDefault();
              ev.stopPropagation();
            }
          }}
        />
      </Tooltip>
    </>
  );
};