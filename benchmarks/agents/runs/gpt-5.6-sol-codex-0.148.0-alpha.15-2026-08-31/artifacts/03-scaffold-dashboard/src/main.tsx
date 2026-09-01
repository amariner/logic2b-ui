import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { StarterPage } from "@/components/starter-page"
import "@/styles/theme.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StarterPage />
  </StrictMode>
)
