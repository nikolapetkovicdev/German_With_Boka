import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {verifyPassword} from '@/lib/security/password';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [users, parent] = await Promise.all([
      prisma.user.count(),
      prisma.user.findUnique({
        where: {email: 'parent@germanwithboka.local'},
        select: {id: true, email: true, role: true, isActive: true, passwordHash: true}
      })
    ]);
    const demoPasswordWorks = parent ? await verifyPassword('DemoPassword123!', parent.passwordHash) : false;

    return NextResponse.json({
      ok: true,
      database: 'connected',
      users,
      demoParentExists: Boolean(parent),
      demoPasswordWorks,
      demoParent: parent ? {email: parent.email, role: parent.role, isActive: parent.isActive} : null
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      {status: 500}
    );
  }
}
