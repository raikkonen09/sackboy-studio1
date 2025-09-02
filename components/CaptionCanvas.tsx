"use client";

import { useEffect, useRef, useState } from 'react';

type Props = { baseImageSrc: string; shareUrl: string | null };

/**
 * Renders a canvas with the stylised image and allows the user to overlay a
 * caption. Users can drag the caption, change font, size, colour and
 * toggle an outline. Keyboard arrow keys nudge the caption.
 */
export default function CaptionCanvas({ baseImageSrc, shareUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [caption, setCaption] = useState('');
  const [font, setFont] = useState<'rounded' | 'stitched'>('rounded');
  const [size, setSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [outline, setOutline] = useState(true);
  const [pos, setPos] = useState({ x: 50, y: 80 });
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = baseImageSrc;

    // Cleanup function to prevent memory leaks
    return () => {
      image.onload = null;
    };
  }, [baseImageSrc]);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption, font, size, color, outline, pos, img]);

  // Add keyboard event listener for global arrow key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when canvas is focused or no input is focused
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPos((p) => ({ ...p, y: Math.max(0, p.y - step) }));
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPos((p) => ({ ...p, y: p.y + step }));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPos((p) => ({ ...p, x: Math.max(0, p.x - step) }));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPos((p) => ({ ...p, x: p.x + step }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Proper cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    if (!caption) return;
    const fontFamily = font === 'rounded' ? 'ui-rounded, system-ui, sans-serif' : 'serif';
    ctx.font = `${size}px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Snap guides (every 50px)
    const snappedX = Math.round(pos.x / 50) * 50;
    const snappedY = Math.round(pos.y / 50) * 50;
    const x = snappedX;
    const y = snappedY;
    if (outline) {
      ctx.lineWidth = Math.max(2, size / 16);
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(caption, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(caption, x, y);
  }

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() {
    dragging.current = false;
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    setPos((p) => ({ x: Math.max(0, p.x + dx), y: Math.max(0, p.y + dy) }));
    last.current = { x: e.clientX, y: e.clientY };
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowUp') setPos((p) => ({ ...p, y: Math.max(0, p.y - step) }));
    if (e.key === 'ArrowDown') setPos((p) => ({ ...p, y: p.y + step }));
    if (e.key === 'ArrowLeft') setPos((p) => ({ ...p, x: Math.max(0, p.x - step) }));
    if (e.key === 'ArrowRight') setPos((p) => ({ ...p, x: p.x + step }));
  }

  function download() {
    const url = canvasRef.current?.toDataURL('image/png');
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sackboy-studio.png';
    a.click();
  }
  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Link copied!');
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className="input"
          placeholder="Add a caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select className="input" value={font} onChange={(e) => setFont(e.target.value as any)}>
            <option value="rounded">Rounded Sans</option>
            <option value="stitched">Stitched Serif</option>
          </select>
          <input
            className="input w-24"
            type="number"
            min={12}
            max={200}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <input
            className="input w-14"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={outline}
              onChange={(e) => setOutline(e.target.checked)}
            />
            Outline
          </label>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl outline-none"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
        />
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={download}>
          Download PNG
        </button>
        {shareUrl && (
          <button className="btn" onClick={copyLink}>
            Copy link
          </button>
        )}
      </div>
    </div>
  );
}
