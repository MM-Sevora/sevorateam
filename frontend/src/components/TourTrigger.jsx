import React, { useState } from 'react';
import { HelpCircle, Play, RotateCcw } from 'lucide-react';
import { useTour } from './GuidedTour';
import { Button } from './ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

const TourTrigger = ({ currentModule = 'dashboard' }) => {
  const [open, setOpen] = useState(false);
  const tourContext = useTour();
  
  // If tour context not available, don't render
  if (!tourContext) return null;
  
  const { 
    startTour, 
    availableTours = {}, 
    completedTours = [],
    isRunning
  } = tourContext;

  const tourList = Object.entries(availableTours).map(([key, def]) => ({
    key,
    name: def.name,
    description: def.description,
    completed: completedTours.includes(key),
    stepCount: def.steps?.length || 0
  }));

  const handleStartTour = (tourKey) => {
    setOpen(false);
    setTimeout(() => startTour(tourKey), 100);
  };

  // Don't show trigger if a tour is active
  if (isRunning) return null;

  const hasUncompletedTours = tourList.some(t => !t.completed);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={`fixed bottom-20 right-6 w-12 h-12 rounded-full bg-gradient-to-br from-[#c5a572] to-[#a88c5c] text-[#1a1a1a] border-none cursor-pointer flex items-center justify-center shadow-lg transition-all duration-300 z-[9999] hover:scale-110 ${hasUncompletedTours ? 'animate-pulse' : ''}`}
          title="Guided Tours"
          data-tour="tour-trigger"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        side="top" 
        align="end"
        sideOffset={12}
      >
        <div className="p-4 border-b">
          <h3 className="font-semibold text-base">Guided Tours</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Learn how to use Sevora with interactive walkthroughs
          </p>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {tourList.map((tour) => (
            <div 
              key={tour.key}
              className="flex items-center justify-between p-3 hover:bg-accent/50 border-b last:border-b-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{tour.name}</span>
                  {tour.completed && (
                    <span className="text-xs bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded">
                      Done
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {tour.stepCount} steps
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleStartTour(tour.key)}
                  title="Start tour"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t bg-muted/30 text-center">
          <span className="text-xs text-muted-foreground">
            Click play to start any tour
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TourTrigger;
