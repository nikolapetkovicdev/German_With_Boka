import {NextResponse} from 'next/server';

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, {status});
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  const code = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : status;
  return NextResponse.json({error: message}, {status: code});
}
