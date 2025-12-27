import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface RoleFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRoles: string[];
  availableDepartments: string[];
  selectedRoles: string[];
  selectedDepartments: string[];
  onApply: (roles: string[], departments: string[]) => void;
}

export function RoleFilterModal({
  open,
  onOpenChange,
  availableRoles,
  availableDepartments,
  selectedRoles: initialRoles,
  selectedDepartments: initialDepartments,
  onApply,
}: RoleFilterModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(initialRoles));
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set(initialDepartments));
  const [roleSearch, setRoleSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedRoles(new Set(initialRoles));
      setSelectedDepartments(new Set(initialDepartments));
    }
  }, [open, initialRoles, initialDepartments]);

  const filteredRoles = availableRoles.filter((role) =>
    role.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const filteredDepartments = availableDepartments.filter((dept) =>
    dept.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(Array.from(selectedRoles), Array.from(selectedDepartments));
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedRoles(new Set());
    setSelectedDepartments(new Set());
  };

  const totalSelected = selectedRoles.size + selectedDepartments.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filter Contacts</span>
            {totalSelected > 0 && (
              <Badge variant="secondary">{totalSelected} selected</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roles">
              Roles {selectedRoles.size > 0 && `(${selectedRoles.size})`}
            </TabsTrigger>
            <TabsTrigger value="departments">
              Departments {selectedDepartments.size > 0 && `(${selectedDepartments.size})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-4">
                {filteredRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No roles found</p>
                ) : (
                  filteredRoles.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={selectedRoles.has(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <Label htmlFor={`role-${role}`} className="text-sm cursor-pointer flex-1">
                        {role}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-4">
                {filteredDepartments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No departments found</p>
                ) : (
                  filteredDepartments.map((dept) => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={selectedDepartments.has(dept)}
                        onCheckedChange={() => toggleDepartment(dept)}
                      />
                      <Label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer flex-1">
                        {dept}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleClear} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Filter
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
