import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Database, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

// Ordered by dependency for clean import
const EXPORT_TABLES = [
  // Config tables (no dependencies)
  'pscs_config',
  'site_settings',
  'leaderboard_config',
  'call_sheet_config',
  'ban_pages',
  'beta_access_codes',
  'custom_departments',
  'role_dictionary',
  'site_notices',
  
  // Core entities
  'producers',
  'profiles',
  'user_roles',
  'user_entitlements',
  'producer_account_links',
  
  // Identity and contacts
  'identity_groups',
  'ig_master_identities',
  'crew_contacts',
  'network_nodes',
  'network_edges',
  
  // Call sheets
  'global_call_sheets',
  'user_call_sheets',
  'contact_call_sheets',
  'call_sheet_heat_metrics',
  
  // Reports and submissions
  'submissions',
  'payment_reports',
  'disputes',
  'dispute_evidence',
  'dispute_timeline',
  'liability_chain',
  'liability_redirects',
  
  // Financial
  'escrow_payments',
  'past_debts',
  'confirmation_cash_transactions',
  'payment_confirmations',
  
  // Notifications and logs
  'queued_producer_notifications',
  'email_logs',
  'moderation_logs',
  'audit_logs',
  
  // Claims and verification
  'identity_claims',
  'identity_claim_history',
  
  // Analytics
  'daily_visitors',
  'search_events',
  'image_generations',
  
  // FAFO
  'fafo_entries',
  
  // Suggestions
  'suggestions',
] as const;

interface ExportData {
  metadata: {
    exported_at: string;
    project_id: string;
    total_tables: number;
    total_rows: number;
    tables_exported: string[];
    tables_failed: string[];
  };
  tables: Record<string, any[]>;
}

export function DatabaseExportPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [currentTableIndex, setCurrentTableIndex] = useState(0);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [exportComplete, setExportComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableStats, setTableStats] = useState<{ name: string; rows: number }[]>([]);

  const exportTable = async (tableName: string): Promise<any[]> => {
    let allRows: any[] = [];
    let offset = 0;
    const batchSize = 500;

    while (true) {
      // Use type assertion for dynamic table access
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error(`[DatabaseExport] Error exporting ${tableName}:`, error);
        throw error;
      }

      if (!data || data.length === 0) break;

      allRows = [...allRows, ...data];
      offset += batchSize;

      // Small delay to prevent overwhelming the API
      if (data.length === batchSize) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return allRows;
  };

  const startExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setCurrentTableIndex(0);
    setExportComplete(false);
    setError(null);
    setTableStats([]);

    const tables: Record<string, any[]> = {};
    const tablesExported: string[] = [];
    const tablesFailed: string[] = [];
    let totalRows = 0;

    try {
      for (let i = 0; i < EXPORT_TABLES.length; i++) {
        const tableName = EXPORT_TABLES[i];
        setCurrentTable(tableName);
        setCurrentTableIndex(i + 1);
        setProgress(((i + 1) / EXPORT_TABLES.length) * 100);

        try {
          const rows = await exportTable(tableName);
          tables[tableName] = rows;
          totalRows += rows.length;
          tablesExported.push(tableName);
          setTableStats(prev => [...prev, { name: tableName, rows: rows.length }]);
        } catch (tableError: any) {
          console.error(`[DatabaseExport] Failed to export ${tableName}:`, tableError);
          tablesFailed.push(tableName);
          tables[tableName] = []; // Empty array for failed tables
          setTableStats(prev => [...prev, { name: tableName, rows: -1 }]); // -1 indicates failure
        }
      }

      const exportResult: ExportData = {
        metadata: {
          exported_at: new Date().toISOString(),
          project_id: 'blpbeopmdfahiosglomx',
          total_tables: EXPORT_TABLES.length,
          total_rows: totalRows,
          tables_exported: tablesExported,
          tables_failed: tablesFailed,
        },
        tables,
      };

      setExportData(exportResult);
      setExportComplete(true);
      setProgress(100);
      setCurrentTable("");

      if (tablesFailed.length > 0) {
        setError(`Export completed with ${tablesFailed.length} table(s) failed (likely RLS restrictions)`);
      }
    } catch (err: any) {
      console.error('[DatabaseExport] Export failed:', err);
      setError(err.message || 'Export failed');
      setIsExporting(false);
    }

    setIsExporting(false);
  };

  const downloadJSON = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaked_liability_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatRowCount = (count: number) => {
    if (count === -1) return '❌ Failed';
    if (count === 0) return '0 rows';
    return `${count.toLocaleString()} rows`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            Database Export
          </Label>
          <p className="text-sm text-muted-foreground">
            Export all {EXPORT_TABLES.length} database tables for migration
          </p>
        </div>
        
        {!exportComplete ? (
          <Button
            onClick={startExport}
            disabled={isExporting}
            variant={isExporting ? "outline" : "default"}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Start Export
              </>
            )}
          </Button>
        ) : (
          <Button onClick={downloadJSON} variant="default">
            <Download className="mr-2 h-4 w-4" />
            Download JSON ({(JSON.stringify(exportData).length / 1024 / 1024).toFixed(2)} MB)
          </Button>
        )}
      </div>

      {/* Progress Section */}
      {(isExporting || exportComplete) && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isExporting ? (
                <>Exporting <span className="font-mono text-foreground">{currentTable}</span>...</>
              ) : exportComplete ? (
                <span className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-4 w-4" />
                  Export complete
                </span>
              ) : null}
            </span>
            <span className="font-medium">
              {currentTableIndex} of {EXPORT_TABLES.length} tables
            </span>
          </div>

          <Progress value={progress} className="h-3" />

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Table Stats Summary */}
          {tableStats.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded p-2 text-xs space-y-1 bg-muted/30">
              {tableStats.map((stat, idx) => (
                <div 
                  key={idx} 
                  className={`flex justify-between ${stat.rows === -1 ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  <span className="font-mono">{stat.name}</span>
                  <span>{formatRowCount(stat.rows)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Final Stats */}
          {exportComplete && exportData && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-2xl font-bold">{exportData.metadata.total_tables}</div>
                <div className="text-xs text-muted-foreground">Tables</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-2xl font-bold">{exportData.metadata.total_rows.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Rows</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-2xl font-bold">{exportData.metadata.tables_failed.length}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
