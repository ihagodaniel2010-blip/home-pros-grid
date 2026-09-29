import React from "react";
import { Link } from "@/lib/navigation-compat";

interface SMSConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  darkTheme?: boolean;
}

export const SMSConsentCheckbox: React.FC<SMSConsentCheckboxProps> = ({
  checked,
  onChange,
  className = "",
  darkTheme = false,
}) => {
  return (
    <div className={`mt-3 mb-2.5 ${className}`}>
      <label className="flex items-start gap-2.5 cursor-pointer group select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors focus:outline-hidden focus:ring-2 focus:ring-orange-500 ${
            darkTheme
              ? "border-slate-600 bg-slate-800 text-amber-500"
              : "border-slate-300 bg-white text-orange-600"
          }`}
        />
        <span
          className={`text-[11px] leading-relaxed font-normal ${
            darkTheme ? "text-slate-300" : "text-slate-600"
          }`}
        >
          I agree to receive text messages from H &amp; A Construction LLC regarding my estimate, project, scheduling, change orders, payment reminders, and related service communications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase. See our{" "}
          <Link
            to="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold underline transition-colors ${
              darkTheme ? "text-amber-400 hover:text-white" : "text-[#0b2a4a] hover:text-orange-600"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold underline transition-colors ${
              darkTheme ? "text-amber-400 hover:text-white" : "text-[#0b2a4a] hover:text-orange-600"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            Terms &amp; Conditions
          </Link>
          .
        </span>
      </label>
    </div>
  );
};
