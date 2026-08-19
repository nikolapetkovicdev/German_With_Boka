import {randomBytes} from 'crypto';
import {Role} from '@prisma/client';
import {addDays} from '@/lib/domain/time';
import {prisma} from '@/lib/prisma';
import {hashPassword} from '@/lib/security/password';
import {Actor, assertCanAccessStudent, assertRole} from '@/lib/security/rbac';

function randomCode(prefix = 'GWB') {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function randomToken() {
  return randomBytes(24).toString('base64url');
}

async function firstTeacherId() {
  const teacher = await prisma.teacher.findFirst({select: {id: true}, orderBy: {createdAt: 'asc'}});
  if (!teacher) throw new Error('TEACHER_NOT_CONFIGURED');
  return teacher.id;
}

export async function registerParent(input: {email: string; password: string; firstName: string; lastName: string}) {
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      role: Role.PARENT,
      profile: {create: {firstName: input.firstName, lastName: input.lastName, locale: 'sr'}},
      notificationPrefs: {create: {}}
    },
    select: {id: true, email: true, role: true}
  });
}

export async function registerStudent(input: {email: string; password: string; firstName: string; lastName: string}) {
  const teacherId = await firstTeacherId();
  return prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      role: Role.STUDENT,
      profile: {create: {firstName: input.firstName, lastName: input.lastName, locale: 'sr'}},
      notificationPrefs: {create: {}},
      studentAccount: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
          teacherId
        }
      }
    },
    select: {id: true, email: true, role: true}
  });
}

export async function createParentChild(actor: Actor, input: {firstName: string; lastName: string; dateOfBirth?: Date}) {
  assertRole(actor, [Role.PARENT]);
  const teacherId = await firstTeacherId();
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        teacherId
      }
    });
    await tx.parentStudent.create({data: {parentId: actor.id, studentId: student.id}});
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Student', entityId: student.id, action: 'PARENT_CHILD_CREATED'}});
    return student;
  });
}

export async function createStudentLinkCode(actor: Actor, studentId: string) {
  await assertCanAccessStudent(actor, studentId);
  return prisma.studentLinkCode.create({
    data: {
      studentId,
      code: randomCode(),
      expiresAt: addDays(new Date(), 14)
    },
    select: {code: true, expiresAt: true}
  });
}

export async function linkParentToStudentByCode(actor: Actor, code: string) {
  assertRole(actor, [Role.PARENT]);
  const normalizedCode = code.trim().toUpperCase();
  const linkCode = await prisma.studentLinkCode.findUnique({where: {code: normalizedCode}});
  if (!linkCode || linkCode.usedAt || linkCode.expiresAt < new Date()) throw new Error('INVALID_STUDENT_LINK_CODE');
  return prisma.$transaction(async (tx) => {
    await tx.parentStudent.upsert({
      where: {parentId_studentId: {parentId: actor.id, studentId: linkCode.studentId}},
      create: {parentId: actor.id, studentId: linkCode.studentId},
      update: {}
    });
    await tx.studentLinkCode.update({where: {id: linkCode.id}, data: {usedAt: new Date()}});
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Student', entityId: linkCode.studentId, action: 'PARENT_CHILD_LINKED_BY_CODE'}});
    return {ok: true};
  });
}

export async function createTeacherInvite(actor: Actor, email: string) {
  assertRole(actor, [Role.ADMIN]);
  return prisma.teacherInvite.create({
    data: {
      email: email.toLowerCase(),
      token: randomToken(),
      invitedById: actor.id,
      expiresAt: addDays(new Date(), 7)
    },
    select: {email: true, token: true, expiresAt: true}
  });
}

export async function acceptTeacherInvite(input: {token: string; email: string; password: string; firstName: string; lastName: string}) {
  const invite = await prisma.teacherInvite.findUnique({where: {token: input.token}});
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) throw new Error('INVALID_TEACHER_INVITE');
  if (invite.email.toLowerCase() !== input.email.toLowerCase()) throw new Error('INVITE_EMAIL_MISMATCH');
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role: Role.TEACHER,
        profile: {create: {firstName: input.firstName, lastName: input.lastName, locale: 'sr'}},
        teacher: {create: {displayName: `${input.firstName} ${input.lastName}`}},
        notificationPrefs: {create: {}}
      },
      select: {id: true, email: true, role: true}
    });
    await tx.teacherInvite.update({where: {id: invite.id}, data: {acceptedAt: new Date()}});
    await tx.auditLog.create({data: {actorId: invite.invitedById, entityType: 'User', entityId: user.id, action: 'TEACHER_INVITE_ACCEPTED'}});
    return user;
  });
}
