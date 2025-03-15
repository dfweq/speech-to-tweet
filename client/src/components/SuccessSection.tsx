import { Card } from '@/components/ui/card';
import { FaCheckCircle } from 'react-icons/fa';

interface SuccessSectionProps {
  tweetText: string;
  onNewTweet: () => void;
}

export default function SuccessSection({ tweetText, onNewTweet }: SuccessSectionProps) {
  const viewTweet = () => {
    // Twitter's web interface
    window.open('https://twitter.com/home', '_blank');
  };
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-6 text-center">
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <div className="inline-block p-3 rounded-full bg-[#4BB543] bg-opacity-10">
            <FaCheckCircle className="text-[#4BB543] text-2xl" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[#14171A] mb-2">Tweet Posted Successfully!</h3>
        <p className="text-[#657786] mb-6">Your voice has been shared with the world.</p>
        
        <div className="border border-[#E1E8ED] rounded-lg p-4 mb-6 text-left w-full max-w-md">
          <div className="text-[#14171A]">{tweetText}</div>
        </div>
        
        <div className="flex space-x-4">
          <button 
            className="px-4 py-2 rounded-full border border-[#E1E8ED] text-[#657786] hover:bg-[#E1E8ED] transition-colors focus:outline-none"
            onClick={viewTweet}
          >
            View Tweet
          </button>
          <button 
            className="px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none"
            onClick={onNewTweet}
          >
            Create New Tweet
          </button>
        </div>
      </div>
    </Card>
  );
}
