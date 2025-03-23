import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { initializeGemini } from '@/lib/gemini-service';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function SettingsDialog({ isOpen, onClose, onSave }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  
  // State for resizing and dragging the dialog
  const [isResizing, setIsResizing] = useState(false);
  const [dialogSize, setDialogSize] = useState({ width: 450, height: 'auto' });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [isElectronReady, setIsElectronReady] = useState(false);

  // Check if Electron API is available
  useEffect(() => {
    const checkElectronAPI = () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          // Try to ping the API to ensure it's fully functional
          const pingResult = window.electronAPI.ping();
          console.log('Electron API ping result:', pingResult);
          setIsElectronReady(true);
          return true;
        } catch (error) {
          console.error('Error pinging Electron API:', error);
          return false;
        }
      }
      return false;
    };

    // Try initially
    const isReady = checkElectronAPI();
    
    // If not ready, set up an interval to check again
    if (!isReady) {
      console.log('Electron API not ready, setting up polling interval...');
      const intervalId = setInterval(() => {
        console.log('Checking if Electron API is available...');
        if (checkElectronAPI()) {
          console.log('Electron API is now available!');
          clearInterval(intervalId);
        }
      }, 500); // Check every 500ms
      
      // Clean up interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, []);

  // Load API key when component mounts and electronAPI is ready
  useEffect(() => {
    const loadApiKey = async () => {
      if (!isElectronReady) {
        console.log('Electron API not ready yet, waiting...');
        return;
      }
      
      try {
        console.log('Attempting to get API key...');
        const savedApiKey = await window.electronAPI.getApiKey();
        console.log('API key retrieved:', savedApiKey ? 'Key found' : 'No key found');
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
      } catch (err) {
        console.error('Failed to load API key:', err);
        setError('Could not load saved API key. Please try entering it manually.');
      }
    };

    if (isOpen && isElectronReady) {
      loadApiKey();
    }
  }, [isOpen, isElectronReady]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      if (!isElectronReady) {
        throw new Error('Electron API not ready yet. Please try again in a moment.');
      }
      
      console.log('Saving API key...');
      const result = await window.electronAPI.saveApiKey(apiKey);
      console.log('Save result:', result);
      
      if (!result) {
        throw new Error('Failed to save API key');
      }
      
      const initialized = initializeGemini(apiKey);
      
      if (initialized) {
        onSave();
        onClose();
      } else {
        setError('Failed to initialize Gemini with the provided API key. Please check if the key is valid.');
      }
    } catch (err) {
      console.error('Failed to save API key:', err);
      setError(`Error saving API key: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleSave();
    }
  };
  
  // Handle start of resize operation
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setStartPosition({ x: e.clientX, y: e.clientY });
    
    if (dialogRef.current) {
      setStartSize({
        width: dialogRef.current.offsetWidth,
        height: dialogRef.current.offsetHeight
      });
    }
    
    // Add event listeners for mousemove and mouseup
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle resize move
  const handleResizeMove = (e: MouseEvent) => {
    if (isResizing) {
      // Calculate new width and height based on mouse movement
      const newWidth = startSize.width + (e.clientX - startPosition.x);
      // Set a minimum width to prevent the dialog from becoming too small
      setDialogSize({
        width: Math.max(300, newWidth),
        height: 'auto'
      });
    }
  };
  
  // Handle end of resize operation
  const handleResizeEnd = () => {
    setIsResizing(false);
    // Remove event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      ref={backdropRef}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyPress}
      tabIndex={-1}
    >
      <div 
        ref={dialogRef}
        className="bg-background rounded-lg shadow-lg border border-border relative overflow-hidden"
        style={{ 
          width: dialogSize.width,
          height: dialogSize.height,
          minWidth: '300px',
          maxWidth: '800px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Gemini API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from <a href="https://ai.google.dev/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google AI Studio</a>
              </p>
              {!isElectronReady && (
                <p className="text-amber-500 text-xs mt-1">
                  Waiting for Electron API to be ready...
                </p>
              )}
              {error && <p className="text-destructive text-xs mt-1">{error}</p>}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !apiKey.trim() || !isElectronReady}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        
        {/* Resize handle */}
        <div 
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
          onMouseDown={handleResizeStart}
          style={{
            background: 'transparent',
            zIndex: 10,
          }}
        >
          <svg 
            width="10" 
            height="10" 
            viewBox="0 0 10 10" 
            className="absolute bottom-1 right-1 text-gray-400"
          >
            <path d="M0 10L10 0L10 10H0Z" fill="currentColor" opacity="0.4" />
          </svg>
        </div>
      </div>
    </div>
  );
} 