import { createHmac, timingSafeEqual } from "crypto";

const TTL_SECONDS = 60 * 60 * 24;

export function createPortalSession(clientId:string, version:string, secret:string, now=Math.floor(Date.now()/1000)) {
  const body=Buffer.from(JSON.stringify({clientId,version,exp:now+TTL_SECONDS})).toString("base64url");
  const sig=createHmac("sha256",secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function verifyPortalSession(token:string, clientId:string, version:string, secret:string, now=Math.floor(Date.now()/1000)) {
  const [body,sig]=token.split("."); if(!body||!sig) return null;
  const expected=createHmac("sha256",secret).update(body).digest("base64url");
  const a=Buffer.from(sig), b=Buffer.from(expected); if(a.length!==b.length||!timingSafeEqual(a,b)) return null;
  try { const data=JSON.parse(Buffer.from(body,"base64url").toString()) as {clientId:string;version:string;exp:number};
    return data.clientId===clientId&&data.version===version&&data.exp>=now?data:null;
  } catch{return null;}
}
export const PORTAL_COOKIE="cubiqlo_portal_session";