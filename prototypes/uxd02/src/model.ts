import { z } from 'zod';
export const prompts = {
  ideas: 'What are some interesting alternate-history campaigns I could try?',
  military: "I'm playing Germany in 1939 and want to prepare for invading the Soviet Union in 1941. Help me build an effective military.",
  next: 'What should I do next in my current campaign?'
};
export type Scenario = keyof typeof prompts;
export const ideas = [
  {id:'portugal',country:'Portugal',flag:'pt',title:'An empire across the Atlantic',path:'Monarchist restoration',difficulty:'Measured challenge',style:'Diplomacy & branching events',opportunity:'Build a transatlantic power around a Portuguese–Brazilian ambition.',risk:'Political prerequisites and Brazil’s response can redirect the run.',prep:'Review restoration conditions, stabilize at home, and prepare a fallback if Brazil refuses.',dlc:'Portugal content and active DLC need confirmation'},
  {id:'sweden',country:'Sweden',flag:'se',title:'A different northern alliance',path:'Nordic unification ambition',difficulty:'Demanding',style:'Regional expansion & logistics',opportunity:'Turn a smaller industrial base into a regional project.',risk:'Timing, neighbors and a long coastline stretch limited resources.',prep:'Choose a regional objective, build a defensive core, and check your active focus tree before committing.',dlc:'Nordic content and active DLC need confirmation'},
  {id:'france',country:'France',flag:'fr',title:'Rewrite the balance of Europe',path:'A monarchist comeback',difficulty:'High pressure',style:'Domestic politics & recovery',opportunity:'Rebuild political strength while shaping a different European order.',risk:'Internal recovery competes with the need to prepare for external threats.',prep:'Check the available restoration route, protect the home front, and delay optional expansion until the economy is ready.',dlc:'France content and active DLC need confirmation'}
];
const planSchema=z.object({id:z.string(),title:z.string(),country:z.string(),kind:z.enum(['military','idea']),ideaId:z.string().optional(),stance:z.enum(['balanced','economy','breakthrough']),infantry:z.number().int().min(1).max(20),artillery:z.number().int().min(0).max(5),tank:z.enum(['Balanced medium','Economy medium','Heavy breakthrough']),notes:z.string().max(4000),revision:z.number().int().min(0),dirty:z.boolean(),override:z.boolean()});
export type Plan=z.infer<typeof planSchema>;
export const newMilitary=():Plan=>({id:'germany-1941',title:'Prepare for the eastern front',country:'Germany',kind:'military',stance:'balanced',infantry:9,artillery:1,tank:'Balanced medium',notes:'Prepare through 1940. Review supply and air readiness before committing in 1941.',revision:0,dirty:false,override:false});
export const newIdea=(id:string):Plan=>{const idea=ideas.find(i=>i.id===id)!;return {...newMilitary(),id:'idea-'+id,title:idea.title,country:idea.country,kind:'idea',ideaId:id,notes:idea.prep};};
const messageSchema=z.object({id:z.string(),text:z.string(),scenario:z.enum(['ideas','military','next','unsupported']),answer:z.string()});
export type Message=z.infer<typeof messageSchema>;
const stateSchema=z.object({version:z.literal(1),plan:planSchema,drafts:z.record(z.string(),planSchema).default({}),saved:z.array(z.object({key:z.string(),type:z.enum(['Strategy','Design']),plan:planSchema})),messages:z.array(messageSchema),preferences:z.array(z.enum(['Fun','Winning','Efficiency'])).length(3).refine(a=>new Set(a).size===3),observation:z.enum(['none','stale','partial']),manual:z.string(),developer:z.boolean(),interruptions:z.boolean(),chimes:z.boolean()});
export type State=z.infer<typeof stateSchema>;
export const initial=():State=>({version:1,plan:newMilitary(),drafts:{},saved:[],messages:[],preferences:['Fun','Winning','Efficiency'],observation:'none',manual:'',developer:false,interruptions:false,chimes:false});
export const STORAGE_KEY='hoi4-uxd02.synthetic.v1';
export function loadState():{state:State;warning:string}{
  let raw:string|null;
  try{raw=localStorage.getItem(STORAGE_KEY);}catch{return {state:initial(),warning:'Local storage is unavailable. Your work will last for this session only.'};}
  if(!raw)return {state:initial(),warning:''};
  try{const parsed=stateSchema.safeParse(JSON.parse(raw));if(parsed.success)return {state:parsed.data,warning:''};}catch{/* Preserve an unreadable copy until explicit recovery. */}
  return {state:initial(),warning:'Stored demo data could not be read. A fresh demo is open; the stored copy has not been changed.'};
}
export function classify(text:string):Message['scenario']{if(/alternate|history|campaigns|portugal|sweden|france/i.test(text))return 'ideas';if(/germany|soviet|military|tank|army|1941/i.test(text))return 'military';if(/next|current campaign|connection|snapshot/i.test(text))return 'next';return 'unsupported';}
export function answer(scenario:Message['scenario'],state:State){
  if(scenario==='military')return `Build a dependable infantry line, a concentrated mobile force, and enough fighters to support it. Give logistics its own preparation phase before 1941. With ${state.preferences[0].toLowerCase()} first, ${state.preferences[0]==='Fun'?'keep a small experimental armored force':state.preferences[0]==='Winning'?'protect readiness before taking ambitious risks':'standardize equipment before adding more designs'}. This is a conditional demonstration plan; your stockpiles and current army are unknown.`;
  if(scenario==='ideas')return `Three illustrative routes to explore, ordered for ${state.preferences[0].toLowerCase()}. Compare the style of play and risks below. These are editorial examples, not verified eligibility or calculated rankings.`;
  if(scenario==='next'&&state.manual.trim())return `You report: ${state.manual.trim()} This is a player statement, not a verified observation. I will use your declared objective as a planning premise. First review equipment, supply and research against that objective; confirm missing campaign details before a specific commitment. No live readiness is inferred.`;
  if(scenario==='next')return state.observation==='none'?'I have no connected campaign to inspect. Tell me your country, game date, and immediate goal. Meanwhile, review equipment shortages, supply and research before starting a new operation.':state.observation==='stale'?'The sample snapshot is 18 hours old: Germany, 1 September 1939. Treat it as history, not your current army. Confirm the date and any major changes before using specific advice.':'The sample observation supplies country and date only. Army strength, stockpiles and active focus are unavailable. Confirm your objective; general preparation advice can still help.';
  return 'This offline prototype supports three demonstrations: campaign ideas, Germany military preparation, and incomplete campaign observations. Choose a suggestion below; no AI request was sent.';
}
export const sections=[
  {title:'Focus & industry',phase:'1939 · Establish the base',icon:'factory',body:'Prioritize industrial capacity and relevant army preparation. Check the active focus tree, prerequisites and diplomatic consequences before selecting a route.',risk:'Exact focus order depends on your version, DLC and completed focuses.'},
  {title:'Research',phase:'1939–40 · Close the gaps',icon:'research',body:'Review infantry equipment, artillery, industry, fighters and medium armor. Sequence upgrades around available research slots and production plans.',risk:'Research completion dates and ahead-of-time costs are not calculated.'},
  {title:'Production',phase:'1940 · Stabilize output',icon:'factory',body:'Keep infantry equipment and support needs covered, then expand tanks, trucks and fighters. Avoid changing every production line at once.',risk:'Factory allocations need your stockpiles, output and resource access.'},
  {title:'Air power',phase:'1940–41 · Build support',icon:'air',body:'Create a fighter core and a smaller close-air-support force. Check range, airfields and fuel against the intended theater.',risk:'Illustrative aircraft concept: prioritize range and reliable output; modules and performance are unverified.'},
  {title:'Army & equipment',phase:'1940–41 · Train together',icon:'army',body:'Use infantry to hold the line and a concentrated armored group for selected advances. Keep reserve equipment for training and replacement.',risk:'Division and tank concepts are editable below; no combat outcome is predicted.'},
  {title:'Logistics & timing',phase:'Before the 1941 commitment',icon:'logistics',body:'Check rail connections, supply hubs, trucks, trains and fuel. Reassess readiness before committing; the calendar alone is not a go signal.',risk:'Terrain, weather, opponent strength and live supply remain unknown.'}
];
