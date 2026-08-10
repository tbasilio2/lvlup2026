import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStrategies, rememberStrategy } from "@/lib/strategies";

const CUSTOM = "__custom__";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

/** Dropdown of the user's saved top setups, with a free-text fallback. */
const StrategySelect = ({ value, onChange, className }: Props) => {
  const saved = useStrategies();
  const [custom, setCustom] = useState(() => !!value && !saved.includes(value));

  const inputCls =
    className ??
    "w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60";

  const selectValue = custom ? CUSTOM : saved.includes(value) ? value : "";

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === CUSTOM) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger className={inputCls + " h-auto"}>
          <SelectValue placeholder="Select a setup" />
        </SelectTrigger>
        <SelectContent>
          {saved.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
          <SelectItem value={CUSTOM}>Other / new setup…</SelectItem>
        </SelectContent>
      </Select>

      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => rememberStrategy(value)}
          placeholder="e.g. Break & Retest"
          className={inputCls}
        />
      )}
    </div>
  );
};

export default StrategySelect;
