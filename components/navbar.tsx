"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, Scale, ChevronRight, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import ThemeToggle from "@/components/theme-toggle"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("home")
  // Navigation state
  const { user, logout } = useAuth()
  const { data: session } = useSession();
  const router = useRouter()

  const isLoggedIn = !!user || !!session;

  const handleLogout = () => {
    if (user) logout();
    if (session) signOut();
    router.push("/auth")
  }
  
  // Navigation related functions

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)

      // Update active section based on scroll position
      const sections = ["home", "features", "upload", "qa", "tts"]
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const offsetTop = element.offsetTop
          const offsetHeight = element.offsetHeight

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  // Define navigation links
  const navLinks = [
    {
      name: "Home",
      href: "#home",
      id: "home",
    },
    {
      name: "Features",
      href: "#features",
      id: "features",
    },
    {
      name: "Upload",
      href: "#upload",
      id: "upload",
    },
    {
      name: "Q&A",
      href: "#qa",
      id: "qa",
    },
    {
      name: "Text to Speech",
      href: "#tts",
      id: "tts",
    },
  ]

  return (
    <header
      className={`fixed top-0 w-full z-40 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-sm shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex w-full justify-between items-center">
          <Link href="/" className="flex items-center gap-2 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="bg-primary/10 p-2 rounded-lg"
            >
              <Scale className="h-6 w-6 text-primary" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="gradient-text font-bold"
            >
              TALQS
            </motion.span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
              >
                <Link
                  href={link.href}
                  className={`nav-link text-sm font-medium px-2 py-1 ${
                    activeSection === link.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveSection(link.id)}
                >
                  {link.name}
                  {activeSection === link.id && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.6,
              }}
            >
              <ThemeToggle />
            </motion.div>

            {isLoggedIn ? (
              <>
                {/* Show admin dashboard if custom user is admin, or just show for all logged-in if using NextAuth only */}
                {user?.isAdmin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.7,
                    }}
                    className="hidden md:block"
                  >
                    <Link href="/admin">
                      <Button variant="outline" className="mr-2 glass">
                        Admin Dashboard
                      </Button>
                    </Link>
                  </motion.div>
                )}
                
                {/* Navigation buttons */}

                {/* Profile Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.7,
                  }}
                  className="hidden md:block"
                >
                  <Link href="/profile">
                    <Button variant="outline" className="mr-2 glass">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                </motion.div>
                
                {/* Logout Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.8,
                  }}
                  className="hidden md:block"
                >
                  <Button onClick={handleLogout} variant="outline" className="glass">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.7,
                  }}
                  className="hidden md:block"
                >
                  <Link href="/auth">
                    <Button variant="outline" className="mr-2 glass">
                      Login
                    </Button>
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.8,
                  }}
                  className="hidden md:block"
                >
                  <Link href="/auth?tab=signup">
                    <Button className="btn-premium">
                      Sign Up
                      <ChevronRight className="h-4 w-4 ml-1 arrow" />
                    </Button>
                  </Link>
                </motion.div>
              </>
            )}

            {/* Mobile menu toggle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.6,
              }}
              className="md:hidden"
            >
              <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleMenu}>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation header elements */}

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden"
          >
            <div className="container bg-background py-4 space-y-4">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                >
                  <Link
                    href={link.href}
                    className={`block py-2 px-4 rounded-md ${
                      activeSection === link.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => {
                      setActiveSection(link.id);
                      setIsOpen(false);
                    }}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              {isLoggedIn ? (
                <>
                  {user?.isAdmin && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: navLinks.length * 0.1 }}
                    >
                      <Link
                        href="/admin"
                        className="block py-2 px-4 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setIsOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    </motion.div>
                  )}
                  {/* Profile link in mobile menu */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: (navLinks.length + 1) * 0.1 }}
                  >
                    <Link
                      href="/profile"
                      className="block py-2 px-4 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </div>
                    </Link>
                  </motion.div>
                  {/* Mobile menu options */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: (navLinks.length + 2) * 0.1 }}
                  >
                    <button
                      className="block w-full text-left py-2 px-4 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </div>
                    </button>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: navLinks.length * 0.1 }}
                  >
                    <Link
                      href="/auth"
                      className="block py-2 px-4 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Link>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: (navLinks.length + 1) * 0.1 }}
                  >
                    <Link
                      href="/auth?tab=signup"
                      className="block py-2 px-4 rounded-md bg-primary/10 text-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
