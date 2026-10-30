const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const zlib=require('node:zlib');
const html=fs.readFileSync(__dirname+'/chart.html','utf8');const code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/start\(\);\s*$/,'');
let strokes=0;const labels=[];const context=new Proxy({},{get:(t,k)=>k==='stroke'?()=>strokes++:k==='fillText'?(text)=>labels.push(text):()=>{}});
const node={getContext:()=>context};const nodes={};
const ctx={Date,Number,Math,JSON,Array,Error,Uint8Array,Blob,DecompressionStream,atob,URLSearchParams,
 document:{getElementById:id=>id==='chart'?node:(nodes[id]??={textContent:''})},location:{hash:''}};vm.createContext(ctx);vm.runInContext(code+'\nglobalThis.api={validate,decode,draw,renderDetails,pineSource};',ctx);
const data={symbol:'ACMR',exchange:'NASDAQ',bars:[[1793277000,10,10.2,9.8,10.1,1000,10,9.9,10.05,52,.2]],entry:10,stop:9.8,target:10.8,fib:[9.5,10.5],created:'2026-10-29T15:00:00Z'};
(async()=>{
 const encoded=zlib.deflateSync(Buffer.from(JSON.stringify(data))).toString('base64url');
 const decoded=await ctx.api.decode(encoded);assert.equal(decoded.symbol,'ACMR');ctx.api.draw(decoded);assert.ok(strokes>5);
 assert.throws(()=>ctx.api.validate({...data,symbol:'<script>'}));
 assert.throws(()=>ctx.api.validate({...data,bars:[[0,null]]}));
 assert.throws(()=>ctx.api.validate({...data,target:-1}));
 await assert.rejects(()=>ctx.api.decode('bad-data'));
 const bomb=zlib.deflateSync(Buffer.from('x'.repeat(210000))).toString('base64url');await assert.rejects(()=>ctx.api.decode(bomb));
 const executed={...data,kind:'EXECUTION',direction:'SHORT',entry:10.1234,stop:10.5,target:9.5,planned_entry:10.13,entry_limit:10.12,filled_qty:3,partial:true,filled_at:'2026-10-29T15:05:00Z',fill_time_source:'BROKER',stop_source:'BROKER',target_source:'PLAN'};
 ctx.api.validate(executed);ctx.api.renderDetails(executed);ctx.api.draw(executed);
 assert.match(nodes.title.textContent,/SHORT/);assert.equal(nodes['entry-label'].textContent,'Entrata media eseguita');
 assert.match(nodes.execution.textContent,/parziale/);assert.match(nodes['stop-label'].textContent,/broker/);assert.match(nodes['target-label'].textContent,/piano/);
 assert.ok(labels.some(x=>x.startsWith('Entrata eseguita')));assert.ok(labels.some(x=>x.startsWith('Stop loss')));assert.ok(labels.some(x=>x.startsWith('Take profit')));
 ctx.api.draw(ctx.api.validate({...executed,bars:[]}));
 assert.throws(()=>ctx.api.validate({...data,bars:[]}));assert.throws(()=>ctx.api.validate({...executed,direction:'BAD'}));
 assert.throws(()=>ctx.api.validate({...executed,filled_qty:0}));assert.throws(()=>ctx.api.validate({...executed,filled_at:'bad'}));
 ctx.api.renderDetails(data);assert.match(nodes.title.textContent,/LONG/);assert.equal(nodes['entry-label'].textContent,'Ingresso pianificato');
 const pine=ctx.api.pineSource(executed);assert.ok(pine.startsWith('//@version=6'));assert.ok(pine.includes('input.float(10.1234'));assert.ok(pine.includes('syminfo.ticker == \"ACMR\"'));assert.ok(pine.includes('SHORT - Entrata media'));assert.equal((pine.match(/line.new/g)||[]).length,3);assert.equal((pine.match(/label.new/g)||[]).length,3);assert.ok(!pine.includes('strategy.entry'));assert.throws(()=>ctx.api.pineSource(data));
 console.log('Chart snapshot, executed levels, direction, broker/plan labels and Pine export checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
