import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const profile = JSON.parse(open(`../profiles/${__ENV.PROFILE || 'baseline'}.json`));
const sessions = new SharedArray('sessions', () => JSON.parse(open(__ENV.SESSIONS_FILE || '../runtime/sessions.json')));
if (!__ENV.BASE_URL || /cubiqlo\.com/i.test(__ENV.BASE_URL)) throw new Error('PRODUCTION_TARGET_FORBIDDEN');
export const options = { vus: Number(__ENV.VUS || profile.vus), duration: __ENV.DURATION || profile.duration, thresholds: { http_req_failed: [profile.thresholds.http_req_failed], http_req_duration: [profile.thresholds.http_req_duration] } };
const routes = Object.entries(profile.routeWeights); const cumulative=[]; let sum=0; for(const [name,weight] of routes){sum+=weight;cumulative.push([name,sum]);} if(Math.abs(sum-1)>1e-9) throw new Error('ROUTE_WEIGHTS_INVALID');
const paths={dashboard:'/app/dashboard',clients:'/app/clients',projects:'/app/projects',tasks:'/app/tasks',reports:'/app/reports',calendar:'/app/calendar',invoices:'/app/invoices'};
export default function workload(){ const session=sessions[(__VU-1)%sessions.length]; const roll=Math.random(); const route=(cumulative.find(([,limit])=>roll<=limit)||cumulative[cumulative.length-1])[0]; const response=http.get(`${__ENV.BASE_URL}${paths[route]}`,{headers:{Cookie:session.cookie},tags:{route,slo:'light'}}); check(response,{expected_status:r=>profile.acceptedStatuses.includes(r.status)}); sleep(2+Math.random()*6); }
export function handleSummary(data){ return { [__ENV.SUMMARY_FILE || 'k6-summary.json']: JSON.stringify(data,null,2), stdout: `checks=${data.metrics.checks?.values?.rate ?? 0}\n` }; }
