import React from 'react';
import { X, Minus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ModeToggle } from '@/components/mode-toggle';

interface TitleBarProps {
  onSettingsClick: () => void;
}

export function TitleBar({ onSettingsClick }: TitleBarProps) {
  // Handle minimize window
  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI.minimizeWindow();
    } catch (error) {
      console.error('Error minimizing window:', error);
    }
  };

  // Handle close window
  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await window.electronAPI.closeWindow();
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  // Handle settings click - prevent event propagation to avoid closing the app
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSettingsClick();
  };

  return (
    <div className="draggable flex justify-between items-center p-2 w-full select-none">
      <div className="inline-flex items-center draggable">
        <Avatar className="mr-2 h-8 w-8 flex-shrink-0 flex items-center justify-center">
          <AvatarImage src="@/assets/logo.png" alt="Logo" />
          <AvatarFallback>VL</AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-bold draggable">VisuaLearn</h1>
      </div>

      <div className="flex items-center gap-1 no-drag">
        {/* Settings button with consistent size */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSettingsClick} 
          className="h-8 w-8 p-0 no-drag"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
        
        {/* Mode toggle button - now matches other buttons */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 p-0 no-drag"
        >
          <ModeToggle />
        </Button>
        
        {/* Minimize button with consistent size */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleMinimize} 
          className="h-8 w-8 p-0 no-drag"
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Minimize</span>
        </Button>
        
        {/* Close button with white color instead of red */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleClose} 
          className="h-8 w-8 p-0 no-drag"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </div>
  );
} 