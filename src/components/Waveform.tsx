import { useEffect, useRef } from 'react';

interface WaveformProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

export default function Waveform({ analyserNode, isPlaying }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    // Create gradient for the waveform
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#8b5cf6');    // Purple
    gradient.addColorStop(0.5, '#3b82f6');  // Blue
    gradient.addColorStop(1, '#00f5ff');    // Cyan

    // For idle animation when not playing
    let idlePhase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (analyserNode && isPlaying) {
        // Get frequency data
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        // Draw frequency bars as a mirrored waveform
        const barWidth = width / bufferLength * 2.5;
        const gap = 2;

        ctx.fillStyle = gradient;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * (height * 0.8);
          const x = i * (barWidth + gap);
          
          if (x > width) break;

          // Draw bar going up
          const roundedRadius = Math.min(barWidth / 2, 4);
          
          // Top half (going up from center)
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight / 2, [roundedRadius, roundedRadius, 0, 0]);
          ctx.fill();
          
          // Bottom half (going down from center, mirrored)
          ctx.beginPath();
          ctx.roundRect(x, centerY, barWidth, barHeight / 2, [0, 0, roundedRadius, roundedRadius]);
          ctx.fill();
        }

        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#8b5cf6';
      } else {
        // Idle animation - subtle wave
        idlePhase += 0.02;
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#8b5cf6';

        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const frequency = 0.02;
          const amplitude = 8 + Math.sin(idlePhase * 0.5) * 4;
          const y = centerY + Math.sin(x * frequency + idlePhase) * amplitude;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isPlaying]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-32 rounded-xl"
      style={{ 
        width: '100%', 
        height: '128px',
        background: 'transparent'
      }}
    />
  );
}
