'use client';
import { useState, useEffect, useRef } from 'react';
import CartoonAgents from '../components/CartoonAgents';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Streaming state
  const [activeStage, setActiveStage] = useState(null);
  const [doneStages, setDoneStages] = useState([]);
  const [logs, setLogs] = useState([]);

  const [result, setResult] = useState(null);
  const [memories, setMemories] = useState([]);
  const [activeTab, setActiveTab] = useState('research');
  const [error, setError] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const logsEndRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const percentX = (e.clientX - centerX) / centerX; // -1 to 1
      const percentY = (e.clientY - centerY) / centerY; // -1 to 1

      setMousePos({
        x: percentX * 40,
        y: percentY * 40
      });

      setRotation({

        x: -percentY * 8, // Rotate X (up/down tilt, 8 degrees max)
        y: percentX * 8   // Rotate Y (left/right tilt, 8 degrees max)
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    fetchMemories();
  }, []);

  async function fetchMemories() {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      setMemories(data.memories || []);
    } catch { }
  }

  async function handleSubmit() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setActiveStage(null);
    setDoneStages([]);
    setLogs([]);
    setResult(null);
    setError(null);
    setActiveTab('research');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last partial string in buffer
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === 'stage') {
              setActiveStage(prevActive => {
                if (prevActive && prevActive !== data.stage) {
                  setDoneStages(prev => [...new Set([...prev, prevActive])]);
                }
                return data.stage;
              });
              setLogs(prev => [...prev, { stage: data.stage, message: data.message }]);
            } else if (data.type === 'result') {
              setActiveStage(prevActive => {
                if (prevActive) {
                  setDoneStages(prev => [...new Set([...prev, prevActive])]);
                }
                return null;
              });
              setResult(data.data);
              fetchMemories();
            } else if (data.type === 'error') {
              setError(data.error);
            }
          } catch (e) {
            console.error('Failed to parse chunk:', line, e);
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setActiveStage(null);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', color: '#c9d1d9', background: '#0a0c10',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', 
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
    }}>

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          borderBottom: '1px solid rgba(48, 54, 61, 0.5)',
          padding: '16px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(10, 12, 16, 0.8)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c6df0, #3fb68a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(124, 109, 240, 0.4)'
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>M</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#f0f6fc', letterSpacing: '-0.5px' }}>memo</div>
          </div>
          <div style={{ display: 'flex', gap: 8, background: '#161b22', padding: 6, borderRadius: 10, border: '1px solid #30363d' }}>
            {['research', 'memory'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 24px', borderRadius: 6, border: 'none',
                background: activeTab === tab ? '#238636' : 'transparent',
                color: activeTab === tab ? '#fff' : '#8b949e',
                cursor: 'pointer', fontSize: 14, fontWeight: 600, textTransform: 'capitalize',
                transition: 'all 0.2s', boxShadow: activeTab === tab ? '0 2px 8px rgba(35, 134, 54, 0.4)' : 'none'
              }}>{tab}</button>
            ))}
          </div>
        </div>

        {activeTab === 'research' && (
          <div style={{ padding: '48px 32px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
            {/* Top Input Bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="What would you like to research?"
                disabled={loading}
                style={{
                  flex: 1, padding: '20px 24px', borderRadius: 12, border: '1px solid #30363d',
                  background: '#010409', color: '#c9d1d9', fontSize: 18,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)', transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#58a6ff'}
                onBlur={(e) => e.target.style.borderColor = '#30363d'}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !query.trim()}
                style={{
                  padding: '0 32px', borderRadius: 12, border: 'none',
                  background: loading ? '#444c56' : 'linear-gradient(135deg, #238636, #2ea043)',
                  color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(46, 160, 67, 0.4)',
                  letterSpacing: '1px'
                }}
              >
                {loading ? 'RESEARCHING...' : 'RUN PIPELINE'}
              </button>
            </div>

            {error && <div style={{ color: '#ff7b72', marginBottom: 24, background: '#ff7b7211', border: '1px solid #ff7b7244', padding: '16px 20px', borderRadius: 10, fontSize: 15 }}>Error: {error}</div>}

          {/* New 3D Orchestration Engine Visualization */}
          <CartoonAgents processing={loading} activeStage={activeStage} />

            {/* Streaming Logs */}
            {(loading || logs.length > 0) && !result && (
              <div style={{
                background: '#010409', border: '1px solid #30363d', borderRadius: 12,
                padding: 24, height: 250, overflowY: 'auto', marginBottom: 40,
                fontFamily: 'monospace', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
              }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: '#8b949e', marginRight: 12 }}>[{log.stage}]</span>
                    <span style={{ color: '#58a6ff' }}>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}

            {/* Result */}
            {result && !loading && (
              <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {/* Answer */}
                <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 32, marginBottom: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                  <div style={{ color: '#58a6ff', marginBottom: 16, fontWeight: 800, fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase' }}>Final Intelligence Report</div>
                  <div style={{ lineHeight: 1.8, fontSize: 17, color: '#e6edf3' }}>{result.answer}</div>
                </div>

                {/* Takeaways */}
                {result.keyTakeaways?.length > 0 && (
                  <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 32, marginBottom: 24 }}>
                    <div style={{ color: '#3fb68a', marginBottom: 16, fontWeight: 800, fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase' }}>Key Takeaways</div>
                    <ul style={{ paddingLeft: 24, margin: 0, lineHeight: 1.8, fontSize: 16, color: '#e6edf3' }}>
                      {result.keyTakeaways.map((t, i) => <li key={i} style={{ marginBottom: 8 }}>{t}</li>)}
                    </ul>
                  </div>
                )}

                {/* Critique */}
                {result.critique && (
                  <div style={{ background: 'linear-gradient(135deg, #161b22, #1b2129)', border: '1px solid #30363d', borderRadius: 12, padding: 32, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                      <span style={{ color: '#d4a020', fontWeight: 800, fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase' }}>Peer Review Assessment</span>
                      <span style={{
                        color: result.critique.verdict === 'APPROVED' ? '#4ade80' : '#ff7b72',
                        border: `1px solid ${result.critique.verdict === 'APPROVED' ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 123, 114, 0.4)'}`,
                        background: result.critique.verdict === 'APPROVED' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 123, 114, 0.1)',
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700
                      }}>
                        {result.critique.verdict}
                      </span>
                    </div>
                    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#8b949e', fontSize: 15 }}>Synthesis Confidence: </span>
                      <div style={{ height: 6, flex: 1, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${result.critique.confidence}%`, height: '100%', background: result.critique.confidence > 80 ? '#4ade80' : '#d4a020' }} />
                      </div>
                      <span style={{ color: '#e6edf3', fontWeight: 'bold' }}>{result.critique.confidence}%</span>
                    </div>
                    {result.critique.followUpQuestions?.length > 0 && (
                      <div style={{ background: '#0d1117', padding: 20, borderRadius: 8, border: '1px solid #30363d' }}>
                        <div style={{ color: '#8b949e', marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Suggested Follow-up Lines of Inquiry:</div>
                        {result.critique.followUpQuestions.map((q, i) => (
                          <div key={i} style={{
                            color: '#58a6ff', cursor: 'pointer', marginBottom: 10, fontSize: 15,
                            display: 'flex', gap: 10, alignItems: 'flex-start'
                          }} onClick={() => setQuery(q)}>
                            <span style={{ opacity: 0.5 }}>→</span> <span style={{ textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.2s' }} onMouseOver={e => e.target.style.textDecorationColor = '#58a6ff'} onMouseOut={e => e.target.style.textDecorationColor = 'transparent'}>{q}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div style={{ padding: '48px 32px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#8b949e', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Network Decentralized Storage</span>
              <span style={{ background: '#21262d', padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>{memories.length} Session Nodes</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
              {memories.map((m, i) => (
                <div
                  key={i}
                  onClick={() => { setQuery(m.query); setActiveTab('research'); }}
                  style={{
                    background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
                    padding: 24, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#58a6ff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#30363d'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                    <span style={{ color: '#58a6ff', fontWeight: 700, fontSize: 16 }}>{m.query}</span>
                    <span style={{ color: '#8b949e', fontSize: 13 }}>{new Date(m.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div style={{ color: '#c9d1d9', fontSize: 15, marginBottom: 20, lineHeight: 1.6 }}>
                    {m.memorySnippet || m.answer?.slice(0, 150) + '...'}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', background: '#21262d', color: '#8b949e', borderRadius: 6 }}>Stored to 0G Layer 1</span>
                    {m.confidence != null && (
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: 6, border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                        {m.confidence}% Integrity
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}