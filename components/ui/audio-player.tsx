"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface AudioPlayerProps {
  text: string
  className?: string
  compact?: boolean
}

export function AudioPlayer({ text, className = "", compact = false }: AudioPlayerProps) {
  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // State for player
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  
  // Refs for blob URL and audio context
  const blobUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        console.log('Available voices:', availableVoices.map(v => v.name));
        
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          
          // Prefer Microsoft voices
          const davidVoice = availableVoices.find(v => v.name.includes('David'));
          const microsoftVoice = availableVoices.find(v => v.name.includes('Microsoft'));
          const englishVoice = availableVoices.find(v => v.lang.startsWith('en'));
          
          const defaultVoice = davidVoice || microsoftVoice || englishVoice || availableVoices[0];
          
          if (defaultVoice) {
            console.log('Setting default voice to:', defaultVoice.name);
            setSelectedVoice(defaultVoice.voiceURI);
          }
        }
      };
      
      // Load voices immediately and also set listener for when voices change
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Initialize audio context for visualization
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    }
    
    // Cleanup function
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Create audio from text
  const createAudioFromText = async () => {
    if (!selectedVoice || !text) return;
    
    // Cancel any existing speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Revoke any existing blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    
    // Create a new SpeechSynthesisUtterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set the selected voice
    const voice = voices.find(v => v.voiceURI === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    
    // Convert speech to audio file using MediaRecorder
    return new Promise<string>((resolve, reject) => {
      // Create audio context and destination
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      // Create oscillator for audio source
      const oscillator = audioContext.createOscillator();
      oscillator.connect(destination);
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(destination.stream);
      const audioChunks: BlobPart[] = [];
      
      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      // When recording stops, create blob and URL
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        blobUrlRef.current = audioUrl;
        audioContext.close();
        resolve(audioUrl);
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
      
      // When speech ends, stop recording
      utterance.onend = () => {
        mediaRecorder.stop();
        oscillator.stop();
      };
      
      // Start oscillator
      oscillator.start();
      
      // If speech doesn't start within 3 seconds, reject
      const timeout = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          oscillator.stop();
          reject(new Error('Speech synthesis timeout'));
        }
      }, 3000);
      
      // Clear timeout when speech starts
      utterance.onstart = () => {
        clearTimeout(timeout);
      };
      
      // Handle errors
      utterance.onerror = (event) => {
        clearTimeout(timeout);
        mediaRecorder.stop();
        oscillator.stop();
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };
    });
  };
  
  // Initialize or update audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Set up event listeners
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      
      // Connect to audio context for visualization
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    }
    
    // Set volume
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
    
    // Clean up event listeners
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('play', () => setIsPlaying(true));
        audioRef.current.removeEventListener('pause', () => setIsPlaying(false));
      }
    };
  }, [volume, isMuted]);
  
  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 0;
      const progressPercent = (currentTime / duration) * 100;
      
      setCurrentTime(currentTime);
      setProgress(progressPercent);
    }
  };
  
  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  // Handle ended
  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    if (audioRef.current) {
      setCurrentTime(audioRef.current.duration);
    }
  };
  
  // Toggle play/pause
  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // If at the end, start from beginning
      if (progress >= 100) {
        audioRef.current.currentTime = 0;
      }
      
      // If no src, create one
      if (!audioRef.current.src) {
        try {
          const audioUrl = await createAudioFromText();
          audioRef.current.src = audioUrl;
        } catch (error) {
          console.error('Error creating audio:', error);
          return;
        }
      }
      
      // Resume or start playing
      try {
        await audioRef.current.play();
        startVisualization();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };
  
  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current || !value.length) return;
    
    const seekPercent = value[0];
    const seekTime = (seekPercent / 100) * (audioRef.current.duration || 0);
    
    // Set current time
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    setProgress(seekPercent);
    
    console.log(`Seeking to ${seekTime.toFixed(2)}s (${seekPercent.toFixed(1)}%)`);
  };
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (audioRef.current) {
      audioRef.current.volume = !isMuted ? 0 : volume / 100;
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
    
    // Apply volume change
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume / 100;
    }
  };
  
  // Handle voice change
  const handleVoiceChange = async (value: string) => {
    setSelectedVoice(value);
    console.log(`Voice changed to: ${value}`);
    
    // Reset audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };
  
  // Skip to beginning
  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setProgress(0);
    }
  };
  
  // Skip to end
  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = audioRef.current.duration;
      setCurrentTime(audioRef.current.duration);
      setProgress(100);
      setIsPlaying(false);
    }
  };
  
  // Start visualization
  const startVisualization = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Animation function
    const animate = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Request next frame
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  // Format time (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Formatted times for display
  const formattedCurrentTime = formatTime(currentTime);
  const formattedDuration = formatTime(duration);
  
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Audio visualization - only show in non-compact mode */}
          {!compact && (
            <div className="h-16 bg-background/50 rounded-md overflow-hidden flex items-center justify-center">
              <div className="flex items-end h-12 space-x-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  // Dynamic height calculation based on frequency data
                  const height = dataArrayRef.current 
                    ? Math.max(4, (dataArrayRef.current[i % dataArrayRef.current.length] / 255) * 40)
                    : 4;
                  
                  return (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary/60 rounded-full"
                      style={{
                        height: isPlaying ? `${height}px` : '4px',
                        transition: 'height 0.1s ease-in-out'
                      }}
                      animate={isPlaying ? {
                        height: [
                          `${height}px`,
                          `${height + 5}px`, 
                          `${height}px`
                        ]
                      } : { height: '4px' }}
                      transition={{
                        duration: 0.3,
                        repeat: isPlaying ? Infinity : 0,
                        repeatType: "reverse",
                        delay: i * 0.03,
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
              <span className="tabular-nums">{formattedCurrentTime}</span>
              <span className="tabular-nums">{formattedDuration}</span>
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
                    {voices.map(voice => (
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
