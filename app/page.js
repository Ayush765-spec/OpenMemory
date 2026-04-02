'use client';
import { useState, useEffect } from 'react';

const AGENT_STEPS = [
  { key: 'memory_load', label: 'Loading Memory', icon: '🧠', color: '#8b5cf6' },
  { key: 'research', label: 'Research Agent', icon: '🔍', color: '#06b6d4' },
  { key: 'summarize', label: 'Summarizer Agent', icon: '📝', color: '#10b981' },
  { key: 'critique', label: 'Critic Agent', icon: '⚖️', color: '#f59e0b' },
  { key: 'memory_save', label: 'Saving to 0G', icon: '💾', color: '#ec4899' },
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [memories, setMemories] = useState([]);
  const [activeTab, setActiveTab] = useState('research');
  const [error, setError] = useState(null);

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
    setCompletedSteps([]);
    setResult(null);
    setError(null);
    setActiveTab('research');

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();

      if (data.success) {
        for (const step of AGENT_STEPS) {
          await new Promise(r => setTimeout(r, 500));
          setCompletedSteps(prev => [...prev, step.key]);
        }
        setResult(data.result);
        fetchMemories();
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (e) {
      setError(e.message);
    }

    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e2e8f0',
      fontFamily: 'monospace',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1e1e2e',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16
          }}>M</div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Memo</span>
          <span style={{
            fontSize: 11, padding: '2px 8px',
            background: '#1e1e2e', borderRadius: 4, color: '#6366f1',
            border: '1px solid #6366f133'
          }}>0G Network</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['research', 'memory'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: activeTab === tab ? '#6366f1' : '#1e1e2e',
              color: activeTab === tab ? '#fff' : '#94a3b8',
              cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
              textTransform: 'capitalize'
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left Panel - Agent Pipeline */}
        <div style={{
          width: 260,
          borderRight: '1px solid #1e1e2e',
          padding: 20,
        }}>
          <div style={{
            fontSize: 11, color: '#475569', marginBottom: 16,
            letterSpacing: 1, textTransform: 'uppercase'
          }}>Agent Pipeline</div>

          {AGENT_STEPS.map(({ key, label, icon, color }) => {
            const done = completedSteps.includes(key);
            const isActive = loading && !done &&
              completedSteps.length === AGENT_STEPS.findIndex(s => s.key === key);

            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                background: done ? '#1e1e2e' : 'transparent',
                border: isActive ? `1px solid ${color}55` : '1px solid transparent',
                transition: 'all 0.3s'
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: done ? color + '22' : '#1e1e2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14
                }}>{icon}</div>
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: done ? '#e2e8f0' : '#475569'
                }}>{label}</div>
                {done && <div style={{ marginLeft: 'auto', color: '#10b981', fontSize: 12 }}>✓</div>}
              </div>
            );
          })}
        </div>

        {/* Main Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Query Input */}
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #1e1e2e' }}>
            <div style={{
              display: 'flex', gap: 12,
              background: '#111118', border: '1px solid #1e1e2e',
              borderRadius: 12, padding: '12px 16px',
            }}>
              <span style={{ color: '#6366f1', fontSize: 16 }}>$</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Ask anything — agents remember across sessions..."
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', color: '#e2e8f0',
                  fontFamily: 'monospace', fontSize: 14
                }}
              />
              <button onClick={handleSubmit} disabled={loading || !query.trim()} style={{
                padding: '6px 18px', borderRadius: 8, border: 'none',
                background: loading ? '#1e1e2e' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: loading ? '#475569' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 13, fontFamily: 'monospace', fontWeight: 600
              }}>
                {loading ? 'Running...' : 'Run →'}
              </button>
            </div>
            {error && (
              <div style={{
                marginTop: 10, padding: '10px 16px',
                background: '#ff000011', border: '1px solid #ff000033',
                borderRadius: 8, color: '#f87171', fontSize: 13
              }}>{error}</div>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

            {activeTab === 'research' && (
              <>
                {!result && !loading && (
                  <div style={{ textAlign: 'center', paddingTop: 80, color: '#334155' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                    <div style={{ fontSize: 16 }}>Agents are standing by.</div>
                    <div style={{ fontSize: 13, marginTop: 8 }}>Ask a question above to start the pipeline.</div>
                  </div>
                )}

                {loading && (
                  <div style={{ textAlign: 'center', paddingTop: 80, color: '#475569' }}>
                    <div style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
                    <div style={{ fontSize: 14 }}>Agents are working...</div>
                  </div>
                )}

                {result && (
                  <div>
                    {/* Answer */}
                    <div style={{
                      background: '#111118', border: '1px solid #6366f133',
                      borderRadius: 12, padding: 24, marginBottom: 20
                    }}>
                      <div style={{
                        fontSize: 11, color: '#6366f1', letterSpacing: 1,
                        textTransform: 'uppercase', marginBottom: 10
                      }}>Answer</div>
                      <div style={{ fontSize: 15, lineHeight: 1.7, color: '#e2e8f0' }}>
                        {result.answer}
                      </div>
                    </div>

                    {/* Key Takeaways */}
                    {result.keyTakeaways?.length > 0 && (
                      <div style={{
                        background: '#111118', border: '1px solid #1e1e2e',
                        borderRadius: 12, padding: 24, marginBottom: 20
                      }}>
                        <div style={{
                          fontSize: 11, color: '#10b981', letterSpacing: 1,
                          textTransform: 'uppercase', marginBottom: 14
                        }}>Key Takeaways</div>
                        {result.keyTakeaways.map((t, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                            <span style={{ color: '#10b981', flexShrink: 0 }}>→</span>
                            <span style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>{t}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Critique */}
                    {result.critique && (
                      <div style={{
                        background: '#111118', border: '1px solid #1e1e2e',
                        borderRadius: 12, padding: 24, marginBottom: 20
                      }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', marginBottom: 14
                        }}>
                          <div style={{
                            fontSize: 11, color: '#f59e0b', letterSpacing: 1, textTransform: 'uppercase'
                          }}>Critic Assessment</div>
                          <div style={{
                            fontSize: 12, padding: '2px 10px', borderRadius: 20,
                            background: result.critique.verdict === 'APPROVED' ? '#10b98122' : '#f59e0b22',
                            color: result.critique.verdict === 'APPROVED' ? '#10b981' : '#f59e0b',
                            border: `1px solid ${result.critique.verdict === 'APPROVED' ? '#10b98133' : '#f59e0b33'}`
                          }}>{result.critique.verdict}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{ fontSize: 13, color: '#64748b' }}>Confidence</div>
                          <div style={{
                            flex: 1, height: 6, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${result.critique.confidence}%`, height: '100%',
                              background: 'linear-gradient(90deg, #6366f1, #10b981)'
                            }} />
                          </div>
                          <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>
                            {result.critique.confidence}%
                          </div>
                        </div>

                        {result.critique.followUpQuestions?.length > 0 && (
                          <>
                            <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                              Follow-up questions:
                            </div>
                            {result.critique.followUpQuestions.map((q, i) => (
                              <div key={i} onClick={() => setQuery(q)} style={{
                                fontSize: 13, color: '#6366f1', cursor: 'pointer',
                                padding: '6px 0', borderBottom: '1px solid #1e1e2e'
                              }}>→ {q}</div>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    {/* Relevant Past Memories */}
                    {result.relevantMemories?.length > 0 && (
                      <div style={{
                        background: '#111118', border: '1px solid #8b5cf633',
                        borderRadius: 12, padding: 24
                      }}>
                        <div style={{
                          fontSize: 11, color: '#8b5cf6', letterSpacing: 1,
                          textTransform: 'uppercase', marginBottom: 14
                        }}>Used From Memory</div>
                        {result.relevantMemories.map((m, i) => (
                          <div key={i} style={{
                            padding: '10px 0',
                            borderBottom: i < result.relevantMemories.length - 1
                              ? '1px solid #1e1e2e' : 'none'
                          }}>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{m.query}</div>
                            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                              {m.memorySnippet}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'memory' && (
              <div>
                <div style={{
                  fontSize: 11, color: '#475569', letterSpacing: 1,
                  textTransform: 'uppercase', marginBottom: 20
                }}>Stored on 0G Network ({memories.length} sessions)</div>

                {memories.length === 0 ? (
                  <div style={{ textAlign: 'center', paddingTop: 60, color: '#334155' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
                    <div>No memories yet. Run a query first.</div>
                  </div>
                ) : memories.map((m, i) => (
                  <div key={i} onClick={() => { setQuery(m.query); setActiveTab('research'); }}
                    style={{
                      background: '#111118', border: '1px solid #1e1e2e',
                      borderRadius: 12, padding: 20, marginBottom: 12, cursor: 'pointer'
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{m.query}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        {new Date(m.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                      {m.answer?.slice(0, 120)}...
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: '#8b5cf622', color: '#8b5cf6'
                      }}>saved to 0G</span>
                      {m.confidence && (
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          background: '#10b98122', color: '#10b981'
                        }}>{m.confidence}% confidence</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}