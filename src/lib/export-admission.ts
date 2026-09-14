import { randomUUID } from "node:crypto";
import { createClient, type RedisClientType } from "redis";
import { checkDistributedRateLimit } from "./distributed-rate-limit";

export type ExportPressure = "user" | "workspace" | "instance";
export interface ExportAdmissionBackend {
  acquire(input: { userId: string; workspaceId: string; endpoint: string }): Promise<{ ok: true; token: string } | { ok: false; dimension: ExportPressure; retryAfterSec: number }>;
  renew(token: string): Promise<boolean>;
  release(token: string): Promise<boolean>;
}
const TTL_MS = 120_000;
const ACQUIRE = `
local limits={1,2,4}
for i=1,3 do redis.call('ZREMRANGEBYSCORE',KEYS[i],'-inf',ARGV[1]) end
for i=1,3 do if redis.call('ZCARD',KEYS[i]) >= limits[i] then return {0,i,math.ceil(math.max(1,redis.call('ZRANGE',KEYS[i],0,0,'WITHSCORES')[2]-tonumber(ARGV[1]))/1000)} end end
for i=1,3 do redis.call('ZADD',KEYS[i],ARGV[2],ARGV[3]) end
redis.call('SET',KEYS[4],KEYS[1]..'|'..KEYS[2]..'|'..KEYS[3],'PX',ARGV[4]); return {1,0,0}`;
const RELEASE = `local value=redis.call('GET',KEYS[1]); if not value then return 0 end; for key in string.gmatch(value,'[^|]+') do redis.call('ZREM',key,ARGV[1]) end; redis.call('DEL',KEYS[1]); return 1`;
const RENEW = `local value=redis.call('GET',KEYS[1]); if not value then return 0 end; for key in string.gmatch(value,'[^|]+') do redis.call('ZADD',key,ARGV[2],ARGV[1]) end; redis.call('PEXPIRE',KEYS[1],ARGV[3]); return 1`;
let client: RedisClientType | null = null;
async function redis() { if (client?.isReady) return client; const url=process.env.RATE_LIMIT_REDIS_URL; if(!url) throw new Error("RATE_LIMIT_REDIS_URL is not configured"); client=createClient({url,socket:{connectTimeout:1500,reconnectStrategy:false}}) as RedisClientType; client.on("error",e=>console.error("export admission Redis error",e.message)); await client.connect(); return client; }
export const redisExportAdmissionBackend: ExportAdmissionBackend = {
  async acquire(input) { const token=randomUUID(), now=Date.now(), expiry=now+TTL_MS; const keys=[`cubiqlo:export:user:${input.userId}`,`cubiqlo:export:workspace:${input.workspaceId}`,"cubiqlo:export:instance",`cubiqlo:export:lease:${token}`]; const result=await (await redis()).eval(ACQUIRE,{keys,arguments:[String(now),String(expiry),token,String(TTL_MS)]}) as number[]; return Number(result[0])===1?{ok:true,token}:{ok:false,dimension:(["user","workspace","instance"] as const)[Number(result[1])-1],retryAfterSec:Number(result[2])}; },
  async renew(token) { return Boolean(await (await redis()).eval(RENEW,{keys:[`cubiqlo:export:lease:${token}`],arguments:[token,String(Date.now()+TTL_MS),String(TTL_MS)]})); },
  async release(token) { return Boolean(await (await redis()).eval(RELEASE,{keys:[`cubiqlo:export:lease:${token}`],arguments:[token]})); },
};
export async function withExportAdmission<T>(input:{userId:string;workspaceId:string;endpoint:string;backend?:ExportAdmissionBackend;timeoutMs?:number},work:(signal:AbortSignal)=>Promise<T>):Promise<T|Response>{
  if(!input.backend) try { const [u,w]=await Promise.all([checkDistributedRateLimit(`export:user:${input.userId}`,{limit:10,windowSec:60}),checkDistributedRateLimit(`export:workspace:${input.workspaceId}`,{limit:30,windowSec:60})]); const denied=!u.allowed?u:!w.allowed?w:null; if(denied)return Response.json({error:"Too many export requests"},{status:429,headers:{"Retry-After":String(denied.retryAfterSec)}}); } catch { return Response.json({error:"Export admission unavailable"},{status:503,headers:{"Retry-After":"5"}}); }
  const backend=input.backend??redisExportAdmissionBackend; let lease:Awaited<ReturnType<ExportAdmissionBackend["acquire"]>>; try{lease=await backend.acquire(input);}catch{return Response.json({error:"Export capacity unavailable"},{status:503,headers:{"Retry-After":"5"}});} if(lease.ok===false)return Response.json({error:"Export capacity busy",dimension:lease.dimension},{status:lease.dimension==="instance"?503:429,headers:{"Retry-After":String(lease.retryAfterSec)}});
  const controller=new AbortController(),renewal=setInterval(()=>{void backend.renew(lease.token).then(ok=>{if(!ok)controller.abort();}).catch(()=>controller.abort());},30_000),timeoutMs=input.timeoutMs??90_000;
  let timeout:ReturnType<typeof setTimeout>, settled=false;
  const workPromise=work(controller.signal).finally(()=>{settled=true;});
  const watchdog=new Promise<Response>((resolve)=>{timeout=setTimeout(()=>{controller.abort();resolve(Response.json({error:"Export timed out"},{status:504}));},timeoutMs);});
  try{return await Promise.race([workPromise,watchdog]);}finally{clearTimeout(timeout!);clearInterval(renewal);if(settled)await backend.release(lease.token);else void workPromise.finally(()=>backend.release(lease.token));}
}
