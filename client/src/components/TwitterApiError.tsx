import { FaExclamationTriangle, FaTwitter } from 'react-icons/fa';
import { Card } from '@/components/ui/card';

interface TwitterApiErrorProps {
  message: string;
  onClose: () => void;
}

export default function TwitterApiError({ message, onClose }: TwitterApiErrorProps) {
  return (
    <Card className="bg-white rounded-xl shadow-sm p-6 mb-6 border-2 border-[#FF3B30]">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <div className="inline-block p-3 rounded-full bg-[#F5F8FA]">
            <FaExclamationTriangle className="text-[#FF3B30] text-xl" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-[#14171A] mb-2">Twitter API Error</h3>
        
        <div className="text-[#657786] mb-6">
          <p className="mb-4">{message}</p>
          
          <div className="bg-[#F5F8FA] p-4 rounded-lg text-left text-sm mb-4">
            <p className="mb-2 font-medium">Possible solutions:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Check if your Twitter developer account is active</li>
              <li>Make sure your app has proper permissions (read/write)</li>
              <li>Regenerate your Twitter API keys and tokens</li>
              <li>Verify that your API keys and access tokens are correctly entered as environment secrets</li>
            </ul>
          </div>
          
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