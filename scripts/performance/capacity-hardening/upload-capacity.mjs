import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Readable } from "node:stream";
import { validateUploadObjectStream } from "../../../src/lib/upload-object-validation.ts";

if (/cubiqlo\.com/i.test(process.env.CAPACITY_BASE_URL ?? "")) throw new Error("PRODUCTION_TARGET_FORBIDDEN");
const sizes=[5,50].map(m=>m*1024*1024), parallel=Number(process.env.PARALLEL||4), results=[];
for(const bytes of sizes){const started=performance.now();const heap=process.memoryUsage().heapUsed;await Promise.all(Array.from({length:parallel},async()=>{const header=Buffer.from("%PDF-1.7\n");let sent=header.length;const stream=Readable.from((async function*(){yield header;while(sent<bytes){const n=Math.min(64*1024,bytes-sent);sent+=n;yield Buffer.alloc(n,65);}})());const expected=createHash("sha256");expected.update(header);let left=bytes-header.length;const chunk=Buffer.alloc(64*1024,65);while(left){const n=Math.min(left,chunk.length);expected.update(chunk.subarray(0,n));left-=n;}const out=await validateUploadObjectStream(stream,{expectedBytes:bytes,maxBytes:bytes,expectedSha256:expected.digest("hex"),expectedMime:"application/pdf"});if(out.bytes!==bytes)throw new Error("SIZE_MISMATCH");}));results.push({mib:bytes/1024/1024,parallel,elapsedMs:Math.round(performance.now()-started),heapDelta:process.memoryUsage().heapUsed-heap});}
console.log(JSON.stringify({version:1,results,externalRequests:0,estimatedCostUsd:0}));
// ponytail: validator-capacity proof only; add isolated MinIO/R2-compatible transport when provider-network capacity is approved.
