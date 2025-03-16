import { useState, useRef } from "react";
import RecordingSection from "@/components/RecordingSection";
import ProcessingSection from "@/components/ProcessingSection";
import ResultsSection from "@/components/ResultsSection";
import SuccessSection from "@/components/SuccessSection";
import ErrorSection from "@/components/ErrorSection";
import { FaTwitter } from "react-icons/fa";

type ViewState = "recording" | "processing" | "results" | "success" | "error";

// Create a module-scope (outside of component) flag to prevent duplicate processing
// This helps with React's strict mode which runs effects twice in development
let isCurrentlyProcessing = false;

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>("recording");
  const [transcript, setTranscript] = useState<string>("");
  const [tweetText, setTweetText] = useState<string>("");
  const [additionalTweets, setAdditionalTweets] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Use a ref to track the last processed blob's identifier
  const lastProcessedBlobId = useRef<string>('');

  const handleRecordingComplete = (blob: Blob) => {
    // Create a unique identifier for this blob that's focused on its content 
    // (without timestamp to properly deduplicate)
    const blobId = `${blob.size}-${blob.type}`;
    
    // Check if we're already processing
    if (isCurrentlyProcessing) {
      console.log('[Home] Already processing audio, ignoring duplicate request');
      return;
    }
    
    // Check if we've already processed this exact blob
    if (blobId === lastProcessedBlobId.current) {
      console.log('[Home] Skipping duplicate processing of the same blob');
      return;
    }
    
    console.log(`[Home] Processing new audio blob: ${blobId}, size: ${blob.size} bytes`);
    
    // Set global processing flag and save blob identifier
    isCurrentlyProcessing = true;
    lastProcessedBlobId.current = blobId;
    
    // Update state to begin processing
    setAudioBlob(blob);
    setViewState("processing");
    setProcessingProgress(0);
  };

  const handleProcessingComplete = (text: string, tweets: string[]) => {
    // Reset the global processing flag
    isCurrentlyProcessing = false;
    
    setTranscript(text);
    setTweetText(tweets[0] || "");
    setAdditionalTweets(tweets.slice(1));
    setViewState("results");
  };

  const handlePostSuccess = () => {
    setViewState("success");
  };

  const handleError = (message: string) => {
    // Reset the global processing flag
    isCurrentlyProcessing = false;
    
    setErrorMessage(message);
    setViewState("error");
  };

  const resetToRecording = () => {
    // Reset the global processing flag
    isCurrentlyProcessing = false;
    
    setViewState("recording");
    setTranscript("");
    setTweetText("");
    setAdditionalTweets([]);
    setErrorMessage("");
    setProcessingProgress(0);
    setAudioBlob(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-[#657786]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <FaTwitter className="text-[#1DA1F2] text-2xl mr-3" />
            <h1 className="text-xl font-semibold text-[#14171A]">Voice-to-Tweet</h1>
          </div>
          <div>
            <button className="flex items-center space-x-2 focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white">
                <span>JD</span>
              </div>
              <span className="hidden sm:inline text-sm font-medium">John Doe</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {viewState === "recording" && (
          <RecordingSection onRecordingComplete={handleRecordingComplete} onError={handleError} />
        )}
        
        {viewState === "processing" && (
          <ProcessingSection 
            progress={processingProgress} 
            setProgress={setProcessingProgress}
            audioBlob={audioBlob}
            onProcessingComplete={handleProcessingComplete}
            onCancel={resetToRecording}
            onError={handleError}
          />
        )}
        
        {viewState === "results" && (
          <ResultsSection 
            tweetText={tweetText} 
            setTweetText={setTweetText}
            additionalTweets={additionalTweets}
            onPostSuccess={handlePostSuccess}
            onError={handleError}
          />
        )}
        
        {viewState === "success" && (
          <SuccessSection 
            tweetText={tweetText}
            onNewTweet={resetToRecording}
          />
        )}
        
        {viewState === "error" && (
          <ErrorSection 
            errorMessage={errorMessage}
            onTryAgain={resetToRecording}
          />
        )}
      </main>
    </div>
  );
}
