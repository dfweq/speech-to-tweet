import { apiRequest } from './queryClient';

/**
 * Transcribes audio to text using OpenAI's Whisper API
 */
export async function transcribeAudio(
  base64Audio: string,
  format: string = 'webm'
): Promise<{ transcript: string }> {
  try {
    const response = await apiRequest('POST', '/api/transcribe', {
      audioData: base64Audio,
      format
    });
    
    return await response.json();
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Processes raw transcription and creates a coherent tweet thread in a single call
 * This is the improved workflow that handles both grammar correction and tweet formatting
 */
export async function processTranscriptionAndCreateTweet(text: string): Promise<string[]> {
  try {
    const response = await apiRequest('POST', '/api/process-and-create-tweet', {
      text
    });
    
    const data = await response.json();
    return data.tweets;
  } catch (error) {
    console.error('Error processing transcription and creating tweet:', error);
    throw new Error('Failed to process transcription and create tweet');
  }
}

/**
 * Generates tweet options from transcribed text
 * Kept for backward compatibility
 */
export async function generateTweetOptions(
  text: string,
  alternativesOnly: boolean = false
): Promise<string[]> {
  try {
    const response = await apiRequest('POST', '/api/generate-tweet', {
      text,
      alternativesOnly
    });
    
    const data = await response.json();
    return data.tweets;
  } catch (error) {
    console.error('Error generating tweet options:', error);
    throw new Error('Failed to generate tweet options');
  }
}
