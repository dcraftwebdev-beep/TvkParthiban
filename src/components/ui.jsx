import { LuHouse, LuUser, LuPlus, LuSearch, LuPhone, LuMic, LuMapPin, LuCamera, LuCheck, LuCopy, LuX, LuChevronDown, LuChevronLeft, LuArrowUpRight, LuBell, LuDownload, LuRoute, LuDroplets, LuWaves, LuLightbulb, LuTrash2, LuZap, LuEllipsis, LuPointer, LuChevronRight, LuToilet, LuBug, LuDog, LuConstruction, LuTreePine, LuTrees, LuBus, LuShieldAlert } from "react-icons/lu";
import { FaWhatsapp, FaInstagram, FaFacebookF } from "react-icons/fa6";
import { CFG } from "../lib/config.js";
import { useCount } from "../hooks/index.js";

export const wa = text => `https://wa.me/${CFG.phone}${text ? "?text=" + encodeURIComponent(text) : ""}`;

/* Icons come from react-icons: Lucide (Lu) for interface icons, Font Awesome 6 (Fa) for brand logos. */
const ICONS = {
  home: LuHouse, user: LuUser, plus: LuPlus, search: LuSearch, phone: LuPhone, mic: LuMic, pin: LuMapPin, cam: LuCamera,
  tick: LuCheck, copy: LuCopy, x: LuX, down: LuChevronDown, back: LuChevronLeft, out: LuArrowUpRight, bell: LuBell, download: LuDownload,
  road: LuRoute, water: LuDroplets, drain: LuWaves, light: LuLightbulb, trash: LuTrash2, power: LuZap, other: LuEllipsis, tap: LuPointer, right: LuChevronRight,
  toilet: LuToilet, health: LuBug, animal: LuDog, encroach: LuConstruction, tree: LuTreePine, park: LuTrees, bus: LuBus, safety: LuShieldAlert,
  wa: FaWhatsapp, ig: FaInstagram, fb: FaFacebookF
};
export const Icon = ({ n, size = 22 }) => {
  const C = ICONS[n];
  const brand = n === "wa" || n === "ig" || n === "fb";
  return C ? <C className="ic" size={size} aria-hidden="true" {...(brand ? {} : { strokeWidth: 2 })} /> : null;
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

