import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { MASTER_DEPARTMENTS } from "@/lib/callsheets/roleNormalization";

interface DepartmentDropdownProps {
  value: string;
  onChange: (value: string) => void;
  customDepartments?: string[];
  onAddCustom?: (department: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DepartmentDropdown({
  value,
  onChange,
  customDepartments = [],
  onAddCustom,
  placeholder = "Select department...",
  className,
  disabled = false,
}: DepartmentDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");

  // Combine master and custom departments
  const allDepartments = [
    ...MASTER_DEPARTMENTS,
    ...customDepartments.filter((d) => !MASTER_DEPARTMENTS.includes(d as any)),
  ];

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
  };

  const handleAddNew = () => {
    if (newDepartment.trim() && onAddCustom) {
      onAddCustom(newDepartment.trim());
      onChange(newDepartment.trim());
      setNewDepartment("");
      setShowAddNew(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search departments..." />
          <CommandList>
            <CommandEmpty>
              {onAddCustom ? (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                  onClick={() => setShowAddNew(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add new department
                </button>
              ) : (
                "No department found."
              )}
            </CommandEmpty>
            <CommandGroup heading="Departments">
              {allDepartments.map((dept) => (
                <CommandItem
                  key={dept}
                  value={dept}
                  onSelect={() => handleSelect(dept)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === dept ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {dept}
                </CommandItem>
              ))}
            </CommandGroup>
            {onAddCustom && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {showAddNew ? (
                    <div className="flex items-center gap-2 p-2">
                      <Input
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="New department name"
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNew();
                          }
                          if (e.key === "Escape") {
                            setShowAddNew(false);
                            setNewDepartment("");
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" className="h-8" onClick={handleAddNew}>
                        Add
                      </Button>
                    </div>
                  ) : (
                    <CommandItem onSelect={() => setShowAddNew(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add new department
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
