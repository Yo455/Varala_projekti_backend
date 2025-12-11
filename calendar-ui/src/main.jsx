import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
//käynnistää React-sovelluksen ja renderöi pääkomponentin App juurielementtiin
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
