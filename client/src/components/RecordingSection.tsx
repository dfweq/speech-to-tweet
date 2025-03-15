import { useState, useRef, useEffect } from "react";
import RecordRTC, { StereoAudioRecorder } from "recordrtc";
import { FaMicrophone, FaStop, FaMicrophoneAlt } from "react-icons/fa";
import AudioVisualizer from "./AudioVisualizer";
import { Card } from "@/components/ui/card";

interface RecordingSectionProps {
  onRecordingComplete: (blob: Blob) => void;
  onError: (message: string) => void;
}

export default function RecordingSection({ onRecordingComplete, onError }: RecordingSectionProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      
      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      onError("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      // Use a flag to prevent multiple calls in React strict mode
      const isStoppingRef = { current: false };
      
      if (!isStoppingRef.current) {
        isStoppingRef.current = true;
        
        recorderRef.current.stopRecording(() => {
          const blob = recorderRef.current?.getBlob();
          if (blob) {
            // Add a small delay to ensure we don't create multiple blobs
            setTimeout(() => {
              onRecordingComplete(blob);
            }, 10);
          }
          
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
          
          recorderRef.current = null;
          setIsRecording(false);
        });
      }
    }
  };

  const handleCancel = () => {
    if (recorderRef.current) {
      // Use a flag to prevent multiple calls in React strict mode
      const isCancellingRef = { current: false };
      
      if (!isCancellingRef.current) {
        isCancellingRef.current = true;
        
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
          
          recorderRef.current = null;
          setIsRecording(false);
          setRecordingTime(0);
        });
      }
    }
  };

  // Track the last uploaded file to prevent duplicates
  const lastUploadedFileRef = useRef<string>('');
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm'];
      
      // Generate a simple identifier for this file
      const fileId = `${file.name}-${file.size}-${file.lastModified}`;
      
      // Check if we've already processed this file
      if (fileId === lastUploadedFileRef.current) {
        return; // Skip if already processed
      }
      
      // Save this file's identifier
      lastUploadedFileRef.current = fileId;
      
      if (validTypes.includes(file.type)) {
        // Small delay to ensure we don't trigger multiple processing events
        setTimeout(() => {
          onRecordingComplete(file);
        }, 10);
      } else {
        onError("Please upload a valid audio file (WAV, MP3, OGG, or WebM).");
      }
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
      }
    };
  }, []);
  
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
