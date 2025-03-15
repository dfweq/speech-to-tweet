import { Card } from '@/components/ui/card';
import { FaExclamationCircle } from 'react-icons/fa';
import TwitterApiError from './TwitterApiError';

interface ErrorSectionProps {
  errorMessage: string;
  onTryAgain: () => void;
}

export default function ErrorSection({ errorMessage, onTryAgain }: ErrorSectionProps) {
  // Check if this is a Twitter API related error
  const isTwitterError = 
    errorMessage.includes('Twitter authentication failed') || 
    errorMessage.includes('Twitter API') || 
    errorMessage.includes('Permission denied by Twitter') ||
    errorMessage.includes('Twitter rate limit') ||
    errorMessage.includes('Failed to post tweet');
  
  // If it's a Twitter API error, show the specialized component
  if (isTwitterError) {
    return <TwitterApiError message={errorMessage} onClose={onTryAgain} />;
  }
  
  // Otherwise show the general error component
  return (
    <Card className="bg-white rounded-xl shadow-sm p-6 text-center">
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <div className="inline-block p-3 rounded-full bg-[#FF3B30] bg-opacity-10">
            <FaExclamationCircle className="text-[#FF3B30] text-2xl" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[#14171A] mb-2">Something went wrong</h3>
        <p className="text-[#657786] mb-4">
          {errorMessage || "We couldn't process your audio. Please try again."}
        </p>
        
        <div>
          <button 
            className="px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none"
            onClick={onTryAgain}
          >
            Try Again
          </button>
        </div>
      </div>
    </Card>
  );
}
