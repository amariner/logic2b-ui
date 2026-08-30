import React from "react"
import { createRoot } from "react-dom/client"

import { BenchmarkScenario } from "../../../shared/Scenario"
import "../../../shared/styles.css"

createRoot(document.getElementById("root")!).render(<BenchmarkScenario />)
