import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./i18n/media.js";
import "./styles/fonts.css";
import "./styles/base.css";
import "./styles/sections.css";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(<App />);
