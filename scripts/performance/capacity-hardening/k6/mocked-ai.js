import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
const sessions=new SharedArray('sessions',()=>JSON.parse(open(__ENV.SESSIONS_FILE)));
if(!__ENV.BASE_URL||/cubiqlo\.com/i.test(__ENV.BASE_URL))throw new Error('PRODUCTION_TARGET_FORBIDDEN');
export const options={vus:Number(__ENV.VUS||2),duration:__ENV.DURATION||'1m',thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<5000'],checks:['rate>0.99']}};
export default function(){const s=sessions[(__VU-1)%sessions.length];const r=http.post(`${__ENV.BASE_URL}/api/ai/chat`,JSON.stringify({messages:[{role:'user',content:`Capacity mock ${__VU}-${__ITER}`}]}),{headers:{Cookie:s.cookie,'Content-Type':'application/json',Host:'app.cubiqlo.com',Connection:'close'},tags:{class:'mocked-ai',route:'ai-chat'}});check(r,{ai_200:x=>x.status===200,ai_done:x=>typeof x.body==='string'&&x.body.includes('event: done')});sleep(6);}
export function handleSummary(data){return{[__ENV.SUMMARY_FILE]:JSON.stringify(data,null,2)};}

// ponytail: one deterministic chat path; add tool-call/failure modes for provider resilience, not capacity.
