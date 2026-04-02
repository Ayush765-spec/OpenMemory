"use client";
import React, { useState, useEffect, useRef } from 'react';

const Agent = ({ id, name, color, emoji, target }) => {
  const agentRef = useRef(null);
  
  // Safe initial spawn logic using center of room
  const posRef = useRef({ x: 350, y: 200 });
  const [flipped, setFlipped] = useState(false);
  
  useEffect(() => {
    let frame;
    const speed = 2.5; // pixel per frame
    
    const update = () => {
      const p = posRef.current;
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let isMoving = false;
      if (dist > speed) {
        p.x += (dx / dist) * speed;
        p.y += (dy / dist) * speed;
        isMoving = true;
      }

      if (dx > 2) setFlipped(false);
      else if (dx < -2) setFlipped(true);
      
      if (agentRef.current) {
        const bob = isMoving ? Math.abs(Math.sin(Date.now() / 150)) * 12 : 0;
        agentRef.current.style.transform = `translate(${p.x}px, ${p.y - bob}px)`;
        agentRef.current.style.zIndex = Math.round(p.y);
      }
      
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div ref={agentRef} style={{
      position: 'absolute', left: -30, top: -75, // offset origin to bottom center
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      willChange: 'transform'
    }}>
      <div style={{ 
        fontSize: 48, marginBottom: -6, zIndex: 2,
        transform: flipped ? 'scaleX(-1)' : 'scaleX(1)', transition: 'transform 0.2s',
        filter: `drop-shadow(0 0 10px ${color})`
      }}>{emoji}</div>
      <div style={{ 
        width: 50, height: 60, background: color, borderRadius: '24px 24px 8px 8px',
        border: '3px solid #000', boxShadow: `inset 0 -10px rgba(0,0,0,0.3), 0 0 20px ${color}60`,
        display: 'flex', justifyContent: 'center', paddingTop: 12, position: 'relative'
      }}>
        <div style={{width: 10, height: 24, background: '#fff', borderRadius: 4}} />
      </div>
      {/* Dynamic Fake Floor Drop Shadow */}
      <div style={{ position: 'absolute', bottom: -12, width: 40, height: 12, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', zIndex: -1, filter: 'blur(2px)'}} />

      <div style={{
        marginTop: 14, background: '#0a0c10', color: '#fff', fontSize: 13, 
        padding: '6px 12px', borderRadius: 14, fontWeight: '900',
        border: `2px solid ${color}`, boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        letterSpacing: '0.5px'
      }}>{name}</div>
    </div>
  );
};

export default function CartoonAgents({ activeStage, processing }) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const int = setInterval(() => setT(Date.now()), 2000);
    return () => clearInterval(int);
  }, []);

  const getTarget = (role) => {
    if (!processing) {
      // Idle: wander around the edges of the room
      if (role === 'research') return { x: 150 + Math.sin(t/1000) * 100, y: 220 + Math.cos(t/1500) * 50 };
      if (role === 'summary') return { x: 550 + Math.cos(t/1200) * 100, y: 240 + Math.sin(t/800) * 60 };
      if (role === 'critique') return { x: 350 + Math.sin(t/1800) * 150, y: 280 + Math.cos(t/1100) * 40 };
    } else {
      // Working: the active agent runs up to the chalkboard
      if (activeStage === role) {
        return { x: 350, y: 180 }; 
      } else {
        // Others back off and observe from the bottom corners safely
        if (role === 'research') return { x: 150, y: 290 }; 
        if (role === 'summary') return { x: 550, y: 290 };
        if (role === 'critique') return { x: 350, y: 320 };
      }
    }
    return { x: 350, y: 200 };
  };

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
      {/* Main Room Viewport */}
      <div style={{
        width: 700, height: 380, background: '#a5d6ff', borderRadius: 20,
        border: '6px solid #30363d', position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)', userSelect: 'none'
      }}>
        {/* Wall */}
        <div style={{ position: 'absolute', top: 0, width: '100%', height: 160, background: '#e6edf3', borderBottom: '6px solid #d0d7de' }}>
          {/* Wall Clock */}
          <div style={{position: 'absolute', top: 20, right: 30, width: 40, height: 40, borderRadius: '50%', border: '4px solid #444c56', background: '#fff' }}>
             <div style={{ position: 'absolute', top: '50%', left: '50%', width: 2, height: 12, background: '#000', transformOrigin: 'top', transform: `rotate(${Date.now() / 100}deg)`}}/>
          </div>
        </div>

        {/* Chalkboard */}
        <div style={{ 
          position: 'absolute', top: 30, left: '50%', marginLeft: -140, width: 280, height: 110, 
          background: '#233026', border: '8px solid #8b6843', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontFamily: 'monospace', fontSize: 13, padding: 16,
          boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
        }}>
          {processing ? (
            <div style={{lineHeight: 1.6}}>
              &gt; ORCHESTRATION ACTIVE<br/>
              &gt; CURRENT STAGE:<br/>
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{activeStage?.toUpperCase() || "INITIALIZING..."}</span>
            </div>
          ) : (
            <div style={{opacity: 0.6}}>
              [ NO ACTIVE DIRECTIVES ]<br/>
              Awaiting query input...
            </div>
          )}
        </div>

        {/* Floor Pattern */}
        <div style={{ position: 'absolute', top: 160, width: '100%', height: 220, background: '#f6f8fa' }}>
          <div style={{ width: '100%', height: '100%', backgroundImage: 'linear-gradient(#e1e4e8 2px, transparent 2px), linear-gradient(90deg, #e1e4e8 2px, transparent 2px)', backgroundSize: '60px 60px' }} />
        </div>
        
        {/* Character Plane */}
        <Agent id="research" name="RESEARCHER" color="#3fb68a" emoji="👩‍🔬" target={getTarget('research')} />
        <Agent id="summary" name="SUMMARIZER" color="#e07840" emoji="👨‍💻" target={getTarget('summary')} />
        <Agent id="critique" name="CRITIC" color="#d4a020" emoji="🕵️‍♂️" target={getTarget('critique')} />

      </div>
    </div>
  );
}
