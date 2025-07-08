"use client"

import { useState, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Settings, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export default function TextToSpeechSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState("en-US-Neural2-F")
  const [progress, setProgress] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 })
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)

    if (!isPlaying) {
      // Simulate progress when playing
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (progressInterval.current) clearInterval(progressInterval.current)
            setIsPlaying(false)
            return 0
          }
          return prev + 0.5
        })
      }, 100)
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value)
  }

  const resetProgress = () => {
    setProgress(0)
    setIsPlaying(false)
    if (progressInterval.current) clearInterval(progressInterval.current)
  }

  const skipForward = () => {
    setProgress((prev) => Math.min(prev + 10, 100))
  }

  const skipBackward = () => {
    setProgress((prev) => Math.max(prev - 10, 0))
  }

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
      id="tts"
      className="py-20 relative"
    >
      <div className="absolute inset-0 gradient-bg-subtle rounded-3xl -z-10"></div>

      <div className="text-center mb-16">
        <motion.p variants={itemVariants} className="text-sm font-medium text-primary mb-2">
          TEXT-TO-SPEECH
        </motion.p>
        <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
          Listen to Your Legal Documents
        </motion.h2>
        <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
          Convert legal text to natural-sounding speech with our advanced text-to-speech technology.
        </motion.p>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="max-w-3xl mx-auto premium-card glow-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" />
                Text-to-Speech Player
              </CardTitle>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <AlertCircle className="h-5 w-5" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 glass shadow-glow-sm">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Text-to-Speech Section</h4>
                    <p className="text-sm">
                      Listen to your legal documents with our natural-sounding text-to-speech technology. Adjust volume,
                      select different voices, and control playback.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Audio visualization */}
              <div className="h-24 bg-muted/30 backdrop-blur-sm rounded-lg flex items-center justify-center overflow-hidden">
                <div className="flex items-end justify-center gap-1 h-full w-full px-4">
                  {Array.from({ length: 40 }).map((_, i) => {
                    const height = isPlaying ? Math.random() * 60 + 10 : Math.sin((i / 40) * Math.PI) * 40 + 20

                    return (
                      <motion.div
                        key={i}
                        className="w-1.5 bg-primary/60 rounded-full"
                        animate={{ height: `${height}%` }}
                        transition={{
                          duration: 0.4,
                          repeat: isPlaying ? Number.POSITIVE_INFINITY : 0,
                          repeatType: "reverse",
                          ease: "easeInOut",
                          delay: i * 0.01,
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <Slider
                  value={[progress]}
                  max={100}
                  step={0.1}
                  className="cursor-pointer"
                  onValueChange={(value) => setProgress(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {Math.floor((progress / 100) * 3)}:
                    {Math.floor(((progress / 100) * 180) % 60)
                      .toString()
                      .padStart(2, "0")}
                  </span>
                  <span>3:00</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={skipBackward}>
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className={`rounded-full h-14 w-14 ${
                    isPlaying ? "bg-primary hover:bg-primary/90" : "btn-premium glow-primary"
                  }`}
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                    >
                      <Play className="h-6 w-6" />
                    </motion.div>
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={skipForward}>
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Voice</label>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US-Neural2-F">Emma (Female)</SelectItem>
                      <SelectItem value="en-US-Neural2-M">Michael (Male)</SelectItem>
                      <SelectItem value="en-GB-Neural2-F">Sophia (British)</SelectItem>
                      <SelectItem value="en-AU-Neural2-M">James (Australian)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Volume</label>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={(value) => {
                      setVolume(value[0])
                      if (value[0] > 0 && isMuted) setIsMuted(false)
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.section>
  )
}
