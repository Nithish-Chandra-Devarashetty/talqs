"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, Scale, Gavel, FileText, BookOpen, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 500], [0, 150])
  const y2 = useTransform(scrollY, [0, 500], [0, -150])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative pt-32 pb-40 overflow-hidden" id="home" ref={heroRef}>
      {/* Background gradient */}
      <div className="absolute inset-0 animated-gradient opacity-20 -z-10"></div>

      {/* Animated background shapes */}
      <motion.div style={{ y: y1 }} className="absolute top-1/4 left-5 w-64 h-64 blur-circle" />
      <motion.div style={{ y: y2 }} className="absolute bottom-10 right-5 w-96 h-96 blur-circle" />
      <motion.div style={{ y: y1 }} className="absolute top-1/2 right-1/5 w-32 h-32 blur-circle" />
      <motion.div style={{ y: y2 }} className="absolute bottom-1/3 left-1/5 w-48 h-48 blur-circle" />

      <div className="container mx-auto px-4">
        <motion.div style={{ opacity }} className="max-w-4xl mx-auto text-center">
          {/* Animated icon */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2,
            }}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              <div
                className="absolute -top-12 -left-12 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center floating"
                style={{ animationDelay: "-1.5s" }}
              >
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center pulse-glow">
                <Scale className="h-10 w-10 text-primary" />
              </div>
              <div
                className="absolute -bottom-10 -right-10 w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center floating"
                style={{ animationDelay: "-0.7s" }}
              >
                <Gavel className="h-7 w-7 text-primary" />
              </div>
              <div
                className="absolute top-0 right-12 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center floating"
                style={{ animationDelay: "-2.2s" }}
              >
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div
                className="absolute -bottom-2 -left-10 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center floating"
                style={{ animationDelay: "-3s" }}
              >
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <span className="gradient-text">AI-Powered</span> Legal Analysis
          </motion.h1>

          {/* Subheading */}
          <motion.p
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            Upload legal documents, ask specific questions, and get instant summaries with voice output using our
            advanced transformer-based architecture.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <Link href="/auth?tab=signup">
              <Button size="lg" className="gap-2 btn-premium glow-primary">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="glass">
              Watch Demo
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating elements for visual interest without causing overlap */}
      <motion.div
        style={{ y: y1 }}
        className="absolute bottom-32 left-1/4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center floating hidden lg:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1, delay: 0.8 }}
      >
        <div className="flex items-center justify-center w-full h-full">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
      </motion.div>
      <motion.div
        style={{ y: y2 }}
        className="absolute bottom-40 right-1/4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center floating hidden lg:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <div className="flex items-center justify-center w-full h-full">
          <BookOpen className="h-6 w-6 text-primary" />
        </div>
      </motion.div>
    </div>
  )
}
