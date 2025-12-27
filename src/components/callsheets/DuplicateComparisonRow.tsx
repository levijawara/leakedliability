import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RoleDropdown } from "@/components/callsheets/RoleDropdown";
import { DepartmentDropdown } from "@/components/callsheets/DepartmentDropdown";
import type { CrewContact, DuplicateMatch } from "@/types/callSheet";

interface DuplicateComparisonRowProps {
  match: DuplicateMatch;
  onMerge: (contact1: CrewContact, contact2: CrewContact, keepFirst: boolean) => void;
  onSkip: () => void;
  onKeepBoth: () => void;
}

export function DuplicateComparisonRow({
  match,
  onMerge,
  onSkip,
  onKeepBoth,
}: DuplicateComparisonRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [keepFirst, setKeepFirst] = useState(true);
  const [selectedFields, setSelectedFields] = useState<Record<string, "first" | "second">>({
    name: "first",
    emails: "first",
    phones: "first",
    roles: "first",
    departments: "first",
    instagram_handle: "first",
  });

  const { contact1, contact2, matchScore, matchReasons } = match;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-destructive text-destructive-foreground";
    if (score >= 70) return "bg-amber-500 text-white";
    return "bg-muted text-muted-foreground";
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: prev[field] === "first" ? "second" : "first",
    }));
  };

  const handleMerge = () => {
    onMerge(contact1, contact2, keepFirst);
  };

  const renderFieldComparison = (
    label: string,
    field: string,
    value1: string | string[] | null | undefined,
    value2: string | string[] | null | undefined
  ) => {
    const v1 = Array.isArray(value1) ? value1.join(", ") : value1 || "—";
    const v2 = Array.isArray(value2) ? value2.join(", ") : value2 || "—";
    const isDifferent = v1 !== v2;
    const selected = selectedFields[field];

    return (
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2 items-center py-1 border-b border-border/50 last:border-0">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => toggleField(field)}
          className={`text-sm text-left px-2 py-1 rounded transition-colors ${
            selected === "first"
              ? "bg-primary/10 border border-primary"
              : isDifferent
              ? "hover:bg-muted"
              : ""
          }`}
        >
          {v1}
        </button>
        <button
          type="button"
          onClick={() => toggleField(field)}
          className={`text-sm text-left px-2 py-1 rounded transition-colors ${
            selected === "second"
              ? "bg-primary/10 border border-primary"
              : isDifferent
              ? "hover:bg-muted"
              : ""
          }`}
        >
          {v2}
        </button>
      </div>
    );
  };

  return (
    <Card className="p-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge className={getScoreColor(matchScore)}>{matchScore}% match</Badge>
            <span className="font-medium">{contact1.name}</span>
            <span className="text-muted-foreground">↔</span>
            <span className="font-medium">{contact2.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {matchReasons && matchReasons.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            Matched on: {matchReasons.join(", ")}
          </div>
        )}

        <CollapsibleContent className="mt-4 space-y-4">
          {/* Field comparison grid */}
          <div className="space-y-1">
            <div className="grid grid-cols-[100px_1fr_1fr] gap-2 text-xs text-muted-foreground font-medium pb-2 border-b">
              <span>Field</span>
              <span>Contact 1</span>
              <span>Contact 2</span>
            </div>

            {renderFieldComparison("Name", "name", contact1.name, contact2.name)}
            {renderFieldComparison("Emails", "emails", contact1.emails, contact2.emails)}
            {renderFieldComparison("Phones", "phones", contact1.phones, contact2.phones)}
            {renderFieldComparison("Roles", "roles", contact1.roles, contact2.roles)}
            {renderFieldComparison("Departments", "departments", contact1.departments, contact2.departments)}
            {renderFieldComparison("Instagram", "instagram_handle", contact1.instagram_handle, contact2.instagram_handle)}
          </div>

          {/* Source files comparison */}
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Sources:</span>
            <div className="mt-1 flex gap-4">
              <div className="flex-1">
                <span className="text-xs text-muted-foreground">Contact 1:</span>
                <div className="text-xs">
                  {contact1.source_files?.join(", ") || "Unknown"}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-xs text-muted-foreground">Contact 2:</span>
                <div className="text-xs">
                  {contact2.source_files?.join(", ") || "Unknown"}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`keep-first-${match.contact1.id}`}
                checked={keepFirst}
                onCheckedChange={(checked) => setKeepFirst(!!checked)}
              />
              <label
                htmlFor={`keep-first-${match.contact1.id}`}
                className="text-sm cursor-pointer"
              >
                Keep first contact as primary
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onSkip}>
                <X className="h-4 w-4 mr-1" />
                Skip
              </Button>
              <Button variant="outline" size="sm" onClick={onKeepBoth}>
                Keep Both
              </Button>
              <Button size="sm" onClick={handleMerge}>
                <Merge className="h-4 w-4 mr-1" />
                Merge
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}