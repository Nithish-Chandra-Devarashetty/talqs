"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

// Extended session user type to include provider
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  provider?: string;
}

export function StoreOAuthUserToLocalStorage() {
  const { data: session } = useSession();
  // Cast the user to our extended type
  const user = session?.user as ExtendedUser | undefined;

  useEffect(() => {
    if (user && user.email) {
      try {
        console.log('OAuth session detected:', user.email);
        console.log('Session provider:', user.provider || 'unknown');
        
        // Save theme settings before potential localStorage changes
        const savedTheme = localStorage.getItem('talqs-theme-preference');
        const currentTheme = localStorage.getItem('talqs-theme-current');
        
        // Get current users from localStorage
        const users = JSON.parse(localStorage.getItem("adminUsers") || "[]");
        
        // Check if user already exists
        const exists = users.some((u: any) => u.email === user.email);
        
        if (!exists) {
          // Determine the provider (GitHub, Google, or default to the session provider)
          const provider = user.provider || 
            (user.email.includes('github') ? 'github' : 'google');
          
          console.log(`Adding ${provider} user to localStorage:`, user.email);
          
          // Add user to localStorage
          users.push({
            email: user.email,
            name: user.name || 'Unknown User',
            image: user.image,
            provider: provider,
            lastLogin: new Date().toISOString()
          });
          
          localStorage.setItem("adminUsers", JSON.stringify(users));
          console.log('User stored in localStorage successfully');
          
          // Restore theme settings after login
          if (savedTheme) {
            localStorage.setItem('talqs-theme-preference', savedTheme);
            console.log('Restored theme preference:', savedTheme);
          }
          if (currentTheme) {
            localStorage.setItem('talqs-theme-current', currentTheme);
            console.log('Restored current theme:', currentTheme);
          }
        } else {
          console.log('User already exists in localStorage');
        }
      } catch (e) {
        // Handle localStorage errors gracefully
        console.error("Failed to update adminUsers in localStorage", e);
      }
    }
  }, [session, user]);
  
  return null;
}
