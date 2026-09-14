import http from "node:http";
const server=http.createServer((req,res)=>{if(req.method!=="POST"||req.url!=="/v1/chat/completions"){res.writeHead(404).end();return;}let bytes=0;req.on("data",c=>bytes+=c.length);req.on("end",()=>{if(bytes>1_000_000){res.writeHead(413).end();return;}res.writeHead(200,{"content-type":"text/event-stream"});res.end('data: {"choices":[{"delta":{"content":"Capacity mock response"}}]}\n\ndata: [DONE]\n\n');});});server.listen(8080,"0.0.0.0");
process.on("SIGTERM",()=>server.close());

// ponytail: deterministic success-only provider; add failure/latency modes when testing provider resilience.
