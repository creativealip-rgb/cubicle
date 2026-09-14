import http, { expectedStatuses } from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
const sessions=new SharedArray('sessions',()=>JSON.parse(open(__ENV.SESSIONS_FILE)));
http.setResponseCallback(expectedStatuses(200,429));
if(!__ENV.BASE_URL||/cubiqlo\.com/i.test(__ENV.BASE_URL))throw new Error('PRODUCTION_TARGET_FORBIDDEN');
export const options={vus:Number(__ENV.VUS||10),duration:__ENV.DURATION||'5m',thresholds:{http_req_failed:['rate<0.01'],'http_req_duration{class:db-heavy}':['p(95)<4000'],'http_req_duration{class:xlsx}':['p(95)<10000']}};
export default function(){const s=sessions[(__VU-1)%sessions.length];const headers={Cookie:s.cookie,Host:'app.cubiqlo.com'};const heavy=http.get(`${__ENV.BASE_URL}/app/reports?period=custom&from=2025-09-14&to=2026-09-13`,{headers,tags:{class:'db-heavy',route:'reports-custom'}});check(heavy,{reports_200:r=>r.status===200});if(__ITER%10===0){const x=http.get(`${__ENV.BASE_URL}/api/reports/export/xlsx`,{headers,tags:{class:'xlsx',route:'reports-xlsx'}});check(x,{xlsx_expected:r=>[200,429].includes(r.status)});}sleep(2);}
export function handleSummary(data){return{[__ENV.SUMMARY_FILE]:JSON.stringify(data,null,2)};}
