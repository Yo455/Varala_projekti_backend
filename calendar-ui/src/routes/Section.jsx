import { NavLink } from "react-router-dom";
import "../styles/app.scss";

export default function Section({ onOpenContacts }) {
  return (
    <nav className="sections">
        <NavLink to="/frontpage">Yhteenveto</NavLink>
        <NavLink to="/frontpage">Profiili</NavLink>
        <NavLink to="/ilmoitukset">Kalenteri</NavLink>
        <NavLink to="tehtavat">Opinnot</NavLink>
        <button onClick={onOpenContacts}>Kontaktit</button>
        <NavLink to="hyvinvointi">Hyvinvointi</NavLink>
        <NavLink to="viestit">Viestit</NavLink>
    </nav>
  );
}