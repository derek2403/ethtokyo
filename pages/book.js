import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { useSetAtom } from "jotai";
import { Experience } from "../components/book/Experience";
import { UI } from "../components/book/UI";
import { summaryTextureAtom } from "../components/book/UI";

// Create a simple day summary image as a data URL
function createSummaryTexture(summaryText) {
  const width = 1024; // 3:4 ratio canvas
  const height = Math.round(width * 1.3333);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#f6f6f6';
  ctx.fillRect(0, 0, width, height);
  
  // Page margin
  const marginX = 72;
  const marginTop = 72;
  
  // Title
  ctx.fillStyle = '#222';
  ctx.font = 'bold 48px Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.textBaseline = 'top';
  ctx.fillText('Daily Summary', marginX, marginTop);
  
  // Date line
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  ctx.font = '24px Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#444';
  ctx.fillText(dateStr, marginX, marginTop + 56);
  
  // Body text wrapping
  const bodyX = marginX;
  const bodyY = marginTop + 110;
  const maxWidth = width - marginX * 2;
  ctx.font = '28px Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#111';
  
  const words = summaryText.split(/\s+/);
  let line = '';
  let y = bodyY;
  const lineHeight = 40;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), bodyX, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line.trim(), bodyX, y);
  
  // Footer note
  ctx.font = '20px Inter, system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = '#666';
  ctx.fillText('Generated from today\'s conversations', marginX, height - 64);
  
  return canvas.toDataURL('image/jpeg', 0.92);
}

// Build a lightweight summary string from chat history
function summarizeSessions(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  
  const todays = sessions.filter(s => {
    const d = new Date(s.date || s.timestamp || 0);
    return d >= start && d < end;
  });
  const recent = todays.length ? todays : [sessions[sessions.length - 1]];
  const msgs = recent.flatMap(s => (s.messages || []));
  const userLines = msgs.filter(m => m.isUser).map(m => m.text);
  const aiLines = msgs.filter(m => !m.isUser).map(m => m.text);
  
  const userSample = userLines.slice(-2).join(' | ');
  const aiSample = aiLines.slice(-2).join(' ');
  
  let summary = '';
  if (userSample) summary += `You shared: ${userSample}. `;
  if (aiSample) summary += `Support offered: ${aiSample}`;
  summary = summary.trim();
  // Trim to ~90 words for readability
  const words = summary.split(/\s+/);
  if (words.length > 90) summary = words.slice(0, 90).join(' ') + '…';
  return summary || 'A calm day with gentle reflections and small steps forward.';
}

export default function BookPage() {
  const setSummaryTexture = useSetAtom(summaryTextureAtom);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/chat_history');
        const data = await resp.json();
        const summary = summarizeSessions(data.sessions || []);
        if (!summary) return;
        const url = createSummaryTexture(summary);
        if (!cancelled) setSummaryTexture(url);
      } catch (e) {
        // Ignore errors and keep fallback texture
        console.warn('Failed to generate summary texture:', e?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [setSummaryTexture]);
  return (
    <>
      {/* UI overlay with controls and background animation */}
      <UI />
      
      {/* Three.js loader for showing loading state */}
      <Loader />
      
      {/* Main 3D canvas - use a fixed full-screen container to guarantee full height */}
      <div id="book-canvas-root" className="fixed inset-0">
        <Canvas 
          style={{ width: '100%', height: '100%' }}
          shadows 
          camera={{
            position: [-0.5, -0.5, typeof window !== 'undefined' && window.innerWidth > 800 ? 4 : 9],
            fov: 45,
          }}
        >
        <group position-y={-1.2}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </group>
        </Canvas>
      </div>
    </>
  );
}
