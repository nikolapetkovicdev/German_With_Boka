import type {NextAuthOptions} from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {verifyPassword} from '@/lib/security/password';
import {rateLimit} from '@/lib/security/rate-limit';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authOptions: NextAuthOptions = {
  session: {strategy: 'jwt'},
  pages: {signIn: '/sr/login'},
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: {label: 'Email', type: 'email'},
        password: {label: 'Password', type: 'password'}
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const key = `login:${parsed.data.email.toLowerCase()}`;
        if (!rateLimit(key, 5, 10 * 60_000).ok) return null;
        const user = await prisma.user.findUnique({where: {email: parsed.data.email.toLowerCase()}, include: {profile: true}});
        if (!user || !user.isActive) return null;
        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({session, token}) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    }
  }
};
