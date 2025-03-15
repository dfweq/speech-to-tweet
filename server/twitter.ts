// Twitter API v2 client
import { TwitterApi } from "twitter-api-v2";

/**
 * Checks if Twitter API credentials are properly configured
 * Returns an object with validation status and specific missing credentials
 */
export function validateTwitterCredentials(): { 
  isValid: boolean; 
  missingCredentials: string[];
  message: string;
} {
  const missingCredentials = [];
  
  if (!process.env.TWITTER_API_KEY) missingCredentials.push('TWITTER_API_KEY');
  if (!process.env.TWITTER_API_SECRET) missingCredentials.push('TWITTER_API_SECRET');
  if (!process.env.TWITTER_ACCESS_TOKEN) missingCredentials.push('TWITTER_ACCESS_TOKEN');
  if (!process.env.TWITTER_ACCESS_SECRET) missingCredentials.push('TWITTER_ACCESS_SECRET');
  
  const isValid = missingCredentials.length === 0;
  let message = isValid 
    ? 'Twitter API credentials are properly configured' 
    : `Missing Twitter API credentials: ${missingCredentials.join(', ')}`;
  
  return { isValid, missingCredentials, message };
}

/**
 * Creates a new Twitter API client instance with credentials from environment variables
 * Performs credential validation before creating the client
 */
function createTwitterClient() {
  console.log('[Twitter] Creating new Twitter API client');
  
  // Validate environment variables
  const { isValid, message, missingCredentials } = validateTwitterCredentials();
  
  if (!isValid) {
    console.error(`[Twitter] ${message}`);
    throw new Error(`Twitter API credentials not configured: ${missingCredentials.join(', ')}`);
  }
  
  // Log partial API keys for debugging (only show first few characters)
  console.log(`[Twitter] Using API key: ${process.env.TWITTER_API_KEY!.substring(0, 4)}...`);
  console.log(`[Twitter] Using Access token: ${process.env.TWITTER_ACCESS_TOKEN!.substring(0, 4)}...`);
  
  // Initialize the client with credentials from environment variables
  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });
  
  // Return the ReadWrite client for posting tweets
  return twitterClient.readWrite;
}

/**
 * Posts a tweet to Twitter using the Twitter API v2
 * 
 * Note: If facing authentication issues, users may need to:
 * 1. Create a Twitter Developer account (https://developer.twitter.com)
 * 2. Create a new app/project for v2 API
 * 3. Generate new consumer keys and access tokens with appropriate permissions
 * 4. Update the environment secrets with new values
 */
export async function postTweet(text: string): Promise<{ id: string }> {
  try {
    // Validate Twitter credentials before attempting to post
    const credentials = validateTwitterCredentials();
    if (!credentials.isValid) {
      const errorMsg = `Cannot post tweet: ${credentials.message}`;
      console.error(`[Twitter] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    // Create a new client every time to ensure fresh credentials
    const rwClient = createTwitterClient();
    
    // For testing in development - uncomment to bypass actual API call
    // console.log('[Twitter] Test mode - would have posted:', text);
    // return { id: `test-${Date.now()}` };
    
    // Validate tweet text
    if (!text || text.trim().length === 0) {
      throw new Error("Tweet text cannot be empty");
    }
    
    if (text.length > 280) {
      throw new Error("Tweet exceeds the 280 character limit");
    }
    
    console.log(`[Twitter] Posting tweet: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    
    try {
      // Post the tweet
      const { data } = await rwClient.v2.tweet(text);
      
      console.log(`[Twitter] Successfully posted tweet with ID: ${data.id}`);
      return { id: data.id };
    } catch (twitterApiError: any) {
      // Special handling for Twitter API-specific errors
      let errorMessage = "Failed to post tweet";
      
      // Extract detailed error information
      if (twitterApiError.data?.detail) {
        errorMessage += `: ${twitterApiError.data.detail}`;
      } else if (twitterApiError.errors && twitterApiError.errors.length > 0) {
        const details = twitterApiError.errors.map((e: any) => e.message || e.detail || JSON.stringify(e)).join('; ');
        errorMessage += `: ${details}`;
      } else if (twitterApiError.message) {
        errorMessage += `: ${twitterApiError.message}`;
      }
      
      // Add HTTP status code information if available
      if (twitterApiError.code) {
        errorMessage += ` (HTTP ${twitterApiError.code})`;
        
        // Provide more specific guidance based on error code
        if (twitterApiError.code === 401) {
          errorMessage += " - Authentication failed. Your API credentials may be invalid or expired.";
        } else if (twitterApiError.code === 403) {
          errorMessage += " - Permission denied. Your app may not have write permissions.";
        } else if (twitterApiError.code === 429) {
          errorMessage += " - Rate limit exceeded. Please try again in a few minutes.";
        }
      }
      
      console.error(`[Twitter] ${errorMessage}`);
      
      // Log additional error details for debugging
      if (twitterApiError.data) {
        console.error("[Twitter] Error data:", JSON.stringify(twitterApiError.data, null, 2));
      }
      
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    // This catches errors from credential validation or other non-API errors
    if (!error.message.includes("Failed to post tweet")) {
      console.error("[Twitter] Error:", error);
      throw new Error(`Twitter error: ${error.message}`);
    } else {
      // Re-throw the specific API error that was already formatted
      throw error;
    }
  }
}
