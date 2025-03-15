import RecordRTC, { StereoAudioRecorder } from 'recordrtc';

export interface RecordingOptions {
  timeSlice?: number;
  desiredSampRate?: number;
  numberOfAudioChannels?: number;
}

export interface Recording {
  blob: Blob;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
}

export async function startRecording(options?: RecordingOptions): Promise<{
  recorder: RecordRTC;
  stream: MediaStream;
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const recorder = new RecordRTC(stream, {
      type: 'audio',
      mimeType: 'audio/webm',
      recorderType: StereoAudioRecorder,
      numberOfAudioChannels: options?.numberOfAudioChannels || 1,
      desiredSampRate: options?.desiredSampRate || 16000, // optimized for Whisper API
      timeSlice: options?.timeSlice || 1000,
      disableLogs: true,
    });
    
    recorder.startRecording();
    
    return { recorder, stream };
  } catch (error) {
    console.error("Error starting recording:", error);
    throw new Error(`Could not start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function stopRecording(recorder: RecordRTC, stream: MediaStream): Promise<Recording> {
  return new Promise((resolve, reject) => {
    const startTime = new Date();
    
    try {
      recorder.stopRecording(() => {
        const endTime = new Date();
        const blob = recorder.getBlob();
        
        // Calculate duration in seconds
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;
        
        // Stop all tracks from the stream
        stream.getTracks().forEach(track => track.stop());
        
        resolve({
          blob,
          startTime,
          endTime,
          duration
        });
      });
    } catch (error) {
      console.error("Error stopping recording:", error);
      reject(error);
    }
  });
}

export async function fileToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        const blob = new Blob([reader.result], { type: file.type });
        resolve(blob);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };
    
    reader.onerror = () => {
      reject(reader.error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., data:audio/webm;base64,)
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function getAudioFormat(blob: Blob): string {
  const mimeType = blob.type.toLowerCase();
  
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('webm')) return 'webm';
  
  // Default to webm if unknown
  return 'webm';
}
