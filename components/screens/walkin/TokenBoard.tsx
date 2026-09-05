'use client';

import { useState, useEffect } from 'react';
import { getEnglishVoices, getSavedVoiceName, setSavedVoiceName } from '@/utils/tokenVoice';

interface TokenBoardProps {
  nowServing: number;
  queue: { token: number; name: string }[];
  onCallNext: () => void;
  onCallAgain: () => void;
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  padding: '16px',
  border: '2px solid #1d4ed8',
  marginBottom: '14px',
};

export default function TokenBoard({ nowServing, queue, onCallNext, onCallAgain }: TokenBoardProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const populate = () => {
      const list = getEnglishVoices();
      setVoices(list);
      const saved = getSavedVoiceName();
      if (saved) {
        setVoiceName(saved);
      } else if (list.length) {
        setSavedVoiceName(list[0].name);
        setVoiceName(list[0].name);
      }
    };
    populate();
    window.speechSynthesis.onvoiceschanged = populate;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const handleVoiceChange = (name: string) => {
    setVoiceName(name);
    setSavedVoiceName(name);
  };

  const maxToken = queue.length > 0 ? Math.max(...queue.map((q) => q.token)) : 0;
  const allServed = queue.length > 0 && nowServing > maxToken;
  const currentEntry = queue.find((q) => q.token === nowServing);

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
      {/* Now Serving Card */}
      <div style={{ ...cardStyle, flex: '1', minWidth: '240px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            color: '#fff',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.85, marginBottom: '6px' }}>
            Now Serving
          </div>
          {allServed ? (
            <div style={{ fontSize: '28px', fontWeight: 800 }}>All served ✅</div>
          ) : (
            <>
              <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1 }}>{nowServing > 0 ? nowServing : '—'}</div>
              {currentEntry && (
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '8px', opacity: 0.9 }}>
                  {currentEntry.name}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Always rendered (index.html:16493,17314-17318) — clicking after
              the last token has been called triggers the reset-confirm flow
              inside onCallNext rather than hiding the button. */}
          <button
            onClick={onCallNext}
            style={{
              flex: 1, padding: '10px', background: '#1d4ed8', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e40af')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1d4ed8')}
          >
            ▶ Call Next
          </button>
          {nowServing > 0 && (
            <button
              onClick={onCallAgain}
              style={{
                flex: allServed ? 1 : undefined, padding: '10px 14px', background: '#eff6ff', color: '#1d4ed8',
                border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔁 Call Again
            </button>
          )}
        </div>

        {voices.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>🔊 Announcement Voice</label>
            <select value={voiceName} onChange={(e) => handleVoiceChange(e.target.value)} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12 }}>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Queue List Card */}
      <div style={{ ...cardStyle, flex: '2', minWidth: '280px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a202c', marginBottom: '10px' }}>
          Today's Queue ({queue.length})
        </div>
        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
            No entries today
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '260px', overflowY: 'auto' }}>
            {queue.map((entry) => {
              const done = entry.token <= nowServing;
              return (
                <div
                  key={entry.token}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: entry.token === nowServing ? '#eff6ff' : 'transparent',
                    borderLeft: entry.token === nowServing ? '3px solid #1d4ed8' : '3px solid transparent',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: done ? '#94a3b8' : '#1d4ed8',
                      minWidth: '30px',
                    }}
                  >
                    {entry.token}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: done ? '#94a3b8' : '#1a202c',
                      textDecoration: done ? 'line-through' : 'none',
                      flex: 1,
                    }}
                  >
                    {entry.name}
                  </span>
                  {done && <span style={{ fontSize: '13px' }}>✅</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}