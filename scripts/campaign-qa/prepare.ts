import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {playerMod,PLAYER_VERSION,sha} from '../../server/campaign-qa/telemetry';
// Only creates a new package below ignored repository storage. Never writes a personal profile/playset.
const producer=randomBytes(8).toString('hex'),directory=path.resolve('.bridge-local','qa-mod-'+producer),mod=path.join(directory,'companion_player_telemetry');
const generated=playerMod(producer);
for(const area of ['on_actions','scripted_effects'])fs.mkdirSync(path.join(mod,'common',area),{recursive:true});
fs.writeFileSync(path.join(mod,'common/on_actions/hoi4_companion_qa.txt'),generated.hooks);
fs.writeFileSync(path.join(mod,'common/scripted_effects/hoi4_companion_qa.txt'),generated.effects);
const descriptor='name="HOI4 Companion Player Observation Pilot"\nversion="0.1.0"\nsupported_version="1.19.4.*"\ntags={ "Utilities" }\n';
fs.writeFileSync(path.join(mod,'descriptor.mod'),descriptor);
fs.writeFileSync(path.join(directory,'companion_player_telemetry.mod'),descriptor+`path="${mod.replaceAll('\\','/')}"\n`);
const manifest={schemaVersion:1,producer,gameVersion:PLAYER_VERSION,modDirectory:mod,descriptor:path.join(directory,'companion_player_telemetry.mod'),hooksSHA256:sha(generated.hooks),effectsSHA256:sha(generated.effects),wireLength:generated.wireLength,qualification:'candidate; no native country coverage claimed',normalProfileModified:false};
fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
