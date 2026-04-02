"use client";
import React, { useEffect, useRef } from 'react';

const AGENTS = [
  { id: 'memories', label: 'Memory', color: '#7c6df0' },
  { id: 'research', label: 'Researcher', color: '#3fb68a' },
  { id: 'summary', label: 'Summarizer', color: '#e07840' },
  { id: 'critique', label: 'Critic', color: '#d4a020' },
  { id: 'saved', label: '0G Storage', color: '#5090e0' }
];

export default function AgentCanvas({ activeStage, doneStages = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Generate stars
    const stars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1
    }));

    const render = () => {
      // Draw background
      ctx.fillStyle = '#06090e'; // deep space
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw sliding stars
      ctx.fillStyle = '#ffffff';
      stars.forEach(star => {
        ctx.globalAlpha = star.speed; // depth feel
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.x -= star.speed;
        if (star.x < 0) {
          star.x = canvas.width;
          star.y = Math.random() * canvas.height;
        }
      });
      ctx.globalAlpha = 1.0;

      // Draw grid floor
      ctx.strokeStyle = 'rgba(22, 27, 34, 0.4)';
      ctx.lineWidth = 1;
      const t = (Date.now() / 50) % 20;
      for (let i = 0; i < canvas.width; i += 20) {
         ctx.beginPath();
         ctx.moveTo(i - t, 0);
         ctx.lineTo(i - t, canvas.height);
         ctx.stroke();
      }

      ctx.save();
      ctx.scale(4, 4); // logical resolution 170x55

      const logicalWidth = canvas.width / 4;
      const logicalHeight = canvas.height / 4;

      const spacing = logicalWidth / AGENTS.length;
      const startX = spacing / 2;
      const baseY = logicalHeight / 2 - 4;

      // Draw connecting lines
      ctx.strokeStyle = '#444c56';
      ctx.lineDashOffset = -(Date.now() / 20) % 10; // animated dashes
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      
      for(let i = 0; i < AGENTS.length - 1; i++) {
        const x1 = startX + i * spacing;
        const x2 = startX + (i + 1) * spacing;
        ctx.beginPath();
        ctx.moveTo(x1 + 6, baseY + 6);
        ctx.lineTo(x2 - 6, baseY + 6);
        ctx.stroke();
      }

      // Draw agents
      AGENTS.forEach((agent, i) => {
        const x = Math.round(startX + i * spacing);
        let y = Math.round(baseY);

        const isActive = activeStage === agent.id;
        const isDone = doneStages.includes(agent.id);

        let swing = 0;
        if (isActive) {
          y += Math.round(Math.sin(Date.now() / 120) * 3); // Bob higher
          swing = Math.round(Math.sin(Date.now() / 80) * 2); // Swing limbs iteratively
        } else if (isDone) {
          y -= 2; // Fixed float upright
        }

        const color = isDone ? '#4ade80' : agent.color;

        // Pulsing glow for active
        if (isActive) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = color;

        // Head (6x6)
        ctx.fillRect(x - 3, y - 4, 6, 6);
        
        // Body (8x8)
        ctx.fillRect(x - 4, y + 2, 8, 8);
        
        ctx.shadowBlur = 0; // Turn off glow for limbs cleanly
        
        // Left Arm (2x6)
        ctx.fillRect(x - 6, y + 2 - swing, 2, 6);
        // Right Arm (2x6)
        ctx.fillRect(x + 4, y + 2 + swing, 2, 6);
        
        // Left Leg (2x6)
        ctx.fillRect(x - 3, y + 10 + swing, 2, 6);
        // Right Leg (2x6)
        ctx.fillRect(x + 1, y + 10 - swing, 2, 6);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeStage, doneStages]);

  return (
    <canvas 
      ref={canvasRef}
      width={680}
      height={220}
      style={{ 
        width: '100%', 
        maxWidth: '750px',
        imageRendering: 'pixelated', 
        borderRadius: '16px',
        border: '1px solid #30363d',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'block',
        margin: '0 auto',
        background: '#06090e'
      }}
    />
  );
}
