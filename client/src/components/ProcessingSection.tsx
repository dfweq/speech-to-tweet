import { useEffect, useRef } from 'react';
import { FaCogs } from 'react-icons/fa';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { transcribeAudio, processTranscriptionAndCreateTweet } from '@/lib/openai';

interface ProcessingSectionProps {
  progress: number;
  setProgress: (progress: number) => void;
  audioBlob: Blob | null;
  onProcessingComplete: (transcript: string, tweets: string[]) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export default function ProcessingSection({ 
  progress, 
  setProgress, 
  audioBlob,
  onProcessingComplete, 
  onCancel,
  onError
}: ProcessingSectionProps) {
  
  // Use a ref to prevent duplicate requests in development strict mode  
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (!audioBlob) {
      onError("No audio data found. Please try recording again.");
      return;
    }
    
    const processAudio = async () => {
      // Prevent duplicate processing of the same audio blob
      if (hasProcessedRef.current) {
        return;
      }
      hasProcessedRef.current = true;
      
      try {
        // Update progress to show transcription started
        setProgress(10);
        
        // Convert audio to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onload = async () => {
          if (typeof reader.result !== 'string') {
            onError("Failed to process audio file.");
            return;
          }
          
          // Remove the data URL prefix (e.g., data:audio/webm;base64,)
          const base64Audio = reader.result.split(',')[1];
          
          // Determine format from the blob type
          let format = 'webm';
          if (audioBlob.type.includes('wav')) format = 'wav';
          else if (audioBlob.type.includes('mp3')) format = 'mp3';
          else if (audioBlob.type.includes('ogg')) format = 'ogg';
          
          // Transcribe audio
          setProgress(30);
          const { transcript } = await transcribeAudio(base64Audio, format);
          
          if (!transcript) {
            onError("Could not transcribe the audio. Please try again with clearer audio.");
            return;
          }
          
          // Process transcription and generate tweet options in one call
          setProgress(60);
          const tweets = await processTranscriptionAndCreateTweet(transcript);
          
          // Complete processing
          setProgress(100);
          
          // Wait a moment at 100% for visual feedback
          setTimeout(() => {
            onProcessingComplete(transcript, tweets);
          }, 500);
        };
        
        reader.onerror = () => {
          onError("Failed to read audio file. Please try again.");
        };
      } catch (error) {
        console.error('Error processing audio:', error);
        onError("An error occurred while processing your audio. Please try again.");
      }
    };
    
    processAudio();
    
    // Cleanup function to reset the ref when the component unmounts
    return () => {
      hasProcessedRef.current = false;
    };
  }, [audioBlob, onProcessingComplete, onError, setProgress]);
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <div className="inline-block p-3 rounded-full bg-[#F5F8FA]">
            <FaCogs className="text-[#1DA1F2] text-xl" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[#14171A] mb-2">Processing your audio</h3>
        <p className="text-[#657786] mb-4">Converting speech to tweet-ready text...</p>
        
        <div className="w-full max-w-md mb-6">
          <Progress value={progress} className="h-2 bg-[#E1E8ED]" indicatorClassName="bg-[#1DA1F2]" />
        </div>
        
        <div>
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded-full border border-[#E1E8ED] text-[#657786] hover:bg-[#E1E8ED] transition-colors focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </Card>
  );
}
