"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Senior Partner, Johnson & Associates",
      content:
        "TALQS has revolutionized how we analyze case documents. What used to take hours now takes minutes, with even better insights.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Legal Researcher",
      content: "The Q&A feature is incredibly accurate. It's like having a legal research assistant available 24/7.",
      rating: 5,
    },
    {
      name: "Rebecca Torres",
      role: "Corporate Counsel",
      content:
        "We've integrated TALQS into our document review process, and it's been a game-changer for our efficiency.",
      rating: 4,
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
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
          TESTIMONIALS
        </motion.p>
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Trusted by Legal Professionals
        </motion.h2>
        <motion.p
          className="text-muted-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          See what legal professionals are saying about TALQS
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="premium-card p-6"
          >
            <div className="flex mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              ))}
              {[...Array(5 - testimonial.rating)].map((_, i) => (
                <Star key={i + testimonial.rating} className="h-5 w-5 text-gray-300" />
              ))}
            </div>
            <p className="mb-4">{testimonial.content}</p>
            <div className="mt-auto">
              <p className="font-semibold">{testimonial.name}</p>
              <p className="text-sm text-muted-foreground">{testimonial.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
