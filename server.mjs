import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
const port=Number(process.env.PORT||10000);
const secret=process.env.NEXUS_TOKEN||'';
function output(res,code,obj){
 res.writeHead(code,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
 res.end(JSON.stringify(obj));
}
function authorized(got){
 const a=Buffer.from(String(got||'')),b=Buffer.from(secret);
 return b.length>=32&&a.length===b.length&&timingSafeEqual(a,b);
}
function countPrimes(n){
 let count=0;const sieve=new Uint8Array(n+1);
 for(let p=2;p<=n;p++)if(!sieve[p]){
  count++;if(p*p<=n)for(let i=p*p;i<=n;i+=p)sieve[i]=1;
 }
 return count;
}
const server=createServer(async(req,res)=>{
 const path=(req.url||'').split('?')[0],started=performance.now();
 if(req.method==='GET'&&path==='/health')
  return output(res,200,{ok:true,provider:'render',service:'nexus-render-cpu',authenticated:secret.length>=32});
 if(req.method!=='POST'||path!=='/task')return output(res,404,{ok:false,error:'not found'});
 if(!authorized(req.headers['x-nexus-token']))return output(res,403,{ok:false,error:'forbidden'});
 if(Number(req.headers['content-length']||0)>4096)return output(res,413,{ok:false,error:'payload too large'});
 let raw='';
 try{for await(const data of req){
  raw+=data.toString('utf8');
  if(Buffer.byteLength(raw)>4096)return output(res,413,{ok:false,error:'payload too large'});
 }}catch{return output(res,400,{ok:false,error:'invalid request'});}
 let job;try{job=JSON.parse(raw)}catch{return output(res,400,{ok:false,error:'invalid json'});}
 if(!job||typeof job!=='object'||Array.isArray(job))return output(res,400,{ok:false,error:'invalid payload'});
 if(job.kind==='prime_count'){
  if(!Number.isInteger(job.n)||job.n<0||job.n>300000)return output(res,400,{ok:false,error:'n must be integer 0..300000'});
  return output(res,200,{ok:true,kind:'prime_count',n:job.n,primes:countPrimes(job.n),elapsedMs:Math.round(performance.now()-started)});
 }
 if(job.kind==='statistics'){
  const v=job.values;
  if(!Array.isArray(v)||v.length<1||v.length>256||!v.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6))
   return output(res,400,{ok:false,error:'invalid statistics values'});
  const sum=v.reduce((a,b)=>a+b,0),mean=sum/v.length,variance=v.reduce((a,b)=>a+(b-mean)**2,0)/v.length;
  return output(res,200,{ok:true,kind:'statistics',count:v.length,sum,mean,variance,elapsedMs:Math.round(performance.now()-started)});
 }
 return output(res,400,{ok:false,error:'unsupported task'});
});
server.requestTimeout=20000;
server.headersTimeout=10000;
server.listen(port,'0.0.0.0',()=>console.log('NEXUS Render worker listening'));
