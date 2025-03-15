import { apiRequest } from './queryClient';

/**
 * Posts a tweet to Twitter
 * 
 * Note: If facing authentication issues, the Twitter API credentials may need to be updated.
 * Twitter API (now X) requires a developer account and proper API credentials.
 */
export async function postTweet(text: string): Promise<{ id: string }> {
  try {
    console.log(`[Twitter] Client: Posting tweet: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    const response = await apiRequest('POST', '/api/post-tweet', { text });
    
    if (!response.ok) {
      // Get the error message from the response
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      const errorMessage = errorData.message || `Server error: ${response.status}`;
      
      console.error(`[Twitter] Client: Error posting tweet - ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log(`[Twitter] Client: Successfully posted tweet with ID: ${result.id}`);
    return result;
  } catch (error: any) {
    console.error('[Twitter] Client: Error posting tweet:', error);
    
    // Include more details in the error message
    const errorMessage = error.message || 'Failed to post tweet';
    throw new Error(errorMessage);
  }
}
