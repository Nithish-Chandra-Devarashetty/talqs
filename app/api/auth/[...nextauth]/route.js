import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { upsertUser } from "@/lib/models/User";
import { connectToDatabase } from "@/lib/mongodb";

// Initialize database connection early
let dbPromise = connectToDatabase()
  .then((connection) => {
    console.log('MongoDB connected for NextAuth');
    return connection;
  })
  .catch(err => {
    console.error('MongoDB connection error in NextAuth:', err);
    return null;
  });

// Warn if credentials are missing
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  console.error('GitHub OAuth credentials are missing.');
}
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('Google OAuth credentials are missing.');
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('Sign-in attempt with provider:', account?.provider);
      
      if (account && (account.provider === 'google' || account.provider === 'github')) {
        try {
          // Process user data regardless of provider
          if (account.provider === 'github') {
            console.log('GitHub profile:', JSON.stringify(profile));
            console.log('GitHub user before processing:', JSON.stringify(user));
            
            // Always set email
            user.email = user.email || profile.email || (profile.login ? `${profile.login}@github.user` : `unknown_${Date.now()}@github.user`);
            // Always set name
            user.name = user.name || profile.name || profile.login || 'GitHub User';
            // Always set image
            user.image = user.image || profile.operavatar_url || profile.picture || null;
            
            console.log('GitHub user after processing:', JSON.stringify(user));
            console.log('GitHub users are not stored in MongoDB as per requirements');
            
            // Skip MongoDB storage for GitHub users
            return true;
          } else if (account.provider === 'google') {
            user.email = user.email || profile.email || `unknown_${Date.now()}@google.user`;
            user.name = user.name || profile.name || 'Google User';
            user.image = user.image || profile.picture || null;
            
            // Only store Google users in MongoDB
            console.log(`${account.provider} sign-in: Starting DB connection...`);
            await dbPromise;
            console.log(`${account.provider} sign-in: DB connection ready`);
            
            const userData = {
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
            };
            
            console.log(`Calling upsertUser with data:`, JSON.stringify(userData));
            const result = await upsertUser(userData);
            console.log(`upsertUser result:`, result ? JSON.stringify(result) : 'null');
          }

          return true;
        } catch (error) {
          console.error(`Error saving ${account.provider} user to DB:`, error);
          console.error(`Stack trace:`, error.stack);
          return true; // Allow sign-in even if DB save fails
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub;
        session.user.provider = token.provider;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth',
    error: '/api/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: true,
});

export { handler as GET, handler as POST };
