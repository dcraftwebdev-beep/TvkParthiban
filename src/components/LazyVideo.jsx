import { useEffect, useRef, useState } from "react";

/** A muted looping video that only starts downloading once it is close to the screen. */
export function LazyVideo({ src, ...rest }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: "300px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={on ? src : undefined} autoPlay muted loop playsInline preload="none" {...rest} />;
}
