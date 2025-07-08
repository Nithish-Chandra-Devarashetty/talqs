import Hero from "@/components/hero"
import UploadSection from "@/components/upload-section"
import QASection from "@/components/qa-section"
import TextToSpeechSection from "@/components/text-to-speech-section"
import Footer from "@/components/footer"
import Navbar from "@/components/navbar"
import FeaturesSection from "@/components/features-section"
import AboutSection from "@/components/about-section"

export default function Home() {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="noise"></div>
      <Navbar />
      <Hero />
      <div className="container mx-auto px-4 py-12 space-y-48">
        <FeaturesSection />
        <UploadSection />
        <QASection />
        <TextToSpeechSection />
        <AboutSection />
      </div>
      <Footer />
    </div>
  )
}
