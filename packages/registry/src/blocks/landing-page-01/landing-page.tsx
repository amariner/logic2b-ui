import { Cta } from "@/registry/blocks/cta-01/cta"
import { FeatureGrid } from "@/registry/blocks/feature-grid-01-animated/feature-grid"
import { Footer } from "@/registry/blocks/footer-01/footer"
import { Hero } from "@/registry/blocks/hero-01-animated/hero"
import { Navbar } from "@/registry/blocks/navbar-01/navbar"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <FeatureGrid />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
