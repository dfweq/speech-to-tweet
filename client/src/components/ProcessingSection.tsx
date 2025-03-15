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

// Keep track of processed audio blobs across component instances
// This helps with React's strict mode which mounts components twice
const processedAudioBlobs = new Set<string>();

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
  
  // Use refs to track processing state across rerenders
  const processingRef = useRef(false);
  const processingPromiseRef = useRef<Promise<void> | null>(null);
  const unmountedRef = useRef(false);
  
  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    // Exit early if no audio blob
    if (!audioBlob) {
      onError("No audio data found. Please try recording again.");
      return;
    }
    
    // Generate a simple identifier for this audio blob
    const audioBlobId = `${audioBlob.size}-${audioBlob.type}-${Date.now()}`;
    
    // Skip if we've already processed this blob or if we're currently processing
    if (processingRef.current || processedAudioBlobs.has(audioBlobId)) {
      console.log(`[Processing] Skipping duplicate processing for blob: ${audioBlobId}`);
      return;
    }
    
    // Mark as processing in both state and ref
    setIsProcessing(true);
    processingRef.current = true;
    
    // Add to global tracking set
    processedAudioBlobs.add(audioBlobId);
    
    console.log(`[Processing] Starting to process audio blob: ${audioBlobId}`);
    
    const processAudio = async (): Promise<void> => {
      try {
        // Update progress to show transcription started
        setProgress(10);
        
        // Convert audio to base64
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onload = () => {
            if (typeof reader.result !== 'string') {
              reject(new Error("Failed to process audio file."));
              return;
            }
            
            // Remove the data URL prefix (e.g., data:audio/webm;base64,)
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          
          reader.onerror = () => {
            reject(new Error("Failed to read audio file."));
          };
        });
        
        // If component has unmounted, exit early
        if (unmountedRef.current) return;
        
        // Determine format from the blob type
        let format = 'webm';
        if (audioBlob.type.includes('wav')) format = 'wav';
        else if (audioBlob.type.includes('mp3')) format = 'mp3';
        else if (audioBlob.type.includes('ogg')) format = 'ogg';
        
        // Transcribe audio
        console.log(`[Processing] Transcribing audio (format: ${format})`);
        setProgress(30);
        const { transcript } = await transcribeAudio(base64Audio, format);
        
        // If component has unmounted, exit early
        if (unmountedRef.current) return;
        
        if (!transcript) {
          throw new Error("Could not transcribe the audio. Please try again with clearer audio.");
        }
        
        // Process transcription and generate tweet options in one call
        console.log(`[Processing] Processing transcription: "${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`);
        setProgress(60);
        const tweets = await processTranscriptionAndCreateTweet(transcript);
        
        // If component has unmounted, exit early
        if (unmountedRef.current) return;
        
        // Complete processing
        setProgress(100);
        
        // Wait a moment at 100% for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If component has unmounted, exit early
        if (unmountedRef.current) return;
        
        console.log(`[Processing] Processing complete, generated ${tweets.length} tweets`);
        onProcessingComplete(transcript, tweets);
      } catch (error) {
        // If component has unmounted, exit early
        if (unmountedRef.current) return;
        
        console.error('Processing error:', error);
        onError(error instanceof Error ? error.message : "An error occurred while processing your audio. Please try again.");
      } finally {
        // If component has unmounted, don't update state
        if (!unmountedRef.current) {
          setIsProcessing(false);
        }
        
        // Always clear processing flag in ref
        processingRef.current = false;
        processingPromiseRef.current = null;
      }
    };
    
    // Store the processing promise to avoid duplicate processing
    processingPromiseRef.current = processAudio();
    
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
