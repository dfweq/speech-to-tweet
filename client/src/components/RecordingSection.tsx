import { useState, useRef, useEffect } from "react";
import RecordRTC, { StereoAudioRecorder } from "recordrtc";
import { FaMicrophone, FaStop, FaMicrophoneAlt } from "react-icons/fa";
import AudioVisualizer from "./AudioVisualizer";
import { Card } from "@/components/ui/card";

interface RecordingSectionProps {
  onRecordingComplete: (blob: Blob) => void;
  onError: (message: string) => void;
}

// Keep track of processed recordings and file uploads across component instances
// This addresses issues with React strict mode mounting components twice
const processedRecordings = new Set<string>();
const processedFileUploads = new Set<string>();

export default function RecordingSection({ onRecordingComplete, onError }: RecordingSectionProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  
  // Use refs to track state across rerenders and React strict mode double-mounting
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const isCancellingRef = useRef<boolean>(false);
  const unmountedRef = useRef<boolean>(false);
  
  // Track the timestamp of the last recording sent to avoid duplicates
  const lastRecordingIdRef = useRef<string>('');

  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
        recorderRef.current = null;
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    // Prevent duplicate start in React strict mode
    if (isStartingRef.current || isRecording || recorderRef.current) {
      console.log("[Recording] Already recording or starting, ignoring duplicate call");
      return;
    }
    
    // Set flag to prevent multiple starts
    isStartingRef.current = true;
    
    try {
      console.log("[Recording] Requesting microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check if component was unmounted during the async operation
      if (unmountedRef.current) {
        console.log("[Recording] Component unmounted during microphone access, cleaning up");
        stream.getTracks().forEach(track => track.stop());
        isStartingRef.current = false;
        return;
      }
      
      streamRef.current = stream;
      
      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 16000, // Optimized for Whisper API
        timeSlice: 1000,
        disableLogs: true,
      });
      
      console.log("[Recording] Starting recording");
      recorder.startRecording();
      recorderRef.current = recorder;
      
      // If component was unmounted, clean up
      if (unmountedRef.current) {
        console.log("[Recording] Component unmounted after recorder initialization, cleaning up");
        recorder.stopRecording();
        stream.getTracks().forEach(track => track.stop());
        isStartingRef.current = false;
        return;
      }
      
      setIsRecording(true);
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      isStartingRef.current = false;
    } catch (error) {
      console.error("[Recording] Error accessing microphone:", error);
      onError("Could not access microphone. Please ensure you have granted permission.");
      isStartingRef.current = false;
    }
  };

  const stopRecording = () => {
    // Prevent duplicate stops
    if (isStoppingRef.current || !recorderRef.current || !isRecording) {
      console.log("[Recording] Not recording or already stopping, ignoring duplicate call");
      return;
    }
    
    // Set flag to prevent multiple stops
    isStoppingRef.current = true;
    console.log("[Recording] Stopping recording");
    
    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current?.getBlob();
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // If component was unmounted, clean up silently
      if (unmountedRef.current) {
        console.log("[Recording] Component unmounted during stop, skipping callbacks");
        isStoppingRef.current = false;
        return;
      }
      
      // Reset recorder ref
      recorderRef.current = null;
      setIsRecording(false);
      
      // Process the blob if we have one
      if (blob) {
        // Create a unique identifier for this recording based on size and timestamp
        const recordingId = `recording-${blob.size}-${Date.now()}`;
        
        // Skip if we've already processed this or a very similar recording
        // (prevents duplicate processing in React strict mode)
        if (processedRecordings.has(recordingId) || 
            recordingId === lastRecordingIdRef.current) {
          console.log(`[Recording] Skipping duplicate recording: ${recordingId}`);
          isStoppingRef.current = false;
          return;
        }
        
        // Track this recording
        processedRecordings.add(recordingId);
        lastRecordingIdRef.current = recordingId;
        
        console.log(`[Recording] Processing recording: ${recordingId}, size: ${blob.size} bytes`);
        
        // Add a small delay to ensure we don't create multiple blobs
        setTimeout(() => {
          onRecordingComplete(blob);
          isStoppingRef.current = false;
        }, 50);
      } else {
        console.error("[Recording] Failed to get recording blob");
        onError("Failed to process recording. Please try again.");
        isStoppingRef.current = false;
      }
    });
  };

  const handleCancel = () => {
    // Prevent duplicate cancels
    if (isCancellingRef.current || !recorderRef.current || !isRecording) {
      return;
    }
    
    // Set flag to prevent multiple cancels
    isCancellingRef.current = true;
    console.log("[Recording] Cancelling recording");
    
    recorderRef.current.stopRecording(() => {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // If component was unmounted, clean up silently
      if (unmountedRef.current) {
        isCancellingRef.current = false;
        return;
      }
      
      recorderRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      isCancellingRef.current = false;
    });
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm'];
    
    // Generate a unique identifier for this file
    const fileId = `file-${file.name}-${file.size}-${file.lastModified}-${Date.now()}`;
    
    // Skip if we've already processed this file (prevents duplicate processing in React strict mode)
    if (processedFileUploads.has(fileId)) {
      console.log(`[Recording] Skipping duplicate file upload: ${fileId}`);
      return;
    }
    
    // Track this file upload
    processedFileUploads.add(fileId);
    console.log(`[Recording] Processing file upload: ${fileId}, type: ${file.type}, size: ${file.size} bytes`);
    
    if (validTypes.includes(file.type)) {
      // Small delay to ensure we don't trigger multiple processing events
      setTimeout(() => {
        onRecordingComplete(file);
        
        // Reset the input to allow selecting the same file again
        event.target.value = '';
      }, 50);
    } else {
      onError("Please upload a valid audio file (WAV, MP3, OGG, or WebM).");
      
      // Reset the input
      event.target.value = '';
    }
  };
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex flex-col items-center justify-center p-4">
        {/* Recording State Indicator */}
        <div className="mb-4 text-center">
          <span className="text-sm font-medium text-[#657786]">
            {isRecording ? "Recording..." : "Ready to record"}
          </span>
          {isRecording && (
            <span className="ml-2 text-sm font-medium">
              {formatTime(recordingTime)}
            </span>
          )}
        </div>

        {/* Record Button */}
        <div className="mb-6">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-full text-white flex items-center justify-center shadow-md hover:bg-opacity-90 transition-all focus:outline-none active:scale-95 ${
              isRecording 
                ? "bg-[#FF3B30] animate-[pulse_1.5s_infinite]" 
                : "bg-[#1DA1F2]"
            }`}
          >
            {isRecording ? <FaMicrophoneAlt className="text-xl" /> : <FaMicrophone className="text-xl" />}
          </button>
        </div>

        {/* Audio Visualizer */}
        {isRecording && (
          <div className="w-full max-w-md h-12 mb-4">
            <AudioVisualizer isRecording={isRecording} />
          </div>
        )}

        {/* Recording Controls */}
        {isRecording && (
          <div className="flex space-x-4 mb-4">
            <button 
              onClick={handleCancel}
              className="px-4 py-2 rounded-full border border-[#E1E8ED] text-[#657786] hover:bg-[#E1E8ED] transition-colors focus:outline-none"
            >
              Cancel
            </button>
            <button 
              onClick={stopRecording}
              className="px-4 py-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-90 transition-colors focus:outline-none"
            >
              <FaStop className="inline mr-2" />Stop
            </button>
          </div>
        )}

        {/* File Upload */}
        <div className="text-center mt-2">
          <p className="text-sm mb-2">or</p>
          <label htmlFor="audioFile" className="cursor-pointer text-[#1DA1F2] hover:underline text-sm">
            Upload audio file
            <input 
              type="file" 
              id="audioFile" 
              className="hidden" 
              accept="audio/*" 
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    </Card>
  );
}
