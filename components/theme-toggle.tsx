"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export default function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Track current theme in local storage to ensure persistence
  useEffect(() => {
    if (theme) {
      localStorage.setItem('talqs-theme-current', theme)
    }
  }, [theme])

  useEffect(() => {
    setMounted(true)
    
    // Check if we need to restore the theme from local storage
    const savedTheme = localStorage.getItem('talqs-theme-current')
    if (savedTheme && savedTheme !== theme) {
      setTheme(savedTheme)
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full glass border-0">
          <motion.div
            animate={{ rotate: resolvedTheme === "dark" ? 180 : 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <Sun className="h-[1.2rem] w-[1.2rem] absolute transition-all dark:opacity-0" />
            <Moon className="h-[1.2rem] w-[1.2rem] absolute transition-all opacity-0 dark:opacity-100" />
          </motion.div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass border-0 shadow-glow-sm">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
