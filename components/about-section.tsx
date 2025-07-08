"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Scale, Gavel, FileText, BookOpen, Sparkles, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.section
      ref={sectionRef}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      id="about"
      className="py-32 relative mt-24"
    >
      <div className="absolute inset-0 gradient-bg-subtle rounded-3xl -z-10 opacity-80"></div>

      {/* Animated background elements */}
      <div className="absolute top-20 left-20 w-64 h-64 blur-circle opacity-30"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 blur-circle opacity-30"></div>

      <div className="text-center mb-16">
        <motion.p variants={itemVariants} className="text-sm font-medium text-[#38b6ff] mb-2">
          ABOUT US
        </motion.p>
        <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4" style={{
          background: "linear-gradient(to right, #38b6ff, #8e2de2)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "transparent"
        }}>
          About TALQS
        </motion.h2>
        <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
          Learn more about our AI-powered legal assistant platform and the technology behind it.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto px-4 mt-8">
        <motion.div variants={itemVariants}>
          <Card className="h-full premium-card">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold mb-4" style={{
                background: "linear-gradient(to right, #38b6ff, #8e2de2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent"
              }}>Our Mission</h3>
              <p className="text-muted-foreground mb-6">
                Our mission at TALQS is to revolutionize legal research by harnessing the power of AI to simplify complex legal documents and provide accurate, concise summaries and answers. We aim to bridge the gap between legal professionals and technology, making legal information more accessible, reliable, and actionable.
              </p>
              <p className="text-muted-foreground mb-6">
                By fine-tuning models specifically for Indian legal texts, TALQS ensures context-aware understanding and precision. Our commitment lies in enhancing efficiency, reducing research time, and supporting informed legal decision-making.
              </p>
              <p className="text-muted-foreground">
                Ultimately, TALQS strives to empower legal practitioners, courts, and researchers through intelligent automation.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full premium-card">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold mb-4" style={{
                background: "linear-gradient(to right, #38b6ff, #8e2de2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent"
              }}>The Technology</h3>
              <p className="text-muted-foreground mb-6">
                At the core of TALQS is our proprietary transformer-based architecture specifically trained on millions
                of legal documents, judgments, and precedents from multiple jurisdictions.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-start gap-3">
                  <div className="bg-[#38b6ff]/10 p-2 rounded-full">
                    <Scale className="h-5 w-5 text-[#38b6ff]" />
                  </div>
                  <div>
                    <h4 className="font-medium">Legal Precision</h4>
                    <p className="text-sm text-muted-foreground">Domain-specific training</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#38b6ff]/10 p-2 rounded-full">
                    <Gavel className="h-5 w-5 text-[#38b6ff]" />
                  </div>
                  <div>
                    <h4 className="font-medium">Case Analysis</h4>
                    <p className="text-sm text-muted-foreground">Precedent recognition</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#38b6ff]/10 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-[#38b6ff]" />
                  </div>
                  <div>
                    <h4 className="font-medium">Document Processing</h4>
                    <p className="text-sm text-muted-foreground">Intelligent text extraction</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#38b6ff]/10 p-2 rounded-full">
                    <BookOpen className="h-5 w-5 text-[#38b6ff]" />
                  </div>
                  <div>
                    <h4 className="font-medium">Knowledge Base</h4>
                    <p className="text-sm text-muted-foreground">Extensive legal corpus</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="premium-card glow-border">
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold mb-4" style={{
                background: "linear-gradient(to right, #38b6ff, #8e2de2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent"
              }}>How TalQS Works</h3>
              <p className="text-muted-foreground mb-6">
                TalQS leverages advanced AI technology to transform how legal professionals interact with complex documents. 
                Our platform combines natural language processing with legal domain expertise to deliver unprecedented 
                efficiency and accuracy.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 mt-8">
                <div className="text-center bg-black/20 p-5 rounded-xl backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#38b6ff] to-[#8e2de2] mx-auto mb-4 flex items-center justify-center shadow-glow-sm">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-semibold" style={{
                    background: "linear-gradient(to right, #38b6ff, #8e2de2)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent"
                  }}>Document Analysis</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload any legal document and TalQS will instantly analyze its structure, key clauses, and legal implications.
                  </p>
                </div>
                
                <div className="text-center bg-black/20 p-5 rounded-xl backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#38b6ff] to-[#8e2de2] mx-auto mb-4 flex items-center justify-center shadow-glow-sm">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-semibold" style={{
                    background: "linear-gradient(to right, #38b6ff, #8e2de2)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent"
                  }}>AI-Powered Summaries</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Generate concise, accurate summaries of complex legal documents with our custom-built summarization model.
                  </p>
                </div>
                
                <div className="text-center bg-black/20 p-5 rounded-xl backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#38b6ff] to-[#8e2de2] mx-auto mb-4 flex items-center justify-center shadow-glow-sm">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-semibold" style={{
                    background: "linear-gradient(to right, #38b6ff, #8e2de2)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent"
                  }}>Interactive Q&A</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ask questions about your documents in natural language and receive accurate, contextual answers instantly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  )
}
