import { apiRequest } from './queryClient';

/**
 * Posts a tweet to Twitter
 */
export async function postTweet(text: string): Promise<{ id: string }> {
  try {
    const response = await apiRequest('POST', '/api/post-tweet', { text });
    
    return await response.json();
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw new Error('Failed to post tweet');
  }
}
