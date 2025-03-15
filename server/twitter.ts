// Twitter API v2 client
import { TwitterApi } from "twitter-api-v2";

// Function to create a new client on each request to ensure we have fresh credentials
function createTwitterClient() {
  console.log('[Twitter] Creating new Twitter API client');
  
  // Validate environment variables
  if (!process.env.TWITTER_API_KEY || 
      !process.env.TWITTER_API_SECRET || 
      !process.env.TWITTER_ACCESS_TOKEN || 
      !process.env.TWITTER_ACCESS_SECRET) {
    console.error('[Twitter] Missing Twitter API credentials');
    throw new Error("Twitter API credentials not configured");
  }
  
  // Log partial API keys for debugging (only show first few characters)
  console.log(`[Twitter] Using API key: ${process.env.TWITTER_API_KEY.substring(0, 4)}...`);
  console.log(`[Twitter] Using Access token: ${process.env.TWITTER_ACCESS_TOKEN.substring(0, 4)}...`);
  
  // Initialize the client with credentials from environment variables
  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
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
    // Create a new client every time to ensure fresh credentials
    const rwClient = createTwitterClient();
    
    // For testing in development - uncomment to bypass actual API call
    // console.log('[Twitter] Test mode - would have posted:', text);
    // return { id: `test-${Date.now()}` };
    
    console.log(`[Twitter] Posting tweet: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    
    // Post the tweet
    const { data } = await rwClient.v2.tweet(text);
    
    console.log(`[Twitter] Successfully posted tweet with ID: ${data.id}`);
    return { id: data.id };
  } catch (error: any) {
    // Enhanced error logging
    console.error("Twitter API error:", error);
    
    // Check for common Twitter API errors
    if (error.code === 401) {
      console.error("[Twitter] Authentication failed. Please check your Twitter API credentials.");
    } else if (error.code === 403) {
      console.error("[Twitter] Permission denied. Your app may not have write permissions.");
    } else if (error.code === 429) {
      console.error("[Twitter] Rate limit exceeded. Please try again later.");
    }
    
    // Log any error data for diagnosis
    if (error.data) {
      console.error("[Twitter] Error data:", error.data);
    }
    
    // Log error message and code
    const errorMessage = `Failed to post tweet: ${error.message || 'Unknown error'}`;
    const errorCode = error.code ? ` (Code: ${error.code})` : '';
    throw new Error(errorMessage + errorCode);
  }
}
