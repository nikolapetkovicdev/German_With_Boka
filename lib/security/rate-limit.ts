type Hit = {count: number; resetAt: number};

const buckets = new Map<string, Hit>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const hit = buckets.get(key);
  if (!hit || hit.resetAt < now) {
    buckets.set(key, {count: 1, resetAt: now + windowMs});
    return {ok: true, remaining: limit - 1};
  }
  if (hit.count >= limit) {
    return {ok: false, remaining: 0};
  }
  hit.count += 1;
  return {ok: true, remaining: limit - hit.count};
}
