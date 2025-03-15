import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { FaRedoAlt, FaPencilAlt, FaPaperPlane, FaSyncAlt, FaTwitter } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { generateTweetOptions } from '@/lib/openai';
import { postTweet, checkTwitterCredentials, verifyTwitterCredentials, postTweetThread } from '@/lib/twitter';

interface ResultsSectionProps {
  tweetText: string;
  setTweetText: (text: string) => void;
  additionalTweets: string[];
  onPostSuccess: () => void;
  onError: (message: string) => void;
}

export default function ResultsSection({ 
  tweetText, 
  setTweetText, 
  additionalTweets, 
  onPostSuccess,
  onError
}: ResultsSectionProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [localTweets, setLocalTweets] = useState<string[]>(additionalTweets);
  const [characterCount, setCharacterCount] = useState<number>(tweetText.length);
  
  const { toast } = useToast();
  
  useEffect(() => {
    setCharacterCount(tweetText.length);
  }, [tweetText]);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setTweetText(newText);
    setCharacterCount(newText.length);
  };
  
  const handleRegenerateTweet = async () => {
    try {
      setIsGenerating(true);
      const newTweets = await generateTweetOptions(tweetText);
      if (newTweets && newTweets.length > 0) {
        setTweetText(newTweets[0]);
        setLocalTweets(newTweets.slice(1));
        toast({
          title: "Tweet regenerated",
          description: "New tweet options have been generated",
        });
      }
    } catch (error) {
      console.error('Error regenerating tweet:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate tweet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleEnableEdit = () => {
    setIsEditing(true);
  };
  
  const handlePostTweet = async () => {
    if (tweetText.trim().length === 0) {
      toast({
        title: "Error",
        description: "Tweet cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    if (tweetText.length > 280) {
      toast({
        title: "Error",
        description: "Tweet exceeds the 280 character limit",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsPosting(true);
      
      // First check if Twitter credentials exist
      console.log('[Tweet] Checking if Twitter credentials exist');
      const credentialsCheck = await checkTwitterCredentials();
      
      if (!credentialsCheck.isValid) {
        // If credentials don't exist, show a specific error
        const errorMsg = credentialsCheck.message;
        console.error(`[Tweet] Twitter credentials issue: ${errorMsg}`);
        
        toast({
          title: "Twitter Credentials Error",
          description: errorMsg,
          variant: "destructive",
        });
        
        onError(errorMsg);
        return;
      }
      
      // Credentials exist, now verify them with Twitter API
      console.log('[Tweet] Verifying Twitter credentials with API call');
      const verificationResult = await verifyTwitterCredentials();
      
      if (!verificationResult.isValid) {
        // Credentials exist but are invalid
        const errorMsg = verificationResult.message;
        console.error(`[Tweet] Twitter credentials validation failed: ${errorMsg}`);
        
        toast({
          title: "Twitter Authentication Error",
          description: errorMsg,
          variant: "destructive",
        });
        
        onError(errorMsg);
        return;
      }
      
      // Credentials are valid
      const userData = verificationResult.userData;
      console.log(`[Tweet] Successfully verified Twitter credentials for user: ${userData?.username || 'unknown'}`);
      
      // Show success toast for verification
      toast({
        title: "Twitter Verification Success",
        description: `Verified as @${userData?.username || 'user'}`,
      });
      
      // Post the tweet
      console.log(`[Tweet] Attempting to post tweet: "${tweetText.substring(0, 30)}${tweetText.length > 30 ? '...' : ''}"`);
      await postTweet(tweetText);
      
      toast({
        title: "Success!",
        description: "Your tweet was posted successfully",
      });
      
      onPostSuccess();
    } catch (error: any) {
      console.error('Error posting tweet:', error);
      
      // Extract a more helpful error message if possible
      let errorMessage = "Failed to post tweet.";
      
      if (error && error.message) {
        // Check for specific error types
        if (error.message.includes("401") || error.message.includes("Authentication failed")) {
          errorMessage = "Twitter authentication failed. Your API credentials may be invalid or expired.";
        } else if (error.message.includes("403") || error.message.includes("Permission denied")) {
          errorMessage = "Permission denied by Twitter. Your app may not have write permissions.";
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
          errorMessage = "Twitter rate limit exceeded. Please try again in a few minutes.";
        } else if (error.message.includes("credentials not configured") || error.message.includes("API credentials")) {
          errorMessage = "Twitter API credentials are missing or invalid. Please check your environment variables.";
        } else {
          // Use the error message from the API
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      // Show error toast
      toast({
        title: "Tweet Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError(errorMessage);
    } finally {
      setIsPosting(false);
    }
  };
  
  const handleUseTweetOption = (tweet: string) => {
    setTweetText(tweet);
    setIsEditing(true);
  };
  
  const handleRefreshOptions = async () => {
    try {
      setIsGenerating(true);
      const newTweets = await generateTweetOptions(tweetText, true);
      setLocalTweets(newTweets);
      toast({
        title: "Options refreshed",
        description: "New tweet options have been generated",
      });
    } catch (error) {
      console.error('Error refreshing options:', error);
      toast({
        title: "Error",
        description: "Failed to generate new options. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Function to post tweet thread
  const handlePostTweetThread = async () => {
    if (localTweets.length === 0) {
      toast({
        title: "Error",
        description: "No tweets available for a thread",
        variant: "destructive",
      });
      return;
    }
    
    // Combine main tweet with additional options
    const allTweets = [tweetText, ...localTweets];
    
    try {
      setIsPosting(true);
      
      // First check if Twitter credentials exist
      console.log('[Tweet] Checking if Twitter credentials exist for thread');
      const credentialsCheck = await checkTwitterCredentials();
      
      if (!credentialsCheck.isValid) {
        // If credentials don't exist, show a specific error
        const errorMsg = credentialsCheck.message;
        console.error(`[Tweet] Twitter credentials issue: ${errorMsg}`);
        
        toast({
          title: "Twitter Credentials Error",
          description: errorMsg,
          variant: "destructive",
        });
        
        onError(errorMsg);
        return;
      }
      
      // Credentials exist, now verify them with Twitter API
      console.log('[Tweet] Verifying Twitter credentials with API call');
      const verificationResult = await verifyTwitterCredentials();
      
      if (!verificationResult.isValid) {
        // Credentials exist but are invalid
        const errorMsg = verificationResult.message;
        console.error(`[Tweet] Twitter credentials validation failed: ${errorMsg}`);
        
        toast({
          title: "Twitter Authentication Error",
          description: errorMsg,
          variant: "destructive",
        });
        
        onError(errorMsg);
        return;
      }
      
      // Credentials are valid
      const userData = verificationResult.userData;
      console.log(`[Tweet] Successfully verified Twitter credentials for user: ${userData?.username || 'unknown'}`);
      
      // Post the tweet thread
      console.log(`[Tweet] Attempting to post tweet thread with ${allTweets.length} tweets`);
      await postTweetThread(allTweets);
      
      toast({
        title: "Success!",
        description: `Your thread with ${allTweets.length} tweets was posted successfully`,
      });
      
      onPostSuccess();
    } catch (error: any) {
      console.error('Error posting tweet thread:', error);
      
      // Extract a more helpful error message if possible
      let errorMessage = "Failed to post tweet thread.";
      
      if (error && error.message) {
        // Check for specific error types
        if (error.message.includes("401") || error.message.includes("Authentication failed")) {
          errorMessage = "Twitter authentication failed. Your API credentials may be invalid or expired.";
        } else if (error.message.includes("403") || error.message.includes("Permission denied")) {
          errorMessage = "Permission denied by Twitter. Your app may not have write permissions.";
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
          errorMessage = "Twitter rate limit exceeded. Please try again in a few minutes.";
        } else {
          // Use the error message from the API
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      // Show error toast
      toast({
        title: "Tweet Thread Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError(errorMessage);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div id="resultsSection">
      {/* Tweet Preview */}
      <Card className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-[#14171A] mb-4">Tweet Preview</h3>
        
        <div className="border border-[#E1E8ED] rounded-lg p-4 mb-4">
          <textarea 
            id="tweetText" 
            className="w-full resize-none focus:outline-none" 
            rows={4} 
            maxLength={280} 
            placeholder="Your tweet text will appear here..." 
            value={tweetText}
            onChange={handleTextChange}
            readOnly={!isEditing}
          />
          <div className={`flex justify-between text-xs mt-2 ${characterCount > 260 ? 'text-[#FF3B30]' : 'text-[#657786]'}`}>
            <span>{characterCount}</span>
            <span>/280</span>
          </div>
        </div>
        
        <div className="flex flex-wrap space-x-0 space-y-2 sm:space-x-3 sm:space-y-0 sm:flex-nowrap">
          <button 
            className="w-full sm:w-auto order-2 sm:order-1 px-4 py-2 rounded-full border border-[#E1E8ED] text-[#657786] hover:bg-[#E1E8ED] transition-colors focus:outline-none disabled:opacity-50"
            onClick={handleRegenerateTweet}
            disabled={isGenerating || isPosting}
          >
            <FaRedoAlt className="inline mr-2" />Regenerate
          </button>
          <button 
            className="w-full sm:w-auto order-1 sm:order-2 px-4 py-2 rounded-full bg-[#F5F8FA] text-[#1DA1F2] hover:bg-opacity-90 transition-colors focus:outline-none mb-2 sm:mb-0 disabled:opacity-50"
            onClick={handleEnableEdit}
            disabled={isEditing || isPosting}
          >
            <FaPencilAlt className="inline mr-2" />Edit
          </button>
          <button 
            className="w-full sm:w-auto order-3 px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none disabled:opacity-50"
            onClick={handlePostTweet}
            disabled={isPosting}
          >
            <FaPaperPlane className="inline mr-2" />
            {isPosting ? "Posting..." : "Post to Twitter"}
          </button>
        </div>
      </Card>

      {/* Additional Tweet Options */}
      <Card className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-[#14171A] mb-4">Additional Tweet Options</h3>
        
        {localTweets.map((tweet, index) => (
          <div key={index} className="border border-[#E1E8ED] rounded-lg p-4 mb-4">
            <p className="mb-2">Option {index + 1}</p>
            <div className="text-[#14171A]">{tweet}</div>
            <div className="flex justify-between mt-3">
              <span className="text-xs text-[#657786]">{tweet.length} characters</span>
              <button 
                className="text-[#1DA1F2] text-sm hover:underline"
                onClick={() => handleUseTweetOption(tweet)}
              >
                Use this
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button 
            className="w-full sm:w-1/2 px-4 py-2 rounded-full border border-[#E1E8ED] text-[#657786] hover:bg-[#E1E8ED] transition-colors focus:outline-none disabled:opacity-50"
            onClick={handleRefreshOptions}
            disabled={isGenerating || isPosting}
          >
            <FaSyncAlt className="inline mr-2" />
            {isGenerating ? "Generating..." : "Generate More Options"}
          </button>
          
          <button 
            className="w-full sm:w-1/2 px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none disabled:opacity-50"
            onClick={handlePostTweetThread}
            disabled={isPosting || localTweets.length === 0}
          >
            <FaPaperPlane className="inline mr-2" />
            {isPosting ? "Posting..." : "Post as Thread"}
          </button>
        </div>
      </Card>
    </div>
  );
}
