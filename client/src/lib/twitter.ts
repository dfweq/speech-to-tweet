import { apiRequest } from './queryClient';

/**
 * Checks if Twitter API credentials are properly configured
 * Returns an object with validation status and error message if applicable
 */
export async function checkTwitterCredentials(): Promise<{ 
  isValid: boolean;
  message: string;
  missingCredentials?: string[];
}> {
  try {
    console.log('[Twitter] Client: Checking Twitter API credentials');
    const response = await apiRequest('GET', '/api/check-twitter-credentials');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: 'Failed to verify Twitter credentials',
        missingCredentials: []
      }));
      
      return {
        isValid: false,
        message: errorData.message || 'Twitter API credentials are not properly configured',
        missingCredentials: errorData.missingCredentials || []
      };
    }
    
    const result = await response.json();
    return {
      isValid: result.status === 'ok',
      message: result.message
    };
  } catch (error: any) {
    console.error('[Twitter] Client: Error checking Twitter credentials:', error);
    return {
      isValid: false,
      message: error.message || 'Failed to verify Twitter credentials'
    };
  }
}

/**
 * Posts a tweet to Twitter
 * 
 * Note: If facing authentication issues, the Twitter API credentials may need to be updated.
 * Twitter API (now X) requires a developer account and proper API credentials.
 */
export async function postTweet(text: string): Promise<{ id: string }> {
  try {
    // Check Twitter credentials before posting
    const credentialsCheck = await checkTwitterCredentials();
    if (!credentialsCheck.isValid) {
      console.error(`[Twitter] Client: ${credentialsCheck.message}`);
      throw new Error(credentialsCheck.message);
    }
    
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
    let errorMessage = error.message || 'Failed to post tweet';
    
    // Add specific error information based on response status codes
    if (error.status) {
      if (error.status === 401) {
        errorMessage = 'Twitter authentication failed. Your API credentials may be invalid or expired.';
      } else if (error.status === 403) {
        errorMessage = 'Permission denied by Twitter. Your app may not have write permissions.';
      } else if (error.status === 429) {
        errorMessage = 'Twitter rate limit exceeded. Please try again in a few minutes.';
      }
    }
    
    throw new Error(errorMessage);
  }
}
