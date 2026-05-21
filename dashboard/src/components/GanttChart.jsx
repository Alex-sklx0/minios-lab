import { useRef, useEffect, useState } from 'react';

const DEFAULT_COLOR = '#22c55e';
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 16.0;
const ZOOM_STEP = 1.5;

export default function GanttChart({ processes, getRelativeTime }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const followRightRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atRight =
        container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
      followRightRef.current = atRight;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');

    const draw = () => {
      const containerWidth = container.clientWidth;
      const canvasWidth = Math.max(containerWidth, containerWidth * zoomLevel);
      canvas.width = canvasWidth;
      canvas.height = Math.max(200, Object.keys(processes).length * 40 + 40);

      const now = getRelativeTime();
      // Use a FIXED time window (30s) to show slice differences clearly
      // rather than scaling to total execution time
      const timeWindow = 30;
      const procs = Object.values(processes);
      const w = canvas.width;
      const h = canvas.height;
      const rowH = 30;
      const labelW = 90;
      const chartW = w - labelW - 20;
      const topMargin = 30;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, w, h);

      // Calculate sliding time window: always show last 30 seconds
      const windowStart = Math.max(0, now - timeWindow);
      const windowEnd = windowStart + timeWindow;

      // Time axis
      const numTicks = Math.max(5, Math.floor(chartW / 100));
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px monospace';
      for (let i = 0; i <= numTicks; i++) {
        const x = labelW + (chartW * i / numTicks);
        const t = (windowStart + (timeWindow * i / numTicks)).toFixed(1);
        ctx.fillText(`${t}s`, x, 15);
        ctx.strokeStyle = '#1f2937';
        ctx.beginPath();
        ctx.moveTo(x, topMargin);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      procs.forEach((proc, i) => {
        const y = topMargin + i * (rowH + 5);
        const procColor = proc.color || DEFAULT_COLOR;

        // Color swatch next to label
        ctx.fillStyle = procColor;
        ctx.fillRect(2, y + 8, 4, rowH - 12);

        // Label
        ctx.fillStyle = '#d1d5db';
        ctx.font = '12px monospace';
        ctx.fillText(`${proc.pid}`, 10, y + 18);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        ctx.fillText(proc.name, 10, y + 28);

        // Segments — use the process-specific color
        // Only render segments within the current time window
        (proc.segments || []).forEach(seg => {
          // Skip segments outside the current window
          const segEnd = seg.end || (proc.state === 'TERMINATED' ? seg.start : now);
          if (segEnd < windowStart || seg.start > windowEnd) return;

          // Clip segment start/end to window boundaries
          const clippedStart = Math.max(seg.start, windowStart);
          const clippedEnd = Math.min(segEnd, windowEnd);

          const startX = labelW + ((clippedStart - windowStart) / timeWindow) * chartW;
          const endX = labelW + ((clippedEnd - windowStart) / timeWindow) * chartW;
          const segW = Math.max(endX - startX, 1);

          ctx.fillStyle = procColor;
          ctx.fillRect(startX, y + 2, segW, rowH - 4);
        });

        // Row separator
        ctx.strokeStyle = '#1f2937';
        ctx.beginPath();
        ctx.moveTo(labelW, y + rowH + 2);
        ctx.lineTo(w, y + rowH + 2);
        ctx.stroke();
      });

      // Auto-scroll to follow "now"
      if (followRightRef.current && container.scrollWidth > container.clientWidth) {
        container.scrollLeft = container.scrollWidth - container.clientWidth;
      }
    };

    draw();
    const interval = setInterval(draw, 200);
    return () => clearInterval(interval);
  }, [processes, getRelativeTime, zoomLevel]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * ZOOM_STEP, ZOOM_MAX));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / ZOOM_STEP, ZOOM_MIN));
  const handleZoomReset = () => {
    setZoomLevel(1.0);
    followRightRef.current = true;
  };

  return (
    <div className="space-y-2">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={handleZoomOut}
          disabled={zoomLevel <= ZOOM_MIN}
          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-gray-300 font-mono"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleZoomIn}
          disabled={zoomLevel >= ZOOM_MAX}
          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded text-gray-300 font-mono"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomReset}
          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-xs"
          title="Reset zoom"
        >
          Reset
        </button>
        <span className="text-gray-500 font-mono ml-1">{zoomLevel.toFixed(1)}×</span>
        {!followRightRef.current && zoomLevel > 1.0 && (
          <span className="text-yellow-600 ml-2">(scroll → para volver al ahora)</span>
        )}
      </div>

      {/* Scrollable canvas */}
      <div
        ref={containerRef}
        className="overflow-x-auto"
        style={{ minHeight: '200px' }}
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    </div>
  );
}
