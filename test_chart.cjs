const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const zlib=require('node:zlib');
const html=fs.readFileSync(__dirname+'/chart.html','utf8');const code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/start\(\);\s*$/,'');
let strokes=0;const context=new Proxy({},{get:(t,k)=>k==='stroke'?()=>strokes++:()=>{}});
const node={getContext:()=>context};
const ctx={Date,Number,Math,JSON,Array,Error,Uint8Array,Blob,DecompressionStream,atob,URLSearchParams,
 document:{getElementById:()=>node},location:{hash:''}};vm.createContext(ctx);vm.runInContext(code+'\nglobalThis.api={validate,decode,draw};',ctx);
const data={symbol:'ACMR',exchange:'NASDAQ',bars:[[1793277000,10,10.2,9.8,10.1,1000,10,9.9,10.05,52,.2]],entry:10,stop:9.8,target:10.8,fib:[9.5,10.5],created:'2026-10-29T15:00:00Z'};
(async()=>{
 const encoded=zlib.deflateSync(Buffer.from(JSON.stringify(data))).toString('base64url');
 const decoded=await ctx.api.decode(encoded);assert.equal(decoded.symbol,'ACMR');ctx.api.draw(decoded);assert.ok(strokes>5);
 assert.throws(()=>ctx.api.validate({...data,symbol:'<script>'}));
 assert.throws(()=>ctx.api.validate({...data,bars:[[0,null]]}));
 assert.throws(()=>ctx.api.validate({...data,target:-1}));
 await assert.rejects(()=>ctx.api.decode('bad-data'));
 const bomb=zlib.deflateSync(Buffer.from('x'.repeat(210000))).toString('base64url');await assert.rejects(()=>ctx.api.decode(bomb));
 console.log('6 chart snapshot behavior checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
