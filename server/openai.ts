import OpenAI from "openai";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import os from "os";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Caching system to prevent duplicate API calls
interface CacheItem<T> {
  value: T;
  timestamp: number;
}

// Cache for transcription and tweet generation results
const transcriptionCache = new Map<string, CacheItem<{ text: string, duration: number }>>();
const tweetGenerationCache = new Map<string, CacheItem<string[]>>();

// Cache expiration time: 5 minutes
const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

// Function to get a cache key from a buffer
function getBufferCacheKey(buffer: Buffer): string {
  // Use the buffer's length and first/last few bytes as a simple cache key
  const start = buffer.slice(0, Math.min(20, buffer.length)).toString('hex');
  const end = buffer.slice(Math.max(0, buffer.length - 20), buffer.length).toString('hex');
  return `${buffer.length}-${start}-${end}`;
}

// Function to clean expired cache items
function cleanExpiredCache<T>(cache: Map<string, CacheItem<T>>) {
  const now = Date.now();
  // Use Array.from to convert entries to an array that can be iterated without downlevelIteration
  Array.from(cache.entries()).forEach(([key, item]) => {
    if (now - item.timestamp > CACHE_EXPIRATION_MS) {
      cache.delete(key);
    }
  });
}

/**
 * Transcribes audio using OpenAI's Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  format: string = "webm"
): Promise<{ text: string, duration: number }> {
  try {
    // Clean expired cache entries
    cleanExpiredCache(transcriptionCache);
    
    // Generate a cache key for this audio buffer
    const cacheKey = getBufferCacheKey(audioBuffer);
    
    // Check if we have a cached result
    const cachedResult = transcriptionCache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Whisper] Using cached transcription result: "${cachedResult.value.text}"`);
      return cachedResult.value;
    }
    
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
    
    const result = {
      text: transcription.text,
      duration: duration,
    };
    
    // Cache the result
    transcriptionCache.set(cacheKey, {
      value: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error("OpenAI Whisper API error:", error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Processes raw transcription and creates a coherent tweet thread in a single call
 * Uses caching to prevent duplicate API calls
 */
export async function processTranscriptionAndCreateTweet(rawTranscript: string): Promise<string[]> {
  // Avoid processing empty transcripts
  if (!rawTranscript || rawTranscript.trim() === "") {
    return [""];
  }
  
  console.log(`[GPT-4o] Processing transcription and creating tweets: "${rawTranscript.substring(0, 100)}${rawTranscript.length > 100 ? '...' : ''}"`);
  
  try {
    // Clean expired cache entries
    cleanExpiredCache(tweetGenerationCache);
    
    // Use the trimmed transcript as the cache key
    const cacheKey = rawTranscript.trim();
    
    // Check if we have a cached result
    const cachedResult = tweetGenerationCache.get(cacheKey);
    if (cachedResult) {
      console.log(`[GPT-4o] Using cached tweet thread with ${cachedResult.value.length} tweets`);
      return cachedResult.value;
    }
    
    // Make sure we don't exceed rate limits by implementing simple exponential backoff
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          messages: [
            {
              role: "system",
              content: "You are a minimal text processor for Twitter that makes only essential changes to preserve the original voice, style and personality. Your primary goal is authenticity - the tweets should sound exactly like the person who recorded them."
            },
            {
              role: "user",
              content: `This is a raw speech-to-text transcription: "${rawTranscript}"
                       
                       IMPORTANT: Make only MINIMAL adjustments:
                       1. Fix only MAJOR grammar errors that impact understanding
                       2. DO NOT rephrase, restructure sentences, or change tone/voice
                       3. DO NOT remove casual language, personal style, or speaking quirks
                       4. DO NOT add professional polish or make the text formal
                       5. KEEP my authentic voice exactly as is
                       
                       Format only for Twitter's character limits:
                          - If under 280 characters, return as a single tweet unchanged
                          - If longer, split at natural sentence breaks (max 280 chars each)
                          - Add minimal thread numbering if multiple tweets (1/n, 2/n)
                       
                       Return as a JSON array of tweet strings that sound exactly like me`
            }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        });
        
        const content = response.choices[0].message.content || "{}";
        const parsedResponse = JSON.parse(content);
        const tweetThread = Array.isArray(parsedResponse.tweets) ? parsedResponse.tweets : [rawTranscript];
        
        console.log(`[GPT-4o] Generated tweet thread with ${tweetThread.length} tweets from raw transcription`);
        tweetThread.forEach((tweet: string, i: number) => console.log(`[GPT-4o] Tweet ${i+1}: "${tweet}"`));
        
        // Cache the result
        tweetGenerationCache.set(cacheKey, {
          value: tweetThread,
          timestamp: Date.now()
        });
        
        return tweetThread;
      } catch (error: any) {
        retries++;
        
        // Check if it's a rate limit error
        if (error.status === 429 && retries < maxRetries) {
          const retryAfterMs = parseInt(error.headers?.["retry-after-ms"] || "1000", 10);
          const waitTime = Math.min(retryAfterMs, 2000 * Math.pow(2, retries));
          
          console.log(`[GPT-4o] Rate limit reached, retrying after ${waitTime}ms (attempt ${retries} of ${maxRetries})`);
          
          // Wait for the specified time before retrying
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Rethrow if it's not a rate limit error or we've exceeded max retries
          throw error;
        }
      }
    }
    
    // If we get here, we've exceeded our retry attempts
    throw new Error(`Failed to process transcription after ${maxRetries} attempts`);
  } catch (error) {
    console.error("Error processing transcription and creating tweets:", error);
    return [rawTranscript]; // Fall back to original text if processing fails
  }
}

