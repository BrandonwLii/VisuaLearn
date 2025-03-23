# VisuaLearn

VisuaLearn is a desktop application that leverages Google's Gemini AI to provide a powerful chat interface with both text and image capabilities. The application allows users to interact with Gemini using text messages, upload images for analysis, and even capture screenshots directly within the app.

## Features

- **Modern UI**: Clean, dark-themed interface with customizable appearance
- **Text Conversation**: Chat-based interface for interacting with Google's Gemini AI models
- **Image Analysis**: Upload images or take screenshots for AI analysis
- **Audio Input**: Record voice messages that get processed by the AI
- **Desktop Integration**: Standalone Electron application that stays on top of other windows until minimized
- **Persistent Settings**: Your API key and window preferences are automatically saved
- **Responsive Design**: Window is resizable while maintaining proper layout
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Prerequisites

- Node.js (v16+)
- NPM or Yarn
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/VisuaLearn.git
   cd VisuaLearn
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment (optional):
   ```
   cp .env.example .env
   ```
   Edit the `.env` file to set your own encryption key.

4. Start the application:
   ```
   npm run electron:win  # On Windows
   npm run electron:dev  # On other platforms
   ```

## Configuration

On first launch, you'll be prompted to enter your Google Gemini API key. This can be obtained from the Google AI Studio website. The API key is securely stored locally on your device.

## Usage

### Text Chat
1. Type your message in the input field at the bottom of the app
2. Press Enter or click the Send button to submit your message
3. The AI will respond in the conversation area

### Image Analysis
1. Click the camera icon or paste an image from clipboard
2. Alternatively, you can capture a screenshot of your screen
3. The image will appear as a preview in the message area
4. Add any text description if needed and send your message
5. The AI will analyze the image and respond accordingly

### Voice Input
1. Click the microphone icon to start recording
2. Speak your message clearly
3. Click the microphone icon again to stop recording
4. Your voice input will be processed and appear in the text input field
5. You can edit the text before sending if needed

## Development Commands

- `npm run dev` - Start Vite development server
- `npm run build` - Build the application for production
- `npm run electron:dev` - Start the Electron app in development mode
- `npm run electron:win` - Start the app using PowerShell script (Windows)
- `npm run electron:build` - Build the Electron application for distribution

## App Architecture

VisuaLearn is built with:
- React for the user interface
- TypeScript for type safety
- Electron for desktop integration
- TailwindCSS for styling
- Google Gemini API for AI capabilities

## Window Management

The application window is designed to stay on top of other windows (always-on-top) until you explicitly minimize it by clicking the minimize button, allowing you to use it alongside other applications.

## Security

VisuaLearn takes security seriously:

- **API Key Storage**: Your Gemini API key is stored securely using `electron-store` with encryption
- **Local Storage Only**: All data is stored locally on your device; no data is sent to any servers except the Gemini API
- **DevTools**: Developer tools are disabled in production builds
- **No Telemetry**: The application does not collect any usage data or telemetry
- **Sensitive Data Logging**: In production builds, sensitive data like image content is not logged to the console

Before pushing to a public repository, make sure to:
1. Remove any personal API keys from the code
2. Check that the `.gitignore` file excludes sensitive files
3. Set up proper environment variables for production

## License

MIT
