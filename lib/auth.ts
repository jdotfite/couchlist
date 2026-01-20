import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db, initDb } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await initDb();

          const result = await db`
            SELECT * FROM users WHERE email = ${credentials.email as string}
          `;

          const user = result.rows[0];

          if (!user) {
            return null;
          }

          // Google-only accounts have empty passwords - reject credential login
          if (!user.password || user.password === '') {
            return null;
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Handle OAuth sign in (Google, etc.)
      if (account?.provider === 'google') {
        try {
          // Check if POSTGRES_URL is configured
          if (!process.env.POSTGRES_URL || process.env.POSTGRES_URL === 'your_postgres_connection_string_here') {
            console.log('⚠️  Database not configured. User data will not be saved.');
            return true; // Allow sign in but don't save to DB
          }

          await initDb();
          
          // Check if user exists
          const existingUser = await db`
            SELECT * FROM users WHERE email = ${user.email}
          `;
          
          // If user doesn't exist, create them
          if (existingUser.rows.length === 0) {
            await db`
              INSERT INTO users (email, name, password)
              VALUES (${user.email}, ${user.name}, '')
            `;
          }
          
          return true;
        } catch (error) {
          console.error('Error creating OAuth user:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      // Skip DB work if Postgres is not configured
      if (!process.env.POSTGRES_URL || process.env.POSTGRES_URL === 'your_postgres_connection_string_here') {
        return token;
      }

      if (user) {
        // Get user ID from database
        try {
          await initDb();
          const result = await db`
            SELECT id FROM users WHERE email = ${user.email}
          `;
          if (result.rows[0]) {
            token.id = result.rows[0].id.toString();
          }
        } catch (error) {
          console.error('Error fetching user ID:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
