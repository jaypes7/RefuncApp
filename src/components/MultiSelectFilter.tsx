"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

type Option = { value: string; label: string };
type Group = { label: string; options: Option[] };

interface MultiSelectFilterProps {
  placeholder: string;
  selected: string[];
  onChange: (selected: string[]) => void;
  options?: Option[];
  groups?: Group[];
  width?: string;
  disabled?: boolean;
}

export function MultiSelectFilter({
  placeholder,
  selected,
  onChange,
  options,
  groups,
  width = "w-56",
  disabled,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);

  const allValues = React.useMemo(() => {
    const vals: string[] = [];
    if (options) vals.push(...options.map((o) => o.value));
    if (groups) vals.push(...groups.flatMap((g) => g.options.map((o) => o.value)));
    return vals;
  }, [options, groups]);

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => onChange([...allValues]);
  const clearAll = () => onChange([]);

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options?.find((o) => o.value === selected[0])?.label ??
          groups?.flatMap((g) => g.options).find((o) => o.value === selected[0])?.label ??
          selected[0])
        : `${selected.length} selecionados`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 justify-between px-3 font-normal",
            width,
            selected.length === 0 && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", width)} align="start">
        <div className="flex max-h-80 flex-col">
          <div className="flex-1 overflow-y-auto p-2">
            {options && (
              <div className="flex flex-col gap-1">
                {options.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleValue(opt.value);
                    }}
                  >
                    <Checkbox
                      checked={selected.includes(opt.value)}
                      onCheckedChange={() => toggleValue(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {groups && (
              <div className="flex flex-col gap-3">
                {groups.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.options.map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleValue(opt.value);
                          }}
                        >
                          <Checkbox
                            checked={selected.includes(opt.value)}
                            onCheckedChange={() => toggleValue(opt.value)}
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t p-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
              Selecionar todos
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
              Limpar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
