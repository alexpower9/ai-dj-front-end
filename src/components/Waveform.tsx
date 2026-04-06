import { memo, useEffect, useRef, useState } from 'react';

interface WaveformProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

type CanvasSize = {
  width: number;
  height: number;
  dpr: number;
};

function Waveform({ analyserNode, isPlaying }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = rect.width;
      const nextHeight = rect.height;
      const nextDpr = window.devicePixelRatio || 1;

      setCanvasSize((prev) => {
        if (
          prev.width === nextWidth &&
          prev.height === nextHeight &&
          prev.dpr === nextDpr
        ) {
          return prev;
        }
        return {
          width: nextWidth,
          height: nextHeight,
          dpr: nextDpr,
        };
      });
    };

    updateCanvasSize();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateCanvasSize)
        : null;

    resizeObserver?.observe(canvas);
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.max(1, Math.floor(canvasSize.width * canvasSize.dpr));
    canvas.height = Math.max(1, Math.floor(canvasSize.height * canvasSize.dpr));
    ctx.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);

    const width = canvasSize.width;
    const height = canvasSize.height;
    const centerY = height / 2;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#00f5ff');

    const frequencyData = analyserNode
      ? new Uint8Array(analyserNode.frequencyBinCount)
      : null;
    let idlePhase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      if (analyserNode && isPlaying && frequencyData) {
        analyserNode.getByteFrequencyData(frequencyData);

        const bufferLength = frequencyData.length;
        const numBars = Math.min(80, Math.max(24, Math.floor(width / 10)));
        const startBin = 1;
        const endBin = Math.max(startBin + 1, Math.floor(bufferLength * 0.75));
        const binStep = (endBin - startBin) / numBars;
        const gap = 3;
        const barWidth = (width - gap * (numBars - 1)) / numBars;
        const roundedRadius = Math.min(barWidth / 2, 4);

        ctx.shadowBlur = 12;
        ctx.shadowColor = '#8b5cf6';
        ctx.fillStyle = gradient;

        for (let i = 0; i < numBars; i++) {
          const bin = Math.floor(startBin + i * binStep);
          const barHeight = (frequencyData[bin] / 255) * (height * 0.75);
          const x = i * (barWidth + gap);

          ctx.beginPath();
          ctx.roundRect(
            x,
            centerY - barHeight / 2,
            barWidth,
            barHeight / 2,
            [roundedRadius, roundedRadius, 0, 0],
          );
          ctx.fill();

          ctx.beginPath();
          ctx.roundRect(
            x,
            centerY,
            barWidth,
            barHeight / 2,
            [0, 0, roundedRadius, roundedRadius],
          );
          ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      } else {
        idlePhase += 0.02;

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#8b5cf6';

        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const amplitude = 8 + Math.sin(idlePhase * 0.5) * 4;
          const y = centerY + Math.sin(x * 0.02 + idlePhase) * amplitude;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, canvasSize, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-32 rounded-xl"
      style={{
        width: '100%',
        height: '128px',
        background: 'transparent',
      }}
    />
  );
}

export default memo(Waveform);
