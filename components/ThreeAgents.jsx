"use client";
import React from 'react';

export default function ThreeAgents({ processing, activeStage }) {
  const speed = processing ? '2s' : '8s';
  const pulseSpeed = processing ? '1s' : '3s';

  const getAgentGlow = (id, baseColor) => {
    if (activeStage === id) return `0 0 30px ${baseColor}, inset 0 0 10px ${baseColor}`;
    return `0 0 10px ${baseColor}40`;
  };

  return (
    <div style={{
      width: '100%', height: '350px', 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'visible',
      perspective: '1200px',
      margin: '20px 0'
    }}>
      <style>{`
        @keyframes orbit {
          0% { transform: rotateX(60deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(60deg) rotateY(0deg) rotateZ(360deg); }
        }
        @keyframes counter-rotate {
          0% { transform: rotateZ(0deg) rotateY(0deg) rotateX(-60deg); }
          100% { transform: rotateZ(-360deg) rotateY(0deg) rotateX(-60deg); }
        }
        @keyframes float-core {
          0% { transform: translateZ(40px) scale(1); box-shadow: 0 0 20px #58a6ff; }
          50% { transform: translateZ(60px) scale(1.1); box-shadow: 0 0 50px #58a6ff, 0 0 100px rgba(88, 166, 255, 0.4); }
          100% { transform: translateZ(40px) scale(1); box-shadow: 0 0 20px #58a6ff; }
        }
        @keyframes data-stream {
          0% { stroke-dashoffset: 20; opacity: 0.3; }
          50% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.3; }
        }
      `}</style>
      
      {/* Central Solution Core */}
      <div style={{
        position: 'absolute',
        width: 80, height: 80, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #a5d6ff 0%, #58a6ff 30%, #1f6feb 100%)',
        animation: `float-core ${pulseSpeed} ease-in-out infinite`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 5, border: '2px solid rgba(165, 214, 255, 0.8)',
        transformStyle: 'preserve-3d'
      }}>
        <div style={{ fontSize: 32, transform: 'translateZ(20px)' }}>💡</div>
      </div>

      {/* Orbiting Ring */}
      <div style={{
        width: 300, height: 300, borderRadius: '50%',
        border: '2px solid rgba(48, 54, 61, 0.8)',
        position: 'absolute',
        transformStyle: 'preserve-3d',
        animation: `orbit ${speed} linear infinite`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.5)'
      }}>
        
        {/* SVG Data Lines Connecting to Center */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <circle cx="150" cy="150" r="150" fill="none" stroke="#30363d" strokeWidth="1" />
          <line x1="150" y1="0" x2="150" y2="150" stroke="#3fb68a" strokeWidth="2" strokeDasharray="4 4" style={{ animation: `data-stream ${speed} linear infinite` }} />
          <line x1="280" y1="225" x2="150" y2="150" stroke="#e07840" strokeWidth="2" strokeDasharray="4 4" style={{ animation: `data-stream ${speed} linear infinite` }} />
          <line x1="20" y1="225" x2="150" y2="150" stroke="#d4a020" strokeWidth="2" strokeDasharray="4 4" style={{ animation: `data-stream ${speed} linear infinite` }} />
        </svg>

        {/* Agent 1: Researcher (Teal) */}
        <div style={{
          position: 'absolute', top: -25, left: '50%', marginLeft: -25,
          width: 50, height: 50, background: '#161b22', borderRadius: '12px',
          border: '2px solid #3fb68a', boxShadow: getAgentGlow('research', '#3fb68a'),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: `counter-rotate ${speed} linear infinite`,
          transition: 'all 0.3s', zIndex: 10
        }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span style={{ fontSize: 9, color: '#3fb68a', fontWeight: 'bold', marginTop: 2, background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 4 }}>RESEARCH</span>
        </div>

        {/* Agent 2: Summarizer (Orange) */}
        <div style={{
          position: 'absolute', bottom: 15, right: -15,
          width: 50, height: 50, background: '#161b22', borderRadius: '12px',
          border: '2px solid #e07840', boxShadow: getAgentGlow('summary', '#e07840'),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: `counter-rotate ${speed} linear infinite`,
          transition: 'all 0.3s', zIndex: 10
        }}>
          <span style={{ fontSize: 20 }}>📝</span>
          <span style={{ fontSize: 9, color: '#e07840', fontWeight: 'bold', marginTop: 2, background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 4 }}>SUMMARIZE</span>
        </div>

        {/* Agent 3: Critic (Amber) */}
        <div style={{
          position: 'absolute', bottom: 15, left: -15,
          width: 50, height: 50, background: '#161b22', borderRadius: '12px',
          border: '2px solid #d4a020', boxShadow: getAgentGlow('critique', '#d4a020'),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: `counter-rotate ${speed} linear infinite`,
          transition: 'all 0.3s', zIndex: 10
        }}>
          <span style={{ fontSize: 20 }}>⚖️</span>
          <span style={{ fontSize: 9, color: '#d4a020', fontWeight: 'bold', marginTop: 2, background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 4 }}>CRITIC</span>
        </div>

      </div>
    </div>
  );
}
