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
 * Generates tweet options from transcribed text
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
