'use client';

import React, { useRef, useEffect } from 'react';

interface NodePoint {
  id: string;
  name: string;
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
  isHighRisk?: boolean;
  elevation: number;
}

interface Particle {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

export default function TerrainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let isVisible = true;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Northeast Strategic Hub Nodes (Normalized 0.0 - 1.0)
    const nodes: NodePoint[] = [
      { id: 'gau', name: 'Guwahati', x: 0.38, y: 0.52, elevation: 55 },
      { id: 'tez', name: 'Tezpur', x: 0.52, y: 0.46, elevation: 79 },
      { id: 'shl', name: 'Shillong', x: 0.40, y: 0.64, elevation: 1496 },
      { id: 'ita', name: 'Itanagar', x: 0.65, y: 0.38, elevation: 750 },
      { id: 'taw', name: 'Tawang', x: 0.44, y: 0.28, isHighRisk: true, elevation: 3048 },
      { id: 'koh', name: 'Kohima', x: 0.74, y: 0.56, isHighRisk: true, elevation: 1444 },
      { id: 'imp', name: 'Imphal', x: 0.72, y: 0.72, elevation: 786 },
      { id: 'aiz', name: 'Aizawl', x: 0.56, y: 0.82, elevation: 1132 },
      { id: 'agt', name: 'Agartala', x: 0.34, y: 0.80, elevation: 15 },
      { id: 'gtk', name: 'Gangtok', x: 0.16, y: 0.42, elevation: 1650 },
    ];

    // Corridors Connecting Hubs
    const connections: [number, number][] = [
      [0, 1], // Guwahati - Tezpur (NH-27)
      [1, 3], // Tezpur - Itanagar (NH-13)
      [1, 4], // Tezpur - Tawang (NH-13 Mountain Pass)
      [0, 2], // Guwahati - Shillong (NH-06)
      [0, 8], // Guwahati - Agartala
      [1, 5], // Tezpur - Kohima via Dimapur
      [5, 6], // Kohima - Imphal (NH-29)
      [2, 7], // Shillong - Aizawl
      [0, 9], // Guwahati - Gangtok (Siliguri corridor)
    ];

    // Moving Logistics Data Particles
    const particles: Particle[] = [
      { fromIdx: 0, toIdx: 1, progress: 0.1, speed: 0.003, color: '#14b8a6' },
      { fromIdx: 1, toIdx: 4, progress: 0.4, speed: 0.0022, color: '#f59e0b' },
      { fromIdx: 1, toIdx: 3, progress: 0.6, speed: 0.0028, color: '#a855f7' },
      { fromIdx: 0, toIdx: 2, progress: 0.2, speed: 0.0035, color: '#14b8a6' },
      { fromIdx: 5, toIdx: 6, progress: 0.7, speed: 0.0025, color: '#ef4444' },
      { fromIdx: 2, toIdx: 7, progress: 0.3, speed: 0.0027, color: '#14b8a6' },
    ];

    const resize = () => {
      if (!canvas) return;
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Pause when scrolled out of view to save battery & GPU cycles (Section 19)
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    let time = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let currentOffsetX = 0;
    let currentOffsetY = 0;

    // Subtle 5-8px desktop mouse parallax (Section 6)
    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion || window.innerWidth < 768) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1; // -1 to 1
      const normY = (e.clientY / window.innerHeight) * 2 - 1; // -1 to 1
      targetOffsetX = normX * 7; // Max 7px horizontal shift
      targetOffsetY = normY * 5; // Max 5px vertical shift
    };

    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    const render = () => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      time += 0.008;

      // Smooth damped parallax interpolation
      currentOffsetX += (targetOffsetX - currentOffsetX) * 0.04;
      currentOffsetY += (targetOffsetY - currentOffsetY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Save context state for parallax offset
      ctx.save();
      ctx.translate(currentOffsetX, currentOffsetY);

      // 1. Subtle Cartographic Grid Overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Smoothly Drifting Topographic Elevation Contour Lines
      const contourCount = 6;
      for (let c = 0; c < contourCount; c++) {
        const offset = c * 50;
        const alpha = 0.03 + (c / contourCount) * 0.03;
        ctx.strokeStyle = `rgba(20, 184, 166, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();

        for (let x = 0; x <= width; x += 30) {
          const nx = x / width;
          // Mathematical undulating terrain waves
          const wave1 = Math.sin(nx * 4 + time + c * 0.6) * 35;
          const wave2 = Math.cos(nx * 7 - time * 0.8 + c) * 20;
          const wave3 = Math.sin(nx * 12 + time * 0.5) * 10;
          const y = height * 0.35 + offset + wave1 + wave2 + wave3;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 3. Connective Route Paths (Corridors)
      connections.forEach(([from, to]) => {
        const p1 = nodes[from];
        const p2 = nodes[to];
        const x1 = p1.x * width;
        const y1 = p1.y * height;
        const x2 = p2.x * width;
        const y2 = p2.y * height;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 4. Moving Logistics Data Packets along routes
      if (!prefersReducedMotion) {
        particles.forEach((p) => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;

          const p1 = nodes[p.fromIdx];
          const p2 = nodes[p.toIdx];
          const curX = (p1.x + (p2.x - p1.x) * p.progress) * width;
          const curY = (p1.y + (p2.y - p1.y) * p.progress) * height;

          // Glowing particle head
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // 5. Geographic Terrain Nodes
      nodes.forEach((n) => {
        const nx = n.x * width;
        const ny = n.y * height;

        // Subtle Restrained Weather / Risk Pulse for high-elevation or high-risk nodes (Tawang, Kohima)
        if (n.isHighRisk && !prefersReducedMotion) {
          const pulseRadius = 14 + Math.sin(time * 2 + n.x * 10) * 6;
          const pulseOpacity = 0.25 - (pulseRadius - 8) * 0.015;
          ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0.05, pulseOpacity)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(nx, ny, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Inner glowing core
        ctx.fillStyle = n.isHighRisk ? '#f59e0b' : '#14b8a6';
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Subtle Outer Ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nx, ny, 7, 0, Math.PI * 2);
        ctx.stroke();

        // Node Label
        ctx.fillStyle = 'rgba(248, 250, 252, 0.65)';
        ctx.font = '9px monospace';
        ctx.fillText(n.name, nx + 10, ny + 3);
      });

      ctx.restore();

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(); // Single static render
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full opacity-70"
      aria-hidden="true"
    />
  );
}
