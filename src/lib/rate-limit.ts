import "server-only";

type Entry = { count:number; resetsAt:number };
const buckets = new Map<string,Entry>();

export function checkRateLimit(key:string,limit:number,windowMs:number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key,{count:1,resetsAt:now+windowMs});
    return {allowed:true,retryAfter:0};
  }
  if (current.count >= limit) return {allowed:false,retryAfter:Math.ceil((current.resetsAt-now)/1000)};
  current.count += 1;
  return {allowed:true,retryAfter:0};
}

export function requestIdentity(request:Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
