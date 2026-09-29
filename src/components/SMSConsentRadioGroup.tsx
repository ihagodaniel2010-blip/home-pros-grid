import React from "react";
import { Link } from "@/lib/navigation-compat";

interface SMSConsentRadioGroupProps {
  value: boolean | null; // null = unselected, true = YES, false = NO
  onChange: (value: boolean) => void;
  error?: string | null;
  className?: string;
  darkTheme?: boolean;
}

export const SMSConsentRadioGroup: React.FC<SMSConsentRadioGroupProps> = ({
  value,
  onChange,
  error,
  className = "",
  darkTheme = false,
}) => {
  return (
    <div className={`mt-4 mb-3 p-4 rounded-2xl border transition-colors ${
      error 
        ? "border-red-300 bg-red-50/50" 
        : darkTheme 
          ? "border-slate-700 bg-slate-800/80" 
          : "border-slate-200 bg-slate-50/70"
    } ${className}`}>
      <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 ${
        darkTheme ? "text-slate-200" : "text-slate-800"
      }`}>
        Would you like to receive SMS/Text updates about your estimate and project? <span className="text-red-500">*</span>
      </label>

      <div className="space-y-2 mb-2">
        {/* Option YES */}
        <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
          value === true
            ? darkTheme 
              ? "border-amber-500 bg-amber-500/10 text-white font-semibold" 
              : "border-sky-500 bg-sky-50/90 text-slate-900 font-semibold"
            : darkTheme
              ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700/50"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100/60"
        }`}>
          <input
            type="radio"
            name="smsConsentRadio"
            checked={value === true}
            onChange={() => onChange(true)}
            className="h-4 w-4 text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
          />
          <span className="text-xs sm:text-sm">Yes, I agree to receive SMS/Text messages</span>
        </label>

        {/* Option NO */}
        <label className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
          value === false
            ? darkTheme 
              ? "border-slate-500 bg-slate-700/70 text-white font-semibold" 
              : "border-slate-400 bg-slate-200/70 text-slate-900 font-semibold"
            : darkTheme
              ? "border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700/50"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100/60"
        }`}>
          <input
            type="radio"
            name="smsConsentRadio"
            checked={value === false}
            onChange={() => onChange(false)}
            className="h-4 w-4 text-slate-600 focus:ring-slate-500 cursor-pointer shrink-0"
          />
          <span className="text-xs sm:text-sm">No, I do not want SMS/Text messages</span>
        </label>
      </div>

      {/* Required Validation Error Message */}
      {error && (
        <p className="text-xs font-semibold text-red-600 mt-1.5 flex items-center gap-1">
          ⚠️ {error}
        </p>
      )}

      {/* Mandatory A2P Legal Disclosure — displayed when YES is selected */}
      {value === true && (
        <div className={`mt-3 pt-3 border-t text-[11px] leading-relaxed animate-in fade-in ${
          darkTheme ? "border-slate-700 text-slate-300" : "border-slate-200 text-slate-600"
        }`}>
          I agree to receive text messages from H &amp; A Construction LLC regarding my estimate, project, scheduling, change orders, payment reminders, and related service communications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase. See our{" "}
          <Link
            to="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold underline transition-colors ${
              darkTheme ? "text-amber-400 hover:text-white" : "text-sky-700 hover:text-sky-900"
            }`}
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold underline transition-colors ${
              darkTheme ? "text-amber-400 hover:text-white" : "text-sky-700 hover:text-sky-900"
            }`}
          >
            Terms &amp; Conditions
          </Link>
          .
        </div>
      )}
    </div>
  );
};
