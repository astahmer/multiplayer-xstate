import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

import "@fontsource/prompt";
import "./styles.css";

createRoot(document.getElementById("app")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
