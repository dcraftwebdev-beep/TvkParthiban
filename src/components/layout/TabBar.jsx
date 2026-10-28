import { Icon, P } from "../ui.jsx";

export function TabBar({ t, tab }) {
  const items = [["home", "#home", P.home, t.navHome], ["leader", "#leader", P.user, t.navLeader], ["complaint", "#complaint", P.plus, t.navComplaint], ["track", "#track", P.search, t.navTrack], ["contact", "#contact", P.phone, t.navContact]];
  return (
    <nav className="tabbar" aria-label="App navigation">
      {items.map(([id, href, d, label]) => (
        <a key={id} href={href} className={(tab === id ? "on " : "") + (id === "complaint" ? "fab" : "")}><Icon d={d} /><span>{label}</span></a>
      ))}
    </nav>
  );
}
