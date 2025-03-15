import { FaExclamationTriangle, FaTwitter, FaKey, FaRedo, FaQuestionCircle } from 'react-icons/fa';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

interface TwitterApiErrorProps {
  message: string;
  onClose: () => void;
  onUpdateCredentials?: () => void; // Optional callback to update credentials
}

export default function TwitterApiError({ 
  message, 
  onClose, 
  onUpdateCredentials 
}: TwitterApiErrorProps) {
  const [errorType, setErrorType] = useState<string>(() => {
    // Determine error type from message
    if (message.includes('missing') || message.includes('not configured')) {
      return 'missing';
    } else if (message.includes('invalid') || message.includes('expired') || 
               message.includes('Authentication failed') || message.includes('401')) {
      return 'invalid';
    } else if (message.includes('permission') || message.includes('403')) {
      return 'permission';
    } else if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }
    return 'unknown';
  });

  // Get specific error information based on type
  const getErrorDetails = () => {
    switch (errorType) {
      case 'missing':
        return {
          title: 'Twitter API Credentials Missing',
          description: 'The application is missing some or all of the required Twitter API credentials.',
          solutions: [
            'Add the missing environment variables (TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)',
            'Generate new credentials in the Twitter Developer Portal',
            'Update the credentials in the application environment'
          ]
        };
      case 'invalid':
        return {
          title: 'Twitter Authentication Failed',
          description: 'Your Twitter API credentials were rejected by the Twitter API.',
          solutions: [
            'Check that your credentials are entered correctly',
            'Regenerate your API keys and tokens in the Twitter Developer Portal',
            'Make sure your Twitter Developer account is in good standing'
          ]
        };
      case 'permission':
        return {
          title: 'Permission Denied',
          description: 'Your Twitter app doesn\'t have the necessary permissions.',
          solutions: [
            'Check your app permissions in the Twitter Developer Portal',
            'Ensure your app has both Read and Write permissions',
            'Your access tokens may need to be regenerated after changing permissions'
          ]
        };
      case 'rate_limit':
        return {
          title: 'Rate Limit Exceeded',
          description: 'You\'ve hit Twitter\'s rate limit for API requests.',
          solutions: [
            'Wait a few minutes before trying again',
            'Consider upgrading your Twitter Developer account if you need higher limits',
            'Optimize your application to make fewer API calls'
          ]
        };
      default:
        return {
          title: 'Twitter API Error',
          description: 'An error occurred when communicating with Twitter\'s API.',
          solutions: [
            'Check your Twitter API credentials',
            'Make sure your Twitter Developer account is active',
            'Try regenerating your API keys and tokens'
          ]
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <Card className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-[#FF3B30]">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <div className="inline-block p-3 rounded-full bg-[#F5F8FA]">
            <FaExclamationTriangle className="text-[#FF3B30] text-xl" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-[#14171A] mb-2">{errorDetails.title}</h3>
        
        <div className="text-[#657786] mb-6">
          <p className="mb-4">{message}</p>
          
          <div className="bg-[#F5F8FA] p-4 rounded-lg text-left text-sm mb-4">
            <p className="mb-2 font-medium">Possible solutions:</p>
            <ul className="list-disc pl-5 space-y-2">
              {errorDetails.solutions.map((solution, index) => (
                <li key={index}>{solution}</li>
              ))}
            </ul>
          </div>
          
          {errorType === 'missing' || errorType === 'invalid' ? (
            <div className="bg-[#E8F5FD] p-4 rounded-lg text-left text-sm mb-4 border border-[#1DA1F2]">
              <div className="flex items-center mb-2">
                <FaKey className="text-[#1DA1F2] mr-2" />
                <p className="font-medium">Need to update your credentials?</p>
              </div>
              <p className="mb-2">You can update your Twitter API credentials by clicking the button below.</p>
              <button 
                onClick={onUpdateCredentials}
                className="w-full mt-2 px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none flex items-center justify-center"
              >
                <FaRedo className="mr-2" />
                Update Twitter Credentials
              </button>
            </div>
          ) : null}
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a 
              href="https://developer.twitter.com/en/portal/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-[#1DA1F2] text-[#1DA1F2] hover:bg-[#F5F8FA] transition-colors focus:outline-none flex items-center justify-center"
            >
              <FaTwitter className="mr-2" />
              Twitter Developer Portal
            </a>
            
            <a 
              href="https://developer.twitter.com/en/docs/twitter-api" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-[#657786] text-[#657786] hover:bg-[#F5F8FA] transition-colors focus:outline-none flex items-center justify-center"
            >
              <FaQuestionCircle className="mr-2" />
              API Documentation
            </a>
            
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}