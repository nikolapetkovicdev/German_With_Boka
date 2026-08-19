import {runAllJobs} from '@/lib/services/jobs';
import {jsonError, jsonOk} from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-job-secret');
    if (!process.env.JOB_SECRET || secret !== process.env.JOB_SECRET) throw new Error('FORBIDDEN');
    return jsonOk(await runAllJobs());
  } catch (error) {
    return jsonError(error);
  }
}
