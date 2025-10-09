import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import Papa from "papaparse";
import { differenceInDays, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface CSVRow {
  NAME: string;
  "*PSCS* ( 0 - 1,000 )": string;
  "TOTAL $$$ OWED": string;
  "OLDEST DEBT": string;
  "OLDEST DEBT DAY-COUNTER": string;
  " TOTAL # of CREW OWED": string;
  "TOTAL # of JOBS OWED": string;
  "TOTAL # of CITIES OWED": string;
}

const AdminImport = () => {
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const calculateDaysOverdue = (oldestDebtDate: string): number => {
    // Parse the date (MM/DD/YYYY format)
    const [month, day, year] = oldestDebtDate.split("/");
    const debtDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Get current date in PST timezone
    const now = toZonedTime(new Date(), "America/Los_Angeles");
    
    // Calculate difference
    return differenceInDays(now, debtDate);
  };

  const parseAmount = (amountStr: string): number => {
    return parseFloat(amountStr.replace(/[$,]/g, ""));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as CSVRow[];
        
        // Skip the first row if it's a header/title row
        const dataRows = rows.filter(row => row.NAME && row.NAME !== "NAME");

        console.log("Importing rows:", dataRows);

        try {
          for (const row of dataRows) {
            const producerName = row.NAME?.trim();
            if (!producerName) continue;

            // Parse values
            const pscsScore = parseFloat(row["*PSCS* ( 0 - 1,000 )"] || "1000");
            const totalAmountOwed = parseAmount(row["TOTAL $$$ OWED"] || "0");
            const oldestDebtDate = row["OLDEST DEBT"];
            const daysOverdue = calculateDaysOverdue(oldestDebtDate);
            const totalCrewOwed = parseInt(row[" TOTAL # of CREW OWED"] || "0");
            const totalJobsOwed = parseInt(row["TOTAL # of JOBS OWED"] || "0");
            const totalCitiesOwed = parseInt(row["TOTAL # of CITIES OWED"] || "0");

            // Convert date to ISO format for database
            const [month, day, year] = oldestDebtDate.split("/");
            const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

            // Check if producer exists
            const { data: existingProducer } = await supabase
              .from("producers")
              .select("id")
              .eq("name", producerName)
              .maybeSingle();

            let producerId: string;

            if (existingProducer) {
              // Update existing producer
              producerId = existingProducer.id;
              await supabase
                .from("producers")
                .update({
                  pscs_score: pscsScore,
                  total_amount_owed: totalAmountOwed,
                  oldest_debt_date: isoDate,
                  oldest_debt_days: daysOverdue,
                  total_crew_owed: totalCrewOwed,
                  total_jobs_owed: totalJobsOwed,
                  total_cities_owed: totalCitiesOwed,
                })
                .eq("id", producerId);
            } else {
              // Create new producer
              const { data: newProducer, error: producerError } = await supabase
                .from("producers")
                .insert({
                  name: producerName,
                  pscs_score: pscsScore,
                  total_amount_owed: totalAmountOwed,
                  oldest_debt_date: isoDate,
                  oldest_debt_days: daysOverdue,
                  total_crew_owed: totalCrewOwed,
                  total_jobs_owed: totalJobsOwed,
                  total_cities_owed: totalCitiesOwed,
                })
                .select()
                .single();

              if (producerError) throw producerError;
              producerId = newProducer.id;
            }

            console.log(`Imported: ${producerName}`);
          }

          toast({
            title: "Import successful!",
            description: `Imported ${dataRows.length} producers`,
          });

          navigate("/leaderboard");
        } catch (error) {
          console.error("Import error:", error);
          toast({
            title: "Import failed",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setImporting(false);
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast({
          title: "Failed to parse CSV",
          description: error.message,
          variant: "destructive",
        });
        setImporting(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-6">Import Producer Data</h1>
          <p className="text-muted-foreground mb-8">
            Upload your CSV file to import producer data. The day counter will be
            automatically calculated based on PST timezone.
          </p>
          
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing}
              className="block w-full text-sm text-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                file:cursor-pointer cursor-pointer"
            />
            
            {importing && (
              <p className="text-sm text-muted-foreground">
                Importing data, please wait...
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminImport;
