// Run actual inline page script with a minimal offline DOM; no broker/network.
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const code=readFileSync(__dirname+'/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function load(overrides={}){
  const now=Date.parse('2026-10-29T15:10:00Z');
  const data={ticker:'XYZ',ex:'NASDAQ',side:'LONG',entry:'10',stop:'9.8',target:'10.8',qty:'20',fx:'1.1',risk:'6.37',capital:'183',ts:'2026-10-29T15:05:00Z',plan:'3.12',bound:'10.01',deadline:'2026-10-29T15:20:00Z',fibstart:'9',fibend:'11',...overrides};
  const elements={};
  const get=id=>elements[id]??=( {id,value:'',disabled:false,textContent:'',dataset:{copy:id},
    listeners:{},classList:{add(){},remove(){},toggle(){}},addEventListener(e,f){this.listeners[e]=f}} );
  const buttons=['entry','stop','target','qty'].map(id=>{const b=get('copy-'+id);b.dataset.copy=id;return b;});
  class Clock extends Date{static now(){return now;}}
  const context={URLSearchParams,Date:Clock,Number,Math,setInterval(){},setTimeout(){},
    location:{search:'?'+new URLSearchParams(data)},navigator:{clipboard:{writeText:async()=>{}}},
    document:{getElementById:get,querySelectorAll:()=>buttons}};
  vm.runInNewContext(code,context);
  return {get,buttons};
}
let page=load();
assert.equal(page.get('copyAll').disabled,false,'valid bounded plan can be copied');
assert.match(page.get('fibonacci').textContent,/10\.236/);
page=load({deadline:'2026-10-29T15:09:00Z'});
assert.equal(page.get('copyAll').disabled,true,'expired plan is historical');
assert.ok(page.buttons.every(b=>b.disabled));
assert.match(page.get('stale').textContent,/scaduto/);
page=load();page.get('entry').value='10.5';page.get('entry').listeners.input();
assert.equal(page.get('copyAll').disabled,true,'cannot chase beyond the bound');
page=load({side:'SHORT',entry:'10',stop:'10.2',target:'9.2',bound:'9.99'});
assert.equal(page.get('copyAll').disabled,false,'short geometry is respected');
page.get('entry').value='9.9';page.get('entry').listeners.input();
assert.equal(page.get('copyAll').disabled,true,'cannot sell below short lower bound');
page=load({deadline:'nonsense'});
assert.match(page.get('invalid').textContent,/non validi/);
assert.ok(page.buttons.every(b=>b.disabled));
page=load({qty:'100000'});assert.equal(page.get('copyAll').disabled,true,'risk breach blocks copy');
page=load({plan:'',deadline:'',bound:''});assert.equal(page.get('copyAll').disabled,false,'legacy links remain usable when risk is valid');
console.log('8 order-card behavior checks passed');
