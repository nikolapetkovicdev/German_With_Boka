export interface MeetingProvider {
  validateManualUrl(url: string): string;
}

export class ManualMeetingProvider implements MeetingProvider {
  validateManualUrl(url: string) {
    const parsed = new URL(url);
    if (!['https:'].includes(parsed.protocol)) throw new Error('MEETING_URL_MUST_BE_HTTPS');
    return parsed.toString();
  }
}

export const meetingProvider = new ManualMeetingProvider();
