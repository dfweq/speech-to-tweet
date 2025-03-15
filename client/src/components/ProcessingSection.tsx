import { useState, useEffect, useRef } from 'react';
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
  // Track whether we've started processing
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use a ref to store the audioBlob identifier (size + type)
  const currentAudioBlobId = useRef<string>('');

  useEffect(() => {
    // Exit early if no audio blob
    if (!audioBlob) {
      onError("No audio data found. Please try recording again.");
      return;
    }
    
    // Generate a simple identifier for this audio blob
    const audioBlobId = `${audioBlob.size}-${audioBlob.type}`;
    
    // Skip if we've already processed this exact audio blob
    if (isProcessing || audioBlobId === currentAudioBlobId.current) {
      return;
    }
    
    // Set processing state and store the blob id
    setIsProcessing(true);
    currentAudioBlobId.current = audioBlobId;
    
    const processAudio = async () => {
      try {
        // Update progress to show transcription started
        setProgress(10);
        
        // Convert audio to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onload = async () => {
          if (typeof reader.result !== 'string') {
            onError("Failed to process audio file.");
            setIsProcessing(false);
            return;
          }
          
          // Remove the data URL prefix (e.g., data:audio/webm;base64,)
          const base64Audio = reader.result.split(',')[1];
          
          // Determine format from the blob type
          let format = 'webm';
          if (audioBlob.type.includes('wav')) format = 'wav';
          else if (audioBlob.type.includes('mp3')) format = 'mp3';
          else if (audioBlob.type.includes('ogg')) format = 'ogg';
          
          try {
            // Transcribe audio
            setProgress(30);
            const { transcript } = await transcribeAudio(base64Audio, format);
            
            if (!transcript) {
              onError("Could not transcribe the audio. Please try again with clearer audio.");
              setIsProcessing(false);
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
              setIsProcessing(false);
            }, 500);
          } catch (error) {
            console.error('API error:', error);
            onError("An error occurred while processing your audio. Please try again.");
            setIsProcessing(false);
          }
        };
        
        reader.onerror = () => {
          onError("Failed to read audio file. Please try again.");
          setIsProcessing(false);
        };
      } catch (error) {
        console.error('Error processing audio:', error);
        onError("An error occurred while processing your audio. Please try again.");
        setIsProcessing(false);
      }
    };
    
    processAudio();
    
    // No need for cleanup to reset processing state as we do it inline
  }, [audioBlob, onProcessingComplete, onError, setProgress, isProcessing]);
  
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