// Keep these for backward compatibility
export async function processTranscription(rawTranscript: string): Promise<string> {
  console.log(`[Deprecated] processTranscription called. Using unified function instead.`);
  const tweets = await processTranscriptionAndCreateTweet(rawTranscript);
  return tweets.join(" ");
}

export async function createTweetThread(processedText: string): Promise<string[]> {
  console.log(`[Deprecated] createTweetThread called. Using unified function instead.`);
  return processTranscriptionAndCreateTweet(processedText);
}

/**
 * Generates alternative tweet options from text using GPT-4o
 * This function is kept for backward compatibility
 */
export async function generateTweetOptions(
  text: string,
  alternativesOnly: boolean = false
): Promise<string[]> {
  try {
    console.log(`[GPT-4o] Generating tweet options for: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    console.log(`[GPT-4o] Mode: ${alternativesOnly ? 'Alternative options' : 'Initial generation'}`);

    const systemPrompt = alternativesOnly 
      ? "Generate 2 alternative tweet versions that maintain the exact same authentic voice, casual style, and personality. Your goal is to preserve the author's unique voice while offering subtle variations."
      : "Convert the following transcribed speech into 3 Twitter-ready posts that sound exactly like the person who recorded them. Preserve their authentic voice, casual style, and personality.";
    
    const userPrompt = alternativesOnly 
      ? `Generate alternative tweet versions for this existing tweet: "${text}"
         
         IMPORTANT: Do NOT polish or formalize. Keep my authentic voice and style.
         1. Maintain the same casual tone and informal language
         2. Keep all quirks, speaking patterns, and personal expressions
         3. Only make minimal formatting changes to fit Twitter
         4. The tweets must sound exactly like me, not a polished version`
      : `Here is the transcribed speech: "${text}"
         
         IMPORTANT: Do NOT polish or formalize. Keep my authentic voice and style.
         1. Maintain the same casual tone and informal language
         2. Keep all quirks, speaking patterns, and personal expressions
         3. Only make minimal formatting changes to fit Twitter
         4. The tweets must sound exactly like me, not a polished version`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });
    
    const content = response.choices[0].message.content || "{}";
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
