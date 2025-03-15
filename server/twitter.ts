// Twitter API v2 client
import { TwitterApi } from "twitter-api-v2";

// Initialize the client with credentials from environment variables
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || "",
  appSecret: process.env.TWITTER_API_SECRET || "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
  accessSecret: process.env.TWITTER_ACCESS_SECRET || "",
});

// Use the ReadWrite client for posting tweets
const rwClient = twitterClient.readWrite;

/**
 * Posts a tweet to Twitter using the Twitter API v2
 */
export async function postTweet(text: string): Promise<{ id: string }> {
  try {
    // Validate environment variables
    if (!process.env.TWITTER_API_KEY || 
        !process.env.TWITTER_API_SECRET || 
        !process.env.TWITTER_ACCESS_TOKEN || 
        !process.env.TWITTER_ACCESS_SECRET) {
      throw new Error("Twitter API credentials not configured");
    }
    
    // Post the tweet
    const { data } = await rwClient.v2.tweet(text);
    
    return { id: data.id };
  } catch (error) {
    console.error("Twitter API error:", error);
    throw new Error(`Failed to post tweet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
