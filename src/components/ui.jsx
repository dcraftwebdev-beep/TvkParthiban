import { CFG } from "../lib/config.js";
import { useCount } from "../hooks/index.js";

export const wa = text => `https://wa.me/${CFG.phone}${text ? "?text=" + encodeURIComponent(text) : ""}`;

export const Icon = ({ d, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className="ic" aria-hidden="true"><path d={d} /></svg>
);

export const P = {
  home: "M4 11l8-7 8 7v9H4z", plus: "M12 5v14M5 12h14", search: "M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM20 20l-4.2-4.2",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  mic: "M9 3h6v12H9zM5 11a7 7 0 0 0 14 0M12 18v3", chat: "M4 20l1.4-4.2A8 8 0 1 1 8.3 18.7L4 20z",
  pin: "M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  cam: "M3 7h4l2-2h6l2 2h4v12H3zM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z", tick: "M5 12.5l4.5 4.5L19 7.5",
  plus2: "M12 5v14M5 12h14", copy: "M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10", user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  scale: "M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z", heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10z",
  dove: "M4 14c4 0 6-3 8-6 1 3 3 4 8 4-1 5-5 8-10 8-3 0-5-2-6-6z", hand: "M7 11V6a1.500 1.500 0 0 1 3 0v4m0-1V4.500a1.500 1.500 0 0 1 3 0V10m0-1.500a1.500 1.500 0 0 1 3 0V14c0 4-2 7-6 7-3 0-4.500-2-6-5l-1-2a1.500 1.500 0 0 1 2.500-1.500L7 14"
};

export const Flag = () => <img className="flagimg" src="/flag.jpg" alt="" aria-hidden="true" />;

export function Head({ eyebrow, title, sub, dark }) {
  return (
    <div className={"sec-head rv" + (dark ? " on-dark" : "")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {sub && <p className="sub">{sub}</p>}
    </div>
  );
}

export function Stat({ to, label, run }) {
  const n = useCount(to, run);
  return <div className="stat"><b>{n}</b><span>{label}</span></div>;
}

export function WaGlyph({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M12 2a9.900 9.900 0 0 0-8.500 14.900L2 22l5.300-1.400A9.900 9.900 0 1 0 12 2zm0 1.800a8.100 8.100 0 1 1-4.200 15l-.3-.2-3 .8.8-2.900-.2-.3A8.100 8.100 0 0 1 12 3.800zM8.600 7.600c-.2 0-.5 0-.7.300-.3.300-1 1-1 2.400s1 2.800 1.200 3c.1.200 2 3.200 5 4.400 2.500 1 3 .8 3.500.7.600-.1 1.800-.7 2-1.400.3-.7.300-1.300.2-1.400-.1-.1-.3-.2-.7-.4l-1.900-.9c-.3-.1-.5-.1-.7.100l-.9 1.100c-.2.200-.3.200-.7.100-.3-.2-1.300-.5-2.400-1.500-.9-.8-1.500-1.800-1.700-2.100-.2-.3 0-.5.100-.6l.5-.6.300-.5c.1-.2 0-.4 0-.5l-.9-2.100c-.2-.5-.4-.4-.6-.4z" />
    </svg>
  );
}
