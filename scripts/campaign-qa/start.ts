import path from 'node:path';
import {startServer} from '../../server/api';
// Isolated companion data only. No HOI4 launch, shell/command tool or AI provider call.
async function main(){
const app=await startServer({dataDir:path.resolve('.bridge-local/qa-app'),port:0,autoIndex:process.argv.includes('--index')});
console.log('Local pilot panel: '+app.url+'/api/v1/campaign-qa/panel');
console.log('Q&A descriptor: '+path.resolve('.bridge-local/qa-app/campaign-qa-connection.json'));
console.log('References are available only after explicitly indexing the game in this isolated companion profile.');
let closing=false;const stop=async()=>{if(closing)return;closing=true;await app.close();process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
