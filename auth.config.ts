import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'User ID',
          type: 'text',
          placeholder: 'ADMIN',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, user_id, password, name, role, role_type')
          .eq('user_id', credentials.email)
          .single();

        if (error || !user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }
        if (user.role !== 'admin' || user.role_type === 'work_controller') {
          try {
            const today = new Date().toLocaleDateString('en-CA');
            const { data: leave } = await supabaseAdmin
              .from('leave_requests')
              .select('from_date, to_date')
              .eq('eng_id', user.user_id)
              .eq('status', 'approved')
              .lte('from_date', today)
              .gte('to_date', today)
              .limit(1);
            if (leave && leave.length) {
              throw new Error(
                `You are on approved leave today (${leave[0].from_date} → ${leave[0].to_date}). Login is blocked for this day.`
              );
            }
          } catch (leaveErr) {
            if (leaveErr instanceof Error && leaveErr.message.startsWith('You are on approved leave')) {
              throw leaveErr;
            }
          }
        }

        return {
          id: user.id,
          email: user.user_id,
          name: user.name,
          role: user.role,
          roleType: user.role_type,
        };
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = (user as any).email;
        token.role = (user as any).role;
        token.roleType = (user as any).roleType;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as any).role = token.role;
        (session.user as any).roleType = token.roleType;
      }

      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};