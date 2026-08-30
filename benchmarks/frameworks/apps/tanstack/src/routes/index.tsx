import { createFileRoute } from "@tanstack/react-router"

import { BenchmarkScenario } from "../../../../shared/Scenario"

export const Route = createFileRoute("/")({ component: BenchmarkScenario })
