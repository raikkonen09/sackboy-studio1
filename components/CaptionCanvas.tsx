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

    // Split caption into lines and draw each line
    const lines = caption.split('\n');
    const lineHeight = size * 1.2; // Add some line spacing

    lines.forEach((line, index) => {
      const lineY = y + (index * lineHeight);

      if (outline) {
        ctx.lineWidth = Math.max(2, size / 16);
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(line, x, lineY);
      }
      ctx.fillStyle = color;
      ctx.fillText(line, x, lineY);
    });
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

  function postToX() {
    // Get the canvas image as a data URL
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create the tweet text
    const tweetText = `${caption ? caption + '\n\n' : ''}Made with Sackboy Studio \n\nsackboy-studio.xyz\n\n$Sackboys #Sackboys #Sackboy`;

    // Create Twitter intent URL for posting with text
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ''}`;

    // Open Twitter in a new window
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  }

  // X (Twitter) Icon Component
  const XIcon = () => (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <textarea
          className="input resize-none"
          placeholder="Add a caption (use Enter for line breaks)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
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
        <button className="btn" onClick={postToX}>
          <XIcon />
          Post to X
        </button>
      </div>
    </div>
  );
}
