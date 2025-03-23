import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Message interface
export interface Message {
  role: 'user' | 'model';
  content: string;
  screenshot?: string | null; // Optional screenshot data URL
}

// Initialize Gemini API
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let visionModel: GenerativeModel | null = null;

// Available Gemini models to try
const MODEL_NAMES = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-1.0-pro'
];

// Vision-capable models
const VISION_MODEL_NAMES = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro-vision',
  'gemini-1.0-pro-vision'
];

// Initialize the Gemini API with the provided API key
export function initializeGemini(apiKey: string): boolean {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    
    // Try to initialize with the first available model for text
    for (const modelName of MODEL_NAMES) {
      try {
        console.log(`Trying to initialize with model: ${modelName}`);
        model = genAI.getGenerativeModel({ model: modelName });
        console.log(`Successfully initialized with model: ${modelName}`);
        break;
      } catch (error) {
        console.warn(`Failed to initialize with model ${modelName}:`, error);
        // Continue to try the next model
      }
    }
    
    // Try to initialize with the first available model for vision
    for (const modelName of VISION_MODEL_NAMES) {
      try {
        console.log(`Trying to initialize vision model: ${modelName}`);
        visionModel = genAI.getGenerativeModel({ model: modelName });
        console.log(`Successfully initialized vision model: ${modelName}`);
        break;
      } catch (error) {
        console.warn(`Failed to initialize vision model ${modelName}:`, error);
        // Continue to try the next model
      }
    }
    
    // Check if at least one model was initialized
    if (!model && !visionModel) {
      console.error('Failed to initialize with any available model');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing Gemini API:', error);
    return false;
  }
}

// Check if Gemini API is initialized
export function isGeminiInitialized(): boolean {
  return genAI !== null && (model !== null || visionModel !== null);
}

// Helper function to determine the MIME type from a data URL
function getMimeTypeFromDataURL(dataURL: string): string {
  try {
    // Extract the MIME type from the data URL
    const match = dataURL.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
    if (match && match[1]) {
      return match[1]; // Return the found MIME type
    }
    // Default to JPEG if not found
    return 'image/jpeg';
  } catch (error) {
    console.error('Error determining MIME type:', error);
    return 'image/jpeg';
  }
}

// Helper function to convert data URL to base64
function dataURLToBase64(dataURL: string): string {
  try {
    // Extract the base64 part from data URL
    const match = dataURL.match(/^data:image\/[a-zA-Z+.-]+;base64,(.+)$/);
    if (match && match[1]) {
      return match[1];
    }
    console.error('Invalid data URL format');
    return '';
  } catch (error) {
    console.error('Error extracting base64 from data URL:', error);
    return '';
  }
}

// Send a message to Gemini API and get a response
export async function sendMessageToGemini(
  message: string, 
  history: Message[] = [],
  screenshot?: string | null
): Promise<string> {
  if (!isGeminiInitialized()) {
    throw new Error('Gemini API is not initialized. Please set a valid API key.');
  }

  try {
    console.log('Preparing to send message to Gemini...');
    
    // If screenshot is provided and vision model is available, use vision model
    if (screenshot && visionModel) {
      console.log('Processing message with screenshot using vision model');
      // Don't log full data URL length in production
      if (process.env.NODE_ENV === 'development') {
        console.log('Screenshot data URL length:', screenshot.length);
      }
      
      try {
        // Extract base64 data
        const base64Image = dataURLToBase64(screenshot);
        if (!base64Image) {
          throw new Error('Failed to extract image data');
        }
        
        // Don't log base64 data length in production
        if (process.env.NODE_ENV === 'development') {
          console.log('Base64 image data extracted, length:', base64Image.length);
        }
        
        // Get MIME type from data URL
        const mimeType = getMimeTypeFromDataURL(screenshot);
        console.log('Detected MIME type:', mimeType);
        
        // Prepare image object
        const imageData = {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        };
        
        // Prepare text prompt
        const promptText = message || "Analyze and describe this image in detail.";
        
        // Prepare content parts
        const contents = [{
          role: 'user',
          parts: [
            { text: promptText },
            imageData
          ]
        }];
        
        console.log('Sending content to vision model...');
        
        // Try first with generateContentStream
        try {
          const result = await visionModel.generateContent({
            contents: contents
          });
          
          console.log('Vision model response received');
          
          if (result && result.response) {
            return result.response.text();
          } else {
            throw new Error('Empty response from vision model');
          }
        } catch (streamError) {
          console.error('Stream generation error, trying legacy method:', streamError);
          
          // Fallback to legacy method
          const legacyResult = await visionModel.generateContent([
            { text: promptText },
            { inlineData: { data: base64Image, mimeType } }
          ]);
          
          if (legacyResult && legacyResult.response) {
            return legacyResult.response.text();
          } else {
            throw new Error('No response from vision model with legacy method');
          }
        }
      } catch (error: any) {
        console.error('Vision model error:', error);
        // Return a user-friendly error message
        return `I had trouble processing your image. The error was: ${error.message || 'Unknown error'}. Please try again with a different image or format.`;
      }
    }
    
    // Otherwise, use text-only model with chat history
    console.log('Processing text-only message');
    
    // Convert history to the format expected by Gemini API
    const chatHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));
    
    console.log('Using chat history with length:', chatHistory.length);
    
    // Create the chat session with history
    try {
      const chat = model!.startChat({
        history: chatHistory,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });
      
      console.log('Chat session created, sending message...');
      const result = await chat.sendMessage(message);
      console.log('Message sent successfully, getting response...');
      
      const response = result.response;
      return response.text();
    } catch (chatError) {
      console.warn('Chat method failed, falling back to direct content generation:', chatError);
      
      // Fallback to direct content generation
      const result = await model!.generateContent(message);
      console.log('Direct content generation successful');
      
      return result.response.text();
    }
  } catch (error) {
    console.error('Error sending message to Gemini:', error);
    throw error;
  }
} 