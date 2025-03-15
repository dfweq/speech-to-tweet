import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  isRecording: boolean;
}

export default function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !isRecording) return;

    // Create bars for visualization
    const container = containerRef.current;
    container.innerHTML = '';
    
    const barCount = 13;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'h-4 w-[3px] mx-[2px] bg-[#1DA1F2] rounded-[3px] audio-wave-bar';
      container.appendChild(bar);
    }

    // Animate bars
    const bars = container.querySelectorAll('.audio-wave-bar');
    let animationId: number | null = null;
    
    const animate = () => {
      bars.forEach(bar => {
        const height = Math.floor(Math.random() * 30) + 5;
        (bar as HTMLElement).style.height = `${height}px`;
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isRecording]);

  return (
    <div ref={containerRef} className="audio-wave flex items-center justify-center h-[50px]"></div>
  );
}
