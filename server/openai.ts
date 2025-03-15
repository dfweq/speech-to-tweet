import OpenAI from "openai";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import os from "os";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

/**
 * Transcribes audio using OpenAI's Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  format: string = "webm"
): Promise<{ text: string, duration: number }> {
  try {
    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `audio-${Date.now()}.${format}`);
    
    // Write buffer to temp file
    fs.writeFileSync(tempFile, audioBuffer);
    
    // Create file read stream
    const audioReadStream = fs.createReadStream(tempFile);
    
    // Log audio details before transcription
    console.log(`[Whisper] Transcribing audio file: ${tempFile}, Format: ${format}, Size: ${audioBuffer.length} bytes`);
    
    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
    });
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    // Log the transcription result
    console.log(`[Whisper] Transcription result: "${transcription.text}"`);
    
    // The duration might not be available in newer versions of the API
    const duration = typeof transcription === 'object' && 'duration' in transcription ? 
      (transcription as any).duration || 0 : 0;
    
    console.log(`[Whisper] Transcription duration: ${duration} seconds`);
    
    return {
      text: transcription.text,
      duration: duration,
    };
  } catch (error) {
    console.error("OpenAI Whisper API error:", error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates tweet options from text using GPT-4o
 */
export async function generateTweetOptions(
  text: string,
  alternativesOnly: boolean = false
): Promise<string[]> {
  try {
    console.log(`[GPT-4o] Generating tweet options for: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    console.log(`[GPT-4o] Mode: ${alternativesOnly ? 'Alternative options' : 'Initial generation'}`);

    const systemPrompt = alternativesOnly 
      ? "Generate 2 alternative tweet versions from the original text. Each tweet should be under 280 characters, engaging, and optimized for social media. Format your response as a JSON array of strings with just the tweet text."
      : "Convert the following transcribed speech into 3 Twitter-ready posts. Each tweet should be under 280 characters, engaging, and maintain the core message. Format your response as a JSON array of strings with just the tweet text.";
    
    const userPrompt = alternativesOnly 
      ? `Generate alternative tweet versions for this existing tweet: "${text}"`
      : `Here is the transcribed speech: "${text}"`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }
    
    const parsedResponse = JSON.parse(content);
    
    // Extract tweets from the response
    let tweets: string[] = [];
    if (Array.isArray(parsedResponse.tweets)) {
      tweets = parsedResponse.tweets;
    } else if (Array.isArray(parsedResponse)) {
      tweets = parsedResponse;
    } else {
      console.error("Unexpected response format:", parsedResponse);
      tweets = [text]; // Fallback to original text
    }
    
    // Log the generated tweets
    console.log(`[GPT-4o] Generated ${tweets.length} tweet options:`);
    tweets.forEach((tweet, index) => {
      console.log(`[GPT-4o] Option ${index + 1}: "${tweet}"`);
    });
    
    return tweets;
  } catch (error) {
    console.error("OpenAI GPT-4o API error:", error);
    // Fallback to original text
    return [text];
  }
}
