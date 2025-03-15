# Voice-to-Tweet

A modern web application that converts your spoken audio into Twitter-ready posts, making social media content creation effortless.

![Voice-to-Tweet](generated-icon.png)

## Features

- **Audio Recording**: Record your voice directly in the browser
- **Transcription**: Convert speech to text using OpenAI's Whisper API
- **Smart Formatting**: Automatically format transcriptions into Twitter-friendly posts
- **Thread Creation**: Generate and post tweet threads for longer content
- **Twitter Integration**: Post directly to Twitter with proper thread formatting
- **Edit Capability**: Edit generated tweets before posting
- **Alternative Options**: Get multiple tweet suggestions for each recording

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js server with RESTful API endpoints
- **AI Integration**: OpenAI Whisper API for speech-to-text and GPT-4o for tweet formatting
- **Social Media**: Twitter API v2 for posting tweets and threads
- **Audio Processing**: RecordRTC for browser-based audio recording

## Getting Started

### Prerequisites

To use this application, you'll need:

1. **Twitter API Credentials**:
   - Twitter API Key (`TWITTER_API_KEY`)
   - Twitter API Secret (`TWITTER_API_SECRET`) 
   - Twitter Access Token (`TWITTER_ACCESS_TOKEN`)
   - Twitter Access Secret (`TWITTER_ACCESS_SECRET`)

2. **OpenAI API Key**:
   - OpenAI API Key (`OPENAI_API_KEY`)

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your environment variables (listed in Prerequisites)
4. Start the development server:
   ```
   npm run dev
   ```

## Usage Guide

1. **Record Your Voice**:
   - Click the microphone button to start recording
   - Speak clearly into your microphone
   - Click the stop button when finished

2. **Review the Generated Content**:
   - The application will process your audio and generate tweet content
   - Review the main tweet and additional options
   - Edit as needed by clicking the Edit button

3. **Post to Twitter**:
   - Click "Post to Twitter" to publish a single tweet
   - Click "Post as Thread" to publish multiple tweets as a connected thread

4. **Credential Management**:
   - If you encounter Twitter API authentication issues, the app will guide you through updating your credentials

## Error Handling

The application includes comprehensive error handling for:

- Twitter API authentication issues
- Rate limit management
- Network connection problems
- Audio recording errors
- File size limitations

## Privacy and Security

- Audio data is processed securely and not stored permanently
- Twitter API credentials are used only for the intended posting functionality
- No user data is shared with third parties

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with your changes

## License

MIT License

## Acknowledgments

- Thanks to OpenAI for providing the Whisper and GPT-4o APIs
- Thanks to Twitter (X) for their v2 API