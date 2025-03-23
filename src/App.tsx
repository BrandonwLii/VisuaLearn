// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  CardFooter,
} from './components/ui/card'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import { Input } from "@/components/ui/input"
import { SettingsDialog } from '@/components/settings-dialog'
import { TitleBar } from '@/components/title-bar'
import { Mic, MicOff, Send, Camera, X } from 'lucide-react'
import { isGeminiInitialized, initializeGemini, sendMessageToGemini, Message } from '@/lib/gemini-service'

import './App.css'

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioTranscript, setAudioTranscript] = useState<string>('');
  // Screenshot related states
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isScreenshotVisible, setIsScreenshotVisible] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if API key is set on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const apiKey = await window.electronAPI.getApiKey();
        if (apiKey) {
          const initialized = initializeGemini(apiKey);
          setApiKeySet(initialized);
        } else {
          // If no API key is set, prompt the user to enter one
          setIsSettingsOpen(true);
        }
      } catch (err) {
        console.error('Failed to check API key:', err);
      }
    };

    checkApiKey();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Adjust card content height when window is resized
  useEffect(() => {
    const handleResize = () => {
      if (cardContentRef.current) {
        const containerHeight = cardContentRef.current.parentElement?.clientHeight || 0;
        // Adjust for title bar and footer height
        const contentHeight = containerHeight - 110; // Approximate header and footer height
        cardContentRef.current.style.height = `${Math.max(contentHeight, 200)}px`;
      }
    };

    // Initial adjustment
    handleResize();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(handleResize);
    const container = document.querySelector('.app-container');
    if (container) {
      resizeObserver.observe(container);
    }

    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
      resizeObserver.disconnect();
    };
  }, []);

  // Handle audio recording
  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Clear previous recording data
      audioChunksRef.current = [];
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up data handling
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Create blob from audio chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Process the audio with Gemini
        await processAudioWithGemini(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Process audio with Gemini API
  const processAudioWithGemini = async (audioBlob: Blob) => {
    if (!apiKeySet) {
      setIsSettingsOpen(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('Processing audio with Gemini API...');
      
      // Convert audio to base64
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioBase64 = btoa(
        new Uint8Array(audioBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      // Create a message to send to Gemini with instructions to transcribe audio
      const transcriptionPrompt = "Please transcribe the following audio. The audio contains spoken content that needs to be converted to text.";
      
      // Send the transcription request to Gemini
      try {
        const transcript = await sendMessageToGemini(
          transcriptionPrompt,
          [],
          null
        );
        
        console.log('Received transcript from Gemini:', transcript);
        
        // Extract the actual transcription from the response
        // Use a simpler response for now while Gemini audio transcription is being implemented
        const processedTranscript = transcript.includes('would appear') 
          ? transcript 
          : "I couldn't understand the audio clearly. Could you please speak more clearly?";
        
        setInputValue(processedTranscript);
      } catch (geminiError) {
        console.error('Error getting transcription from Gemini:', geminiError);
        // Fallback to simulated transcription
        setInputValue("I couldn't process the audio. Please try typing your message instead.");
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setInputValue("There was an error processing your audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle taking a screenshot
  const takeScreenshot = async () => {
    try {
      console.log('Taking screenshot using Electron API...');
      
      // Use Electron's screenshot functionality instead of browser APIs
      if (window.electronAPI && window.electronAPI.captureScreenshot) {
        try {
          const dataUrl = await window.electronAPI.captureScreenshot();
          console.log('Screenshot data URL received, length:', dataUrl?.length || 0);
          
          if (!dataUrl || dataUrl.length < 100) {
            throw new Error('Invalid screenshot data received');
          }
          
          setScreenshot(dataUrl);
          setIsScreenshotVisible(true);
          console.log('Screenshot captured successfully and set to state');
        } catch (electronError) {
          console.error('Electron screenshot error:', electronError);
          throw electronError; // Re-throw to try fallback
        }
      } else {
        throw new Error('Electron API or captureScreenshot method not available');
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
      
      // Fallback to browser API method (for development/testing)
      try {
        // Capture the entire screen using the desktop capture API
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true // Use standard constraint instead of mediaSource
        });
        
        // Create video element to capture the stream
        const video = document.createElement('video');
        video.srcObject = stream;
        
        // Wait for video to load
        await video.play();
        
        // Create canvas and draw the video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        setScreenshot(dataUrl);
        setIsScreenshotVisible(true);
        
        // Stop all tracks to release the screen capture
        stream.getTracks().forEach(track => track.stop());
      } catch (fallbackError) {
        console.error('Fallback screenshot method also failed:', fallbackError);
      }
    }
  };

  // Handle pasting an image
  const handlePaste = (e: React.ClipboardEvent) => {
    console.log('Paste event detected');
    const items = e.clipboardData.items;
    console.log('Clipboard items count:', items.length);
    
    // First check for direct image items
    for (let i = 0; i < items.length; i++) {
      console.log(`Item ${i} type:`, items[i].type);
      
      if (items[i].type.indexOf('image') !== -1) {
        console.log('Image item found in clipboard');
        const blob = items[i].getAsFile();
        if (blob) {
          console.log('Converting image blob to data URL, size:', blob.size);
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const dataUrl = event.target.result as string;
              console.log('Image data URL created, length:', dataUrl.length);
              setScreenshot(dataUrl);
              setIsScreenshotVisible(true);
            }
          };
          reader.readAsDataURL(blob);
          return; // Processed an image, exit
        }
      }
    }
    
    // If no direct image, try looking for files that could be images
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file && file.type.startsWith('image/')) {
          console.log('Image file found in clipboard, type:', file.type);
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const dataUrl = event.target.result as string;
              console.log('Image data URL created from file, length:', dataUrl.length);
              setScreenshot(dataUrl);
              setIsScreenshotVisible(true);
            }
          };
          reader.readAsDataURL(file);
          return; // Processed an image file, exit
        }
      }
    }
    
    console.log('No image found in clipboard');
  };

  // Handle file selection for screenshot
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setScreenshot(event.target.result as string);
            setIsScreenshotVisible(true);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Trigger file input click
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Clear the screenshot
  const clearScreenshot = () => {
    setScreenshot(null);
    setIsScreenshotVisible(false);
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !screenshot) || isProcessing) return;

    // Check if API key is set
    if (!apiKeySet) {
      setIsSettingsOpen(true);
      return;
    }

    // Log screenshot for debugging
    if (screenshot) {
      console.log('Sending message with screenshot, data URL length:', screenshot.length);
    }

    // Create message content
    let messageContent = inputValue.trim();
    if (screenshot) {
      messageContent += screenshot ? "\n[Image attached]" : "";
    }

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      screenshot: screenshot,
    };

    // Add user message to the chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    // Store screenshot for sending
    const screenshotToSend = screenshot;
    
    // Clear screenshot after adding to message
    setScreenshot(null);
    setIsScreenshotVisible(false);

    try {
      console.log('Sending message to Gemini with', 
        screenshotToSend ? 'screenshot attached' : 'no screenshot',
        'Message content:', messageContent);
      
      // Send message to Gemini API
      const response = await sendMessageToGemini(
        userMessage.content,
        messages,
        screenshotToSend // Use the stored screenshot
      );

      // Add Gemini's response to the chat
      const modelMessage: Message = {
        role: 'model',
        content: response,
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error getting response from Gemini:', error);
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: 'Sorry, there was an error processing your request. Please check your API key in settings.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettingsSaved = () => {
    setApiKeySet(isGeminiInitialized());
  };

  // Handle opening settings
  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  // Handle closing settings
  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className="app-container rounded-lg overflow-hidden shadow-lg" onPaste={handlePaste}>
          <Card className="border-none rounded-lg overflow-hidden h-full">
            <TitleBar onSettingsClick={handleOpenSettings} />
            
            <CardContent className="p-4 pt-2 flex-grow overflow-hidden" ref={cardContentRef}>
              <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <div>
                      <p>No messages yet</p>
                      <p className="text-sm">Ask a question to get started</p>
                      <p className="text-sm mt-2">You can upload images using the upload button or by pasting from clipboard</p>
                      {!apiKeySet && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleOpenSettings}
                          className="mt-4"
                        >
                          Set API Key
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`mb-4 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-zinc-800 text-gray-100'
                            : 'bg-zinc-900 text-gray-200'
                        }`}
                      >
                        {message.content}
                        {message.screenshot && (
                          <div className="mt-2">
                            <img 
                              src={message.screenshot} 
                              alt="Screenshot" 
                              className="max-w-full rounded-md"
                              style={{ maxHeight: '200px' }} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isProcessing && (
                  <div className="text-left mb-4">
                    <div className="inline-block p-3 rounded-lg bg-zinc-900">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            {/* Screenshot Preview */}
            {isScreenshotVisible && screenshot && (
              <div className="px-4 py-2 border-t border-border flex justify-start items-center max-h-24 overflow-hidden">
                <div className="relative inline-block mr-2" style={{ maxWidth: '80px', maxHeight: '60px' }}>
                  <img 
                    src={screenshot} 
                    alt="Screenshot" 
                    className="rounded-md border border-border"
                    style={{ maxHeight: '60px', maxWidth: '80px', objectFit: 'cover' }} 
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                    onClick={clearScreenshot}
                  >
                    <X className="h-2 w-2" />
                    <span className="sr-only">Remove screenshot</span>
                  </Button>
                </div>
                <div className="text-xs text-gray-400">
                  Image ready to send
                </div>
              </div>
            )}
            
            <CardFooter className="px-4 pt-7 pb-0 border-t flex items-center justify-center">
              <div className="flex items-center w-full space-x-2 mb-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                
                <Button
                  variant="ghost"
                  size="icon" 
                  className={`h-8 w-8 p-0 ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                  onClick={toggleRecording}
                  disabled={isProcessing}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span className="sr-only">{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  onClick={takeScreenshot}
                  disabled={isProcessing || isRecording}
                >
                  <Camera className="h-4 w-4" />
                  <span className="sr-only">Take Screenshot</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0"
                  onClick={openFileSelector}
                  disabled={isProcessing || isRecording}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span className="sr-only">Upload Image</span>
                </Button>
                
                <Input 
                  className='flex-1'
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message here..."
                  disabled={isProcessing || isRecording}
                />
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={((!inputValue.trim() && !screenshot) || isProcessing || !apiKeySet)}
                  className="h-8 w-8 p-0"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {isSettingsOpen && (
          <SettingsDialog 
            isOpen={isSettingsOpen}
            onClose={handleCloseSettings}
            onSave={handleSettingsSaved}
          />
        )}
      </ThemeProvider>
    </>
  )
}

export default App
