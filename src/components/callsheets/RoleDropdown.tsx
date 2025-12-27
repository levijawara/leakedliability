import { useState, useMemo } from "react";
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
import { useRoleDictionary } from "@/hooks/useRoleDictionary";
import { getRoleSuggestions } from "@/lib/callsheets/roleNormalization";

interface RoleDropdownProps {
  value: string;
  onChange: (value: string) => void;
  department?: string;
  onAddCustom?: (role: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RoleDropdown({
  value,
  onChange,
  department,
  onAddCustom,
  placeholder = "Select role...",
  className,
  disabled = false,
}: RoleDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { allRoles, searchRoles } = useRoleDictionary();

  // Get roles - combine dictionary roles with static suggestions
  const availableRoles = useMemo(() => {
    const staticSuggestions = searchQuery.length >= 2 
      ? searchRoles(searchQuery) 
      : [];
    
    // Combine and deduplicate
    const combined = [...new Set([...allRoles, ...staticSuggestions])];
    
    // Filter by search query
    if (searchQuery) {
      return combined.filter((role) =>
        role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return combined.slice(0, 20); // Limit to 20 for performance
  }, [allRoles, searchRoles, searchQuery]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchQuery("");
  };

  const handleAddNew = () => {
    if (newRole.trim()) {
      if (onAddCustom) {
        onAddCustom(newRole.trim());
      }
      onChange(newRole.trim());
      setNewRole("");
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
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search roles..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {onAddCustom ? (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                  onClick={() => setShowAddNew(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add "{searchQuery || "new role"}"
                </button>
              ) : (
                "No role found."
              )}
            </CommandEmpty>
            {availableRoles.length > 0 && (
              <CommandGroup heading={department ? `${department} Roles` : "Roles"}>
                {availableRoles.map((role) => (
                  <CommandItem
                    key={role}
                    value={role}
                    onSelect={() => handleSelect(role)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === role ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {role}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {onAddCustom && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {showAddNew ? (
                    <div className="flex items-center gap-2 p-2">
                      <Input
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="New role name"
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNew();
                          }
                          if (e.key === "Escape") {
                            setShowAddNew(false);
                            setNewRole("");
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
                      Add new role
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