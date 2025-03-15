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
 * Verifies Twitter API credentials by making a real API call
 * This makes an actual call to Twitter's API to validate the credentials
 */
export async function verifyTwitterCredentials(): Promise<{
  isValid: boolean;
  message: string;
  userData?: {
    id: string;
    username: string;
    name?: string;
  };
}> {
  try {
    console.log('[Twitter] Client: Verifying Twitter API credentials with API call');
    const response = await apiRequest('GET', '/api/verify-twitter-credentials');
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: 'Failed to verify Twitter credentials with API'
      }));
      
      return {
        isValid: false,
        message: errorData.message || 'Twitter API credentials are not valid'
      };
    }
    
    const result = await response.json();
    return {
      isValid: result.status === 'ok',
      message: result.message,
      userData: result.userData
    };
  } catch (error: any) {
    console.error('[Twitter] Client: Error verifying Twitter credentials:', error);
    
    // Extract error message from response if available
    let errorMessage = error.message || 'Failed to verify Twitter credentials';
    
    // Add more specific messaging based on status code
    if (error.status === 401) {
      errorMessage = 'Twitter authentication failed. Your API credentials are invalid or expired.';
    } else if (error.status === 403) {
      errorMessage = 'Twitter permission denied. Your app may not have the required permissions.';
    }
    
    return {
      isValid: false,
      message: errorMessage
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
    // Check Twitter credentials before posting - use verification that makes an API call
    // to ensure credentials actually work, not just that they exist
    const credentialsCheck = await verifyTwitterCredentials();
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

/**
 * Posts a thread of tweets to Twitter
 * Each tweet in the array will be posted as a reply to the previous one
 * 
 * @param tweets Array of tweet texts to post as a thread
 * @returns Object containing array of tweet IDs and the thread ID (first tweet ID)
 */
export async function postTweetThread(tweets: string[]): Promise<{ 
  ids: string[]; 
  threadId: string;
}> {
  try {
    // First verify Twitter credentials before posting
    const credentialsCheck = await verifyTwitterCredentials();
    if (!credentialsCheck.isValid) {
      console.error(`[Twitter] Client: ${credentialsCheck.message}`);
      throw new Error(credentialsCheck.message);
    }
    
    // Validate input
    if (!tweets || tweets.length === 0) {
      const errorMessage = 'Cannot post empty tweet thread';
      console.error(`[Twitter] Client: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    console.log(`[Twitter] Client: Posting thread with ${tweets.length} tweets`);
    const response = await apiRequest('POST', '/api/post-tweet', { tweets });
    
    if (!response.ok) {
      // Get the error message from the response
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      const errorMessage = errorData.message || `Server error: ${response.status}`;
      
      console.error(`[Twitter] Client: Error posting tweet thread - ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log(`[Twitter] Client: Successfully posted thread with ${result.ids.length} tweets, thread ID: ${result.threadId}`);
    return result;
  } catch (error: any) {
    console.error('[Twitter] Client: Error posting tweet thread:', error);
    
    // Include more details in the error message
    let errorMessage = error.message || 'Failed to post tweet thread';
    
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
