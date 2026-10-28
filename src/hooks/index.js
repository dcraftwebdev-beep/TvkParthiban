import { useEffect, useRef, useState } from "react";

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".rv");
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  });
}

export function useCount(to, run) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf, t0;
    const step = t => { t0 ??= t; const p = Math.min(1, (t - t0) / 1100); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return n;
}

export function useInView() {
  const ref = useRef(null); const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, v];
}
