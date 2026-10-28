import { Icon } from "../ui.jsx";

export function TabBar({ t, tab }) {
  const items = [["home", "#home", "home", t.navHome], ["leader", "#leader", "user", t.navLeader], ["complaint", "#complaint", "plus", t.navComplaint], ["track", "#track", "search", t.navTrack], ["contact", "#contact", "phone", t.navContact]];
  return (
    <nav className="tabbar" aria-label="App navigation">
      {items.map(([id, href, d, label]) => (
        <a key={id} href={href} className={(tab === id ? "on " : "") + (id === "complaint" ? "fab" : "")}><Icon n={d} /><span>{label}</span></a>
      ))}
    </nav>
  );
}
