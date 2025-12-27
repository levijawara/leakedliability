import { Users, Mail, Phone, Building2, Briefcase, Instagram, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ParsedContact } from "@/types/callSheet";

interface ParseSummaryProps {
  contacts: ParsedContact[];
  selectedCount: number;
  className?: string;
}

export function ParseSummary({
  contacts,
  selectedCount,
  className,
}: ParseSummaryProps) {
  // Calculate statistics
  const stats = {
    total: contacts.length,
    selected: selectedCount,
    withEmail: contacts.filter((c) => c.email).length,
    withPhone: contacts.filter((c) => c.phone).length,
    withInstagram: contacts.filter((c) => c.instagram_handle).length,
    uniqueDepartments: new Set(contacts.map((c) => c.department).filter(Boolean)).size,
    uniqueRoles: new Set(contacts.map((c) => c.role).filter(Boolean)).size,
    highConfidence: contacts.filter((c) => c.confidence && c.confidence >= 0.8).length,
  };

  const percentage = (value: number) =>
    stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Contacts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.selected}</p>
              <p className="text-sm text-muted-foreground">Selected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withEmail}</p>
              <p className="text-sm text-muted-foreground">
                With Email ({percentage(stats.withEmail)}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Phone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withPhone}</p>
              <p className="text-sm text-muted-foreground">
                With Phone ({percentage(stats.withPhone)}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
              <Instagram className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withInstagram}</p>
              <p className="text-sm text-muted-foreground">
                With Instagram ({percentage(stats.withInstagram)}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueDepartments}</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Briefcase className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueRoles}</p>
              <p className="text-sm text-muted-foreground">Roles</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.highConfidence}</p>
              <p className="text-sm text-muted-foreground">
                High Confidence ({percentage(stats.highConfidence)}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
