import { useState, useEffect, useRef } from 'react';
import { FaCogs, FaPlus, FaCheck } from 'react-icons/fa';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
  const [transcriptText, setTranscriptText] = useState<string>("");
  const [additionalText, setAdditionalText] = useState<string>("");
  const [showAdditionalInput, setShowAdditionalInput] = useState<boolean>(false);
  const [isAddingText, setIsAddingText] = useState<boolean>(false);
  
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
        
        // Save the transcript for additional text feature
        setTranscriptText(transcript);
        
        // Complete the first stage of processing (transcription)
        setProgress(100);
        
        // Show the additional text input UI
        setShowAdditionalInput(true);
        
        // If we're showing the additional text input UI, the rest of the processing will be
        // handled by the handleContinueWithAdditionalText function when the user clicks Continue
        
        // If in the future we want to skip this step and complete automatically:
        // const tweets = await processTranscriptionAndCreateTweet(transcript);
        // console.log(`[Processing] Processing complete, generated ${tweets.length} tweets`);
        // onProcessingComplete(transcript, tweets);
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
  
  const handleContinueWithAdditionalText = async () => {
    try {
      setIsAddingText(true);
      console.log(`[Processing] Adding additional text: "${additionalText}"`);
      
      // Combine the transcript with the additional text
      // If the additional text is present, add it with a space
      const combinedText = additionalText.trim() 
        ? `${transcriptText.trim()} ${additionalText.trim()}`
        : transcriptText.trim();
      
      // Process the combined text
      console.log(`[Processing] Processing combined text: "${combinedText.substring(0, 50)}${combinedText.length > 50 ? '...' : ''}"`);
      
      // Add delay to ensure UI updates before API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tweets = await processTranscriptionAndCreateTweet(combinedText);
      
      // Complete the process
      console.log(`[Processing] Processing complete with additional text, generated ${tweets.length} tweets`);
      onProcessingComplete(combinedText, tweets);
    } catch (error) {
      console.error('Error processing with additional text:', error);
      onError(error instanceof Error ? error.message : "An error occurred while processing your text. Please try again.");
    } finally {
      setIsAddingText(false);
    }
  };

  // No need for additional useEffect since we set showAdditionalInput directly
  // after transcription is complete in the processAudio function

  return (
    <Card className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col items-center text-center">
        {!showAdditionalInput ? (
          // Processing View
          <>
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
          </>
        ) : (
          // Additional Text Input View
          <>
            <div className="mb-4">
              <div className="inline-block p-3 rounded-full bg-[#F5F8FA]">
                <FaPlus className="text-[#1DA1F2] text-xl" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[#14171A] mb-2">Add Additional Text</h3>
            <p className="text-[#657786] mb-4">Need to add links or extra information? Enter it below.</p>
            
            <div className="w-full max-w-md mb-4">
              <Textarea 
                placeholder="Add links, hashtags, or any additional text to include in your tweet..."
                className="w-full p-3 border border-[#E1E8ED] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#1DA1F2] focus:border-transparent"
                rows={4}
                value={additionalText}
                onChange={(e) => setAdditionalText(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={onCancel}
                className="px-4 py-2 rounded-full border border-[#E1E8ED] text-[#657786] hover:bg-[#E1E8ED] transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button 
                onClick={handleContinueWithAdditionalText}
                disabled={isAddingText}
                className="px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none disabled:opacity-50"
              >
                <FaCheck className="inline mr-2" />
                {isAddingText ? "Processing..." : "Continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
