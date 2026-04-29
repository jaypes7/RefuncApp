"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCargos } from "@/hooks/use-cargos";

interface CargoComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CargoCombobox({
  value,
  onChange,
  placeholder = "Selecione um cargo...",
  disabled = false,
}: CargoComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { cargos, isLoading } = useCargos();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-left font-normal"
          disabled={disabled || isLoading}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {isLoading ? "Carregando cargos..." : value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-[#0f172a] border border-white/10">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Buscar cargo..."
            className="h-10 border-none focus:ring-0 text-white placeholder:text-muted-foreground"
          />
          <CommandList className="max-h-75 overflow-auto">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              {isLoading ? "Carregando..." : "Nenhum cargo encontrado."}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {cargos.map((cargo) => (
                <CommandItem
                  key={cargo}
                  value={cargo}
                  onSelect={() => {
                    onChange(cargo);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer rounded-sm",
                    "text-white/90 hover:bg-white/10 hover:text-white",
                    "aria-selected:bg-white/10 aria-selected:text-white",
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === cargo ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{cargo}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
