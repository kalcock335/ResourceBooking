import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Resource Login",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Find resource by email
        const resource = await prisma.resource.findUnique({
          where: { email: String(credentials.email) },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            isActive: true,
            roles: {
              include: {
                role: true
              }
            }
          },
        });
        if (!resource || !resource.isActive) return null;
        // If password is set, check it
        if (typeof resource.password === 'string' && resource.password.length > 0) {
          const valid = await bcrypt.compare(String(credentials.password), resource.password);
          if (!valid) return null;
        } else {
          // If no password set, deny login
          return null;
        }
        return {
          id: resource.id,
          name: resource.name,
          email: resource.email,
          roles: resource.roles.map((rr: any) => rr.role),
        };
      }
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.roles = user.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.roles = token.roles as string[];
      } else {
        session.user = {
          id: token.id as string,
          name: token.name as string ?? null,
          email: token.email as string ?? null,
          image: (token.image as string) ?? null,
          roles: token.roles as string[] ?? [],
          emailVerified: null,
        };
      }
      return session;
    },
  },
}); 