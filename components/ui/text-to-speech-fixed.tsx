"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TextToSpeechProps {
  text: string
  className?: string
  compact?: boolean
}

export function TextToSpeech({ text, className = "", compact = false }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentPosition, setCurrentPosition] = useState(0)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  
  // Refs for managing speech synthesis
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const startTimeRef = useRef<number>(0)
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null)

  // Initialize speech synthesis and load available voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
      
      // Force cancel any existing speech
      speechSynthesisRef.current.cancel();
      
      // Load voices and set up voice change listener
      const loadVoices = () => {
        const voices = speechSynthesisRef.current?.getVoices() || [];
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        if (voices.length > 0) {
          setAvailableVoices(voices);
          
          // Prefer Microsoft voices, then English voices
          const microsoftVoice = voices.find(v => 
            v.name.includes('Microsoft') && v.name.includes('David')
          );
          const englishVoice = voices.find(v => v.lang.startsWith('en'));
          const defaultVoice = microsoftVoice || englishVoice || voices[0];
          
          if (defaultVoice) {
            console.log('Setting default voice to:', defaultVoice.name);
            setSelectedVoice(defaultVoice.voiceURI);
          }
        }
      };
      
      // Load voices immediately and also set listener for when voices change
      loadVoices();
      speechSynthesisRef.current.onvoiceschanged = loadVoices;
      
      // Estimate duration based on word count (rough approximation)
      const wordCount = text.split(/\s+/).length;
      const estimatedDuration = Math.max(1, Math.ceil(wordCount / 2.5));
      setDuration(estimatedDuration);
      
      // Cleanup function
      return () => {
        if (speechSynthesisRef.current) {
          speechSynthesisRef.current.cancel();
        }
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [text]);

  // Calculate text to speak from a specific position
  const getTextFromPosition = (fullText: string, position: number): string => {
    // If at the beginning, use full text
    if (position <= 0) return fullText;
    
    // If at the end, return empty string
    if (position >= duration) return "";
    
    // Calculate approximately how many words have been spoken
    const wordsPerSecond = 2.5; // Average speaking rate
    const wordsSpoken = Math.floor(position * wordsPerSecond);
    
    // Get remaining text
    const words = fullText.split(/\s+/);
    if (wordsSpoken >= words.length) return "";
    
    return words.slice(wordsSpoken).join(" ");
  };

  // Update progress bar in real-time
  const updateProgress = () => {
    if (!isPlaying || !startTimeRef.current) return;
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const percent = Math.min(100, (elapsed / duration) * 100);
    
    setProgress(percent);
    setCurrentPosition(elapsed);
    
    // Check if we've reached the end
    if (percent >= 100) {
      stopSpeech();
      setProgress(100);
      setCurrentPosition(duration);
    }
  };

  // Create and configure a speech utterance
  const createUtterance = (textToSpeak: string, startPosition: number = 0): SpeechSynthesisUtterance => {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Set voice
    if (selectedVoice) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoice);
      if (voice) {
        console.log('Using voice:', voice.name);
        utterance.voice = voice;
      }
    }
    
    // Set volume (0 if muted, otherwise use volume setting)
    utterance.volume = isMuted ? 0 : volume / 100;
    console.log(`Setting utterance volume to: ${utterance.volume}`);
    
    // Set event handlers
    utterance.onstart = () => {
      console.log('Speech started');
      startTimeRef.current = Date.now() - (startPosition * 1000);
    };
    
    utterance.onend = () => {
      console.log('Speech ended normally');
      setIsPlaying(false);
      setProgress(100);
      setCurrentPosition(duration);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
    
    return utterance;
  };

  // Start speaking from a specific position
  const startSpeaking = (position: number = 0) => {
    if (!speechSynthesisRef.current) return;
    
    // Cancel any current speech
    stopSpeech();
    
    // Get text to speak based on position
    const textToSpeak = getTextFromPosition(text, position);
    if (!textToSpeak) {
      console.log('No text to speak');
      return;
    }
    
    // Create and configure utterance
    const utterance = createUtterance(textToSpeak, position);
    utteranceRef.current = utterance;
    
    // Start speaking
    speechSynthesisRef.current.speak(utterance);
    
    // Start progress tracking
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(updateProgress, 50);
    
    setIsPlaying(true);
  };

  // Stop all speech
  const stopSpeech = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setIsPlaying(false);
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      stopSpeech();
    } else {
      // If at the end, start from beginning
      if (progress >= 100) {
        setProgress(0);
        setCurrentPosition(0);
        startSpeaking(0);
      } else {
        // Otherwise continue from current position
        startSpeaking(currentPosition);
      }
    }
  };

  // Handle seeking to a specific position
  const handleSeek = (value: number[]) => {
    if (!value.length) return;
    
    const seekPercent = value[0];
    const seekTime = (seekPercent / 100) * duration;
    
    // Update UI immediately
    setProgress(seekPercent);
    setCurrentPosition(seekTime);
    
    // If currently playing, restart from new position
    if (isPlaying) {
      startSpeaking(seekTime);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // If currently playing, restart with new volume setting
    if (isPlaying) {
      startSpeaking(currentPosition);
    }
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!value.length) return;
    
    const newVolume = value[0];
    setVolume(newVolume);
    
    // If volume is set to 0, mute the audio
    if (newVolume === 0) {
      setIsMuted(true);
    } 
    // If volume is increased from 0, unmute
    else if (isMuted && newVolume > 0) {
      setIsMuted(false);
    }
    
    // If currently playing, restart with new volume
    if (isPlaying) {
      startSpeaking(currentPosition);
    }
  };

  // Handle voice change
  const handleVoiceChange = (value: string) => {
    console.log(`Voice changed to: ${value}`);
    setSelectedVoice(value);
    
    // If currently playing, restart with new voice
    if (isPlaying) {
      startSpeaking(currentPosition);
    }
  };

  // Skip to beginning
  const skipBackward = () => {
    stopSpeech();
    setProgress(0);
    setCurrentPosition(0);
  };

  // Skip to end
  const skipForward = () => {
    stopSpeech();
    setProgress(100);
    setCurrentPosition(duration);
  };

  // Format time for display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatted times for display
  const currentTime = formatTime(currentPosition);
  const totalTime = formatTime(duration);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Audio visualization - only show in non-compact mode */}
          {!compact && (
            <div className="h-16 bg-background/50 rounded-md overflow-hidden flex items-center justify-center">
              <div className="flex items-end h-12 space-x-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  const height = Math.max(4, Math.sin((i + 1) * 0.3) * 40 + Math.random() * 10);
                  return (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary/60 rounded-full"
                      style={{ height: isPlaying ? height : 4 }}
                      animate={{ height: isPlaying ? [height, height + 10, height] : 4 }}
                      transition={{
                        duration: 0.8,
                        repeat: isPlaying ? Infinity : 0,
                        repeatType: "reverse",
                        delay: i * 0.05,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Interactive progress bar with seeking */}
          <div className="space-y-1">
            <Slider
              value={[progress]}
              max={100}
              step={1}
              onValueChange={handleSeek}
              className="h-2 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="tabular-nums">{currentTime}</span>
              <span className="tabular-nums">{totalTime}</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={skipBackward}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restart</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button
              size="icon"
              className={`rounded-full ${compact ? "h-10 w-10" : "h-12 w-12"} ${
                isPlaying ? "bg-primary hover:bg-primary/90" : "btn-premium glow-primary"
              }`}
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className={`${compact ? "h-5 w-5" : "h-6 w-6"}`} />
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                >
                  <Play className={`${compact ? "h-5 w-5" : "h-6 w-6"}`} />
                </motion.div>
              )}
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={skipForward}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip to end</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Settings - only show in non-compact mode */}
          {!compact && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Mic className="h-3.5 w-3.5" />
                    Voice
                  </label>
                </div>
                <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map(voice => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name.includes('Microsoft') ? voice.name.split(' - ')[0] : voice.name}
                      </SelectItem>
                    ))}
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
                  onValueChange={handleVolumeChange}
                />
                <div className="text-xs text-right text-muted-foreground">
                  {isMuted ? "Muted" : `${volume}%`}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
