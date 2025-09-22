import { User as NextAuthUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: string[];
      emailVerified?: Date | null;
    };
  }
  interface User extends NextAuthUser {
    id: string;
    roles: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles: string[];
    emailVerified?: Date | null;
  }
} 