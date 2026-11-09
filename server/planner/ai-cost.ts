import type {AiUsage,AiPriceEstimate,AiCostPreview,AiContext,AiSettings} from '../../src/ai-planning-types';

export const PRICE_VERSION='openai-sol-2026-11-09-v1';
export const PRICE_SOURCE='https://developers.openai.com/api/docs/models/gpt-6.1-sol';
// USD / million tokens; standard, <=272K input, default 30-minute cache writes.
export const solPrices={input:2,cachedInput:.1,cacheWrite:2.5,output:10};
export const knownPrice=(model:string)=>/^gpt-6\.1-sol(?:-\d{4}-\d{2}-\d{2})?$/.test(model);
const round=(n:number)=>Math.ceil(n*1e8)/1e8;
export function usageCost(model:string,tier:string|undefined,usage:AiUsage|undefined):AiPriceEstimate{
 const base={pricingVersion:PRICE_VERSION,source:PRICE_SOURCE,currency:'USD' as const,billing:'estimate-not-invoice' as const};
 if(!knownPrice(model)||!['default','standard'].includes(tier||''))return {...base,usd:null,reason:'Model or returned service tier has no qualified price in this table.'};
 if(usage?.input===undefined||usage.output===undefined)return {...base,usd:null,reason:'Provider usage unavailable; reservation remains charged to the local budget.'};
 const {input,output}=usage,cached=usage.cachedInput??0,writes=usage.cacheWrite??Math.max(0,input-cached);
 if([input,output,cached,writes].some(n=>!Number.isSafeInteger(n)||n<0)||cached+writes>input||usage.reasoning!==undefined&&usage.reasoning>output)return {...base,usd:null,reason:'Inconsistent usage counters; local reservation retained.'};
 const multiplier=1;
 const long=input>272000?2:1,outLong=input>272000?1.5:1;
 const usd=round(((input-cached-writes)*2+cached*.1+writes*2.5)*long*multiplier/1e6+output*10*outLong*multiplier/1e6);
 return {...base,usd,reason:usage.cachedInput===undefined||usage.cacheWrite===undefined?'Cache details missing: unaccounted input conservatively priced as 30-minute cache writes.':'Reported usage × versioned rates. Reasoning is already included in output; not charged twice. Taxes, credits, discounts and provider adjustments are excluded.'};
}
export function costPreview(context:AiContext,settings:AiSettings,wireBytes:number):AiCostPreview{
 const inputTokens=Math.ceil(wireBytes/3.5),conservativeInputTokens=wireBytes+512;
 const priced=knownPrice(settings.model),estimatedUsd=priced?round((inputTokens*2.5+settings.maxOutputTokens*10)/1e6):null;
 const reservedUsd=priced?round((conservativeInputTokens*2.5*(conservativeInputTokens>272000?2:1)+settings.maxOutputTokens*10*(conservativeInputTokens>272000?1.5:1))/1e6):null;
 return {pricingVersion:PRICE_VERSION,inputTokens,conservativeInputTokens,maxOutputTokens:settings.maxOutputTokens,estimatedUsd,reservedUsd,method:'UTF-8 bytes / 3.5 estimate; byte-count + 512 input reservation; full output cap; no assumed cache discount. Not an exact tokenizer or billing guarantee.',fingerprint:context.fingerprint};
}
