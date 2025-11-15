import { BrowserRouter } from "react-router-dom";
import './styles/main.scss';
import AppRoutes from "./routes/AppRoutes";

export default function App() {

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>

  );

}

