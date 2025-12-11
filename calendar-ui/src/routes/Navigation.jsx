import { NavLink } from "react-router-dom";
import "../styles/App.scss";

export default function Navigation() {
  //palauttaa navigaatiokomponentin, joka sisältää linkit eri reitteihin, tämän avulla käyttäjä voi navigoida sovelluksen eri osiin
  return (
    <nav className="navigation">
        <NavLink to="/">Login</NavLink>
        <NavLink to="/frontpage">Front Page</NavLink>
        <NavLink to="/ilmoitukset">Ilmoitukset</NavLink>
        <NavLink to="tehtavat">Tehtävät</NavLink>
        <NavLink to="viestit">Viestit</NavLink>
    </nav>
  );
}