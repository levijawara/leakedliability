import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface LegacyContact {
  "First Name"?: string;
  "Last Name"?: string | null;
  "Full Name": string;
  "Role"?: string;
  "Department"?: string;
  "Phone"?: string;
  "Email"?: string;
  "Instagram"?: string;
  "_source_export"?: string;
}

interface ImportStats {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

const BATCH_SIZE = 50;
const USER_ID = '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7'; // Admin user

export default function AdminImportContacts() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [stats, setStats] = useState<ImportStats>({ inserted: 0, updated: 0, skipped: 0, errors: 0 });
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const contacts: LegacyContact[] = JSON.parse(text);
      
      if (!Array.isArray(contacts)) {
        toast({ title: "Invalid JSON", description: "File must contain an array of contacts", variant: "destructive" });
        return;
      }

      await processImport(contacts);
    } catch (err) {
      toast({ title: "Error parsing file", description: String(err), variant: "destructive" });
    }
  };

  const processImport = async (contacts: LegacyContact[]) => {
    setIsImporting(true);
    setCompleted(false);
    setErrors([]);
    
    const batches = Math.ceil(contacts.length / BATCH_SIZE);
    setTotalBatches(batches);
    
    const runningStats: ImportStats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
    const allErrors: string[] = [];

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      setCurrentBatch(batchNumber);
      setProgress((batchNumber / batches) * 100);

      const batch = contacts.slice(i, i + BATCH_SIZE);

      try {
        const { data, error } = await supabase.functions.invoke('import-legacy-contacts', {
          body: {
            contacts: batch,
            user_id: USER_ID,
            batch_number: batchNumber,
            total_batches: batches,
          },
        });

        if (error) {
          allErrors.push(`Batch ${batchNumber}: ${error.message}`);
          runningStats.errors += batch.length;
        } else if (data) {
          runningStats.inserted += data.stats?.inserted || 0;
          runningStats.updated += data.stats?.updated || 0;
          runningStats.skipped += data.stats?.skipped || 0;
          runningStats.errors += data.stats?.errors || 0;
          
          if (data.errors?.length) {
            allErrors.push(...data.errors.slice(0, 5));
          }
        }

        setStats({ ...runningStats });
      } catch (err) {
        allErrors.push(`Batch ${batchNumber}: ${String(err)}`);
        runningStats.errors += batch.length;
      }

      // Small delay between batches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setErrors(allErrors.slice(0, 20));
    setCompleted(true);
    setIsImporting(false);
    setProgress(100);
    
    toast({
      title: "Import Complete",
      description: `Inserted: ${runningStats.inserted}, Updated: ${runningStats.updated}, Skipped: ${runningStats.skipped}, Errors: ${runningStats.errors}`,
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Import Legacy Contacts</h1>
      
      <Card className="p-6">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Upload the combined_contacts_raw.json file to import legacy contacts into the database.
            This will INSERT new contacts or UPDATE existing ones (by name match) without deleting any data.
          </p>

          {!isImporting && !completed && (
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">JSON file only</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".json"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {isImporting && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Processing batch {currentBatch} of {totalBatches}...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="grid grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <div className="font-bold text-green-600">{stats.inserted}</div>
                  <div className="text-muted-foreground">Inserted</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{stats.updated}</div>
                  <div className="text-muted-foreground">Updated</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600">{stats.skipped}</div>
                  <div className="text-muted-foreground">Skipped</div>
                </div>
                <div>
                  <div className="font-bold text-red-600">{stats.errors}</div>
                  <div className="text-muted-foreground">Errors</div>
                </div>
              </div>
            </div>
          )}

          {completed && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Import Complete!</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <div className="font-bold text-green-600">{stats.inserted}</div>
                  <div className="text-muted-foreground">Inserted</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{stats.updated}</div>
                  <div className="text-muted-foreground">Updated</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600">{stats.skipped}</div>
                  <div className="text-muted-foreground">Skipped</div>
                </div>
                <div>
                  <div className="font-bold text-red-600">{stats.errors}</div>
                  <div className="text-muted-foreground">Errors</div>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold">Errors ({errors.length})</span>
                  </div>
                  <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                    {errors.map((err, i) => (
                      <li key={i} className="truncate">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button 
                onClick={() => {
                  setCompleted(false);
                  setStats({ inserted: 0, updated: 0, skipped: 0, errors: 0 });
                  setProgress(0);
                }}
                variant="outline"
              >
                Import Another File
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
