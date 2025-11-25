import { NavLink } from "react-router-dom";
import "../styles/App.scss";

export default function Section() {
  return (
    <nav className="sections">
        <NavLink to="/frontpage">Yhteenveto</NavLink>
        <NavLink to="/frontpage">Profiili</NavLink>
        <NavLink to="/ilmoitukset">Kalenteri</NavLink>
        <NavLink to="tehtavat">Opinnot</NavLink>
        <NavLink to="Hyvinvointi">Kontaktit</NavLink>
        <NavLink to="Kontaktit">Hyvinvointi</NavLink>
        <NavLink to="viestit">Viestit</NavLink>
    </nav>
  );
}