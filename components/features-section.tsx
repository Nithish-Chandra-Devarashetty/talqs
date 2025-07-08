"use client"

import { motion } from "framer-motion"
import { Brain, Gavel, FileSearch, Sparkles, MessageSquare, VolumeIcon as VolumeUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function FeaturesSection() {
  const features = [
    {
      icon: <FileSearch className="h-10 w-10 text-primary" />,
      title: "Document Analysis",
      description: "Upload and analyze complex legal documents with our advanced AI system.",
    },
    {
      icon: <MessageSquare className="h-10 w-10 text-primary" />,
      title: "Legal Q&A",
      description: "Ask specific questions about your documents and get precise answers.",
    },
    {
      icon: <Brain className="h-10 w-10 text-primary" />,
      title: "AI-Powered Insights",
      description: "Get intelligent insights using our transformer-based architecture.",
    },
    {
      icon: <Gavel className="h-10 w-10 text-primary" />,
      title: "Case Summaries",
      description: "Generate concise summaries of complex legal judgments automatically.",
    },
    {
      icon: <VolumeUp className="h-10 w-10 text-primary" />,
      title: "Text-to-Speech",
      description: "Listen to summaries and answers with natural-sounding voice output.",
    },
    {
      icon: <Sparkles className="h-10 w-10 text-primary" />,
      title: "Legal Precision",
      description: "Designed specifically for legal professionals with accuracy in mind.",
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      id="features"
      className="py-20"
    >
      <div className="text-center mb-16">
        <motion.p
          className="text-sm font-medium text-primary mb-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          FEATURES
        </motion.p>
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Everything you need for legal analysis
        </motion.h2>
        <motion.p
          className="text-muted-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          TALQS combines cutting-edge AI with legal expertise to deliver powerful tools for legal professionals.
        </motion.p>
      </div>

      <motion.div
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto px-4"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
      >
        {features.map((feature, index) => (
          <motion.div key={index} variants={item} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
            <Card className="h-full premium-card">
              <CardContent className="pt-6">
                <motion.div
                  className="mb-4 bg-primary/10 p-3 rounded-full inline-block"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  )
}
