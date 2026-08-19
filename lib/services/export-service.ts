import ExcelJS from 'exceljs';
import {jsPDF} from 'jspdf';
import {Role} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {Actor, assertCanAccessStudent} from '@/lib/security/rbac';

export async function visibleBookingsForExport(actor: Actor) {
  if (actor.role === Role.ADMIN || actor.role === Role.TEACHER) {
    return prisma.booking.findMany({include: {student: true, payments: true, content: true}, orderBy: {startsAt: 'desc'}});
  }
  const students =
    actor.role === Role.PARENT
      ? (await prisma.parentStudent.findMany({where: {parentId: actor.id}, select: {studentId: true}})).map((item) => item.studentId)
      : (await prisma.student.findMany({where: {userId: actor.id}, select: {id: true}})).map((item) => item.id);
  return prisma.booking.findMany({where: {studentId: {in: students}}, include: {student: true, payments: true, content: true}, orderBy: {startsAt: 'desc'}});
}

export function bookingsToCsv(bookings: Awaited<ReturnType<typeof visibleBookingsForExport>>) {
  const rows = [['Datum', 'Ucenik', 'Status', 'Tema', 'Uplata', 'Valuta']];
  for (const booking of bookings) {
    const payment = booking.payments[0];
    rows.push([
      booking.startsAt.toISOString(),
      `${booking.student.firstName} ${booking.student.lastName}`,
      booking.status,
      booking.content?.topic ?? '',
      payment?.amount.toString() ?? '',
      payment?.currency ?? ''
    ]);
  }
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
}

export async function bookingsToXlsx(bookings: Awaited<ReturnType<typeof visibleBookingsForExport>>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Lessons');
  sheet.columns = [
    {header: 'Datum', key: 'date', width: 26},
    {header: 'Ucenik', key: 'student', width: 24},
    {header: 'Status', key: 'status', width: 20},
    {header: 'Tema', key: 'topic', width: 40},
    {header: 'Uplata', key: 'amount', width: 14},
    {header: 'Valuta', key: 'currency', width: 10}
  ];
  for (const booking of bookings) {
    const payment = booking.payments[0];
    sheet.addRow({
      date: booking.startsAt.toISOString(),
      student: `${booking.student.firstName} ${booking.student.lastName}`,
      status: booking.status,
      topic: booking.content?.topic ?? '',
      amount: payment?.amount.toString() ?? '',
      currency: payment?.currency ?? ''
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function bookingsToPdf(bookings: Awaited<ReturnType<typeof visibleBookingsForExport>>) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('German with Boka - izvoz casova', 14, 18);
  doc.setFontSize(10);
  let y = 30;
  for (const booking of bookings.slice(0, 40)) {
    const line = `${booking.startsAt.toISOString()} | ${booking.student.firstName} ${booking.student.lastName} | ${booking.status} | ${booking.content?.topic ?? ''}`;
    doc.text(line.slice(0, 115), 14, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  }
  return Buffer.from(doc.output('arraybuffer'));
}

export async function paymentReceiptPdf(actor: Actor, paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: {id: paymentId},
    include: {student: true, booking: true}
  });
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  await assertCanAccessStudent(actor, payment.studentId);
  const instruction =
    payment.booking
      ? ((await prisma.teacherBankInstruction.findUnique({where: {teacherId_currency: {teacherId: payment.booking.teacherId, currency: payment.currency}}})) ??
        (await prisma.bankAccountInstruction.findUnique({where: {currency: payment.currency}})))
      : await prisma.bankAccountInstruction.findUnique({where: {currency: payment.currency}});
  const payer = await prisma.user.findUnique({where: {id: payment.payerId}, include: {profile: true}});
  const doc = new jsPDF();
  const number = `GWB-PAY-${payment.id.slice(-8).toUpperCase()}`;
  doc.setFontSize(16);
  doc.text('German with Boka', 14, 18);
  doc.setFontSize(12);
  doc.text('Potvrda evidencije uplate', 14, 30);
  const rows = [
    ['Broj dokumenta', number],
    ['Datum', new Date().toISOString()],
    ['Primalac', instruction?.recipientName ?? 'Nije podeseno'],
    ['Adresa primaoca', instruction?.recipientAddress ?? 'Nije podeseno'],
    ['Platicalac', payer?.profile ? `${payer.profile.firstName} ${payer.profile.lastName}` : payer?.email ?? ''],
    ['Ucenik', `${payment.student.firstName} ${payment.student.lastName}`],
    ['Iznos', `${payment.amount.toString()} ${payment.currency}`],
    ['Svrha', payment.purpose],
    ['Povezano', payment.bookingId ? `Cas ${payment.bookingId}` : 'Paket casova'],
    ['Status uplate', payment.status]
  ];
  let y = 44;
  for (const [label, value] of rows) {
    doc.text(`${label}: ${value}`, 14, y);
    y += 8;
  }
  doc.setFontSize(9);
  doc.text('Ovo je potvrda evidencije uplate u MVP sistemu. Nije fiskalni racun.', 14, y + 8);
  return Buffer.from(doc.output('arraybuffer'));
}
