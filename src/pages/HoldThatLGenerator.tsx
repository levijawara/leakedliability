import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { ArrowLeft } from "lucide-react";

export default function HoldThatLGenerator() {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    igHandle: "",
    productionCompanyName: "",
    pscsScore: "",
    debtOwed: "",
    debtAge: "",
  });
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? "$0.00" : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleGenerate = async () => {
    // Validation
    if (!formData.name || !formData.igHandle || !formData.pscsScore || !formData.debtOwed || !formData.debtAge) {
      toast.error("Please fill in all fields");
      return;
    }

    const pscs = parseFloat(formData.pscsScore);
    if (isNaN(pscs) || pscs > 1000) {
      toast.error("PSCS must be 1000 or below");
      return;
    }

    const debt = parseFloat(formData.debtOwed.replace(/[^0-9.]/g, ""));
    if (isNaN(debt) || debt <= 0) {
      toast.error("Please enter a valid debt amount");
      return;
    }

    const age = parseInt(formData.debtAge);
    if (isNaN(age) || age < 0) {
      toast.error("Please enter a valid debt age in days");
      return;
    }

    setIsGenerating(true);

    try {
      if (!previewRef.current) {
        throw new Error("Preview not found");
      }

      // Capture canvas with high quality
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#0D0D0D",
        logging: false,
        useCORS: true,
        width: 1080,
        height: 1080,
      });

      // Convert to blob and trigger download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const cleanHandle = formData.igHandle.replace(/^@/, "");
        link.download = `HoldThatL_@${cleanHandle}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        toast.success("Image downloaded successfully!");
      }, "image/png");

      // Check for producer match and tag with production company
      if (formData.productionCompanyName.trim()) {
        try {
          const { data: matchedProducer } = await supabase
            .from("producers")
            .select("id")
            .ilike("name", formData.name.trim())
            .maybeSingle();

          if (matchedProducer) {
            await supabase
              .from("producers")
              .update({ sub_name: formData.productionCompanyName.trim() })
              .eq("id", matchedProducer.id);
            
            console.log(`[HoldThatL] Tagged producer ${formData.name} with company: ${formData.productionCompanyName}`);
          }
        } catch (error) {
          console.error("[HoldThatL] Failed to tag producer:", error);
          // Silent fail - don't block UX
        }
      }

      // Log to database (fire-and-forget)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.from("image_generations").insert({
            user_id: user.id,
            producer_name: formData.name,
            ig_handle: formData.igHandle.replace(/^@/, ""),
            pscs_score: pscs,
            debt_amount: debt,
            debt_age: age,
            production_company_name: formData.productionCompanyName.trim() || null,
          });
        } catch (_) {
          // Silent fail - don't block UX
        }
      }

    } catch (error: any) {
      console.error("[HoldThatL] Generation error:", error);
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const cleanHandle = formData.igHandle.replace(/^@/, "");

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">#HoldThatL Generator</CardTitle>
              <CardDescription>
                Create branded whistle-blow graphics for social media
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Producer Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="igHandle">Instagram Handle</Label>
                <Input
                  id="igHandle"
                  placeholder="@johndoe or johndoe"
                  value={formData.igHandle}
                  onChange={(e) => handleInputChange("igHandle", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Production Company Name (optional)</Label>
                <Input
                  id="companyName"
                  placeholder="Killer Films LLC"
                  value={formData.productionCompanyName}
                  onChange={(e) => handleInputChange("productionCompanyName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pscs">(Current) PSCS Score</Label>
                <Input
                  id="pscs"
                  type="number"
                  placeholder="403"
                  min="0"
                  max="1000"
                  value={formData.pscsScore}
                  onChange={(e) => handleInputChange("pscsScore", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debt">Debt Owed</Label>
                <Input
                  id="debt"
                  type="number"
                  placeholder="1000.00"
                  min="0"
                  step="0.01"
                  value={formData.debtOwed}
                  onChange={(e) => handleInputChange("debtOwed", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Debt Age (days)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="158"
                  min="0"
                  value={formData.debtAge}
                  onChange={(e) => handleInputChange("debtAge", e.target.value)}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? "Generating..." : "Generate Image"}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
              <p className="text-sm text-muted-foreground">
                1080 × 1080px output (scaled for display)
              </p>
            </div>

            {/* Preview Container - Scales to 540x540 for display */}
            <div className="flex justify-center">
              <div
                ref={previewRef}
                className="relative border border-border rounded-lg overflow-hidden"
                style={{
                  width: "540px",
                  height: "540px",
                  backgroundColor: "#0D0D0D",
                }}
              >
                <div className="absolute inset-0 flex flex-col justify-center items-center px-12 py-16 text-white font-extrabold">
                  {/* Name & Handle */}
                  <div className="text-center mb-4" style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
                    <p className="text-4xl leading-tight">
                      {formData.name || "Name"}
                      {cleanHandle && `: @${cleanHandle}`}
                    </p>
                    {formData.productionCompanyName && (
                      <p className="text-2xl mt-2" style={{ color: "#999999" }}>
                        {formData.productionCompanyName}
                      </p>
                    )}
                  </div>

                  {/* PSCS */}
                  <div className="text-center mb-2" style={{ color: "#CCCCCC", textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
                    <p className="text-3xl">
                      (current) PSCS: {formData.pscsScore || "403"}
                    </p>
                  </div>

                  {/* Debt Owed */}
                  <div className="text-center mb-2" style={{ color: "#00B14F", textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
                    <p className="text-4xl">
                      Debt owed: {formatCurrency(formData.debtOwed || "0")}
                    </p>
                  </div>

                  {/* Debt Age */}
                  <div className="text-center mb-8" style={{ color: "#FF1E1E", textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
                    <p className="text-4xl">
                      Debt age: {formData.debtAge || "0"} days
                    </p>
                  </div>

                  {/* Hashtag */}
                  <div className="text-center mb-4" style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
                    <p className="text-5xl">#HoldThatL</p>
                  </div>

                  {/* Website */}
                  <div className="text-center" style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
                    <p className="text-2xl">www.LeakedLiability.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
