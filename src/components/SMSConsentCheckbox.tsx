import React from "react";
import { SMSConsentRadioGroup } from "./SMSConsentRadioGroup";

interface SMSConsentCheckboxProps {
  checked: boolean | null;
  onChange: (checked: boolean) => void;
  className?: string;
  darkTheme?: boolean;
  error?: string | null;
}

export const SMSConsentCheckbox: React.FC<SMSConsentCheckboxProps> = ({
  checked,
  onChange,
  className,
  darkTheme,
  error
}) => {
  return (
    <SMSConsentRadioGroup
      value={checked}
      onChange={onChange}
      className={className}
      darkTheme={darkTheme}
      error={error}
    />
  );
};
