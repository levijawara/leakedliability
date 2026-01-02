import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "./SafeImage";
import { toast } from "@/hooks/use-toast";

interface FAFOEntryCardProps {
  entry: {
    id: string;
    created_at: string;
    hold_that_l_image_path: string;
    proof_image_path: string;
    holdThatLUrl: string;
    proofUrl: string;
  };
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

export function FAFOEntryCard({ entry, isAdmin, onDelete }: FAFOEntryCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0); // 0 = HoldThatL, 1 = Proof
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleDelete = async () => {
    if (!confirm("Delete this FAFO entry? This cannot be undone.")) {
      return;
    }

    setDeleting(true);

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('fafo_entries')
        .delete()
        .eq('id', entry.id);

      if (dbError) throw dbError;

      // Delete files from storage
      const { data: files } = await supabase.storage
        .from('fafo-results')
        .list(entry.id);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${entry.id}/${f.name}`);
        await supabase.storage
          .from('fafo-results')
          .remove(filePaths);
      }

      toast({
        title: "Entry Deleted",
        description: "FAFO entry removed successfully",
      });

      onDelete(entry.id);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Handle touch events for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance && currentSlide < 1) {
      // Swipe left - go to next slide
      setCurrentSlide(1);
    } else if (distance < -minSwipeDistance && currentSlide > 0) {
      // Swipe right - go to previous slide
      setCurrentSlide(0);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Reset slide when modal opens
  useEffect(() => {
    if (isPreviewOpen) {
      setCurrentSlide(0);
    }
  }, [isPreviewOpen]);

  return (
    <Card className="relative overflow-hidden border-2 border-muted shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] duration-300">
      {/* Admin Delete Button */}
      {isAdmin && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-4 right-4 z-10 opacity-0 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <div className="p-6">
        {/* Images Container */}
        <div 
          className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4 cursor-pointer"
          onClick={() => setIsPreviewOpen(true)}
        >
          {/* #HoldThatL Image */}
          <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden rounded-md bg-black">
            <SafeImage
              src={entry.holdThatLUrl}
              alt="Hold That L Generator Image"
              className="w-full h-full object-cover"
              fallbackText="Hold That L image unavailable"
              timeoutMs={8000}
              retryCount={2}
              showLoader={true}
            />
          </div>

          {/* Vertical Divider (desktop only) */}
          <div className="hidden md:block w-px bg-border" />

          {/* Proof Image */}
          <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden rounded-md bg-black">
            <SafeImage
              src={entry.proofUrl}
              alt="Payment Proof Screenshot"
              className="w-full h-full object-cover"
              fallbackText="Proof image unavailable"
              timeoutMs={8000}
              retryCount={2}
              showLoader={true}
            />
          </div>
        </div>
      </div>

      {/* Full Size Preview Modal - Responsive Design */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl md:max-w-5xl max-h-[95vh] p-4 md:p-6 overflow-hidden">
          {/* Desktop: Side-by-side layout */}
          <div className="hidden md:flex md:flex-row gap-4 md:gap-6 max-h-[85vh]">
            {/* #HoldThatL Full Size */}
            <div className="w-1/2 flex items-center justify-center overflow-auto">
              <SafeImage
                src={entry.holdThatLUrl}
                alt="Hold That L Generator Image - Full Size"
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                fallbackText="Hold That L image unavailable"
                timeoutMs={10000}
                retryCount={2}
                showLoader={true}
              />
            </div>
            
            {/* Vertical Divider */}
            <div className="w-px bg-border" />
            
            {/* Proof Full Size */}
            <div className="w-1/2 flex items-center justify-center overflow-auto">
              <SafeImage
                src={entry.proofUrl}
                alt="Payment Proof Screenshot - Full Size"
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                fallbackText="Proof image unavailable"
                timeoutMs={10000}
                retryCount={2}
                showLoader={true}
              />
            </div>
          </div>

          {/* Mobile: Carousel layout with swipe */}
          <div 
            className="md:hidden relative w-full h-[85vh] overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Carousel Container */}
            <div 
              className="flex transition-transform duration-300 ease-in-out h-full"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {/* Slide 1: #HoldThatL */}
              <div className="min-w-full h-full flex items-center justify-center p-4">
                <SafeImage
                  src={entry.holdThatLUrl}
                  alt="Hold That L Generator Image - Full Size"
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                  fallbackText="Hold That L image unavailable"
                  timeoutMs={10000}
                  retryCount={2}
                  showLoader={true}
                />
              </div>

              {/* Slide 2: Proof */}
              <div className="min-w-full h-full flex items-center justify-center p-4">
                <SafeImage
                  src={entry.proofUrl}
                  alt="Payment Proof Screenshot - Full Size"
                  className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                  fallbackText="Proof image unavailable"
                  timeoutMs={10000}
                  retryCount={2}
                  showLoader={true}
                />
              </div>
            </div>

            {/* Mobile Navigation Arrows */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(prev => Math.max(0, prev - 1));
              }}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(prev => Math.min(1, prev + 1));
              }}
              disabled={currentSlide === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Mobile Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              <button
                onClick={() => setCurrentSlide(0)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentSlide === 0 ? 'bg-primary w-6' : 'bg-muted-foreground/50'
                }`}
                aria-label="Go to Hold That L image"
              />
              <button
                onClick={() => setCurrentSlide(1)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentSlide === 1 ? 'bg-primary w-6' : 'bg-muted-foreground/50'
                }`}
                aria-label="Go to Proof image"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
