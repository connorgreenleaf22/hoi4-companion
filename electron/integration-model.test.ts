import {test} from 'node:test';
import assert from 'node:assert/strict';
import {integrationBounds,integrationModes,integrationPreferences,isIntegrationMode,nextIntegrationMode} from './integration-model';

test('untrusted preferences preserve only validated mode and booleans',()=>{
  assert.deepEqual(integrationPreferences({mode:'other',expanded:'false',pinned:0}),{mode:'sidecar',expanded:true,pinned:true});
  assert.deepEqual(integrationPreferences({mode:'hud',expanded:false,pinned:false,token:'ignored'}),{mode:'hud',expanded:false,pinned:false});
  assert.equal(isIntegrationMode('__proto__'),false);
  assert.equal(nextIntegrationMode('intel'),'workspace');
});

test('all modes including collapsed HUD stay in scaled/secondary work areas',()=>{
  for(const area of [{x:0,y:0,width:1920,height:1040},{x:-1280,y:-100,width:1280,height:680},{x:300,y:40,width:640,height:360}]){
    for(const mode of integrationModes)for(const expanded of [true,false]){
      const bounds=integrationBounds({mode,expanded,pinned:true},area);
      assert.ok(bounds.x>=area.x&&bounds.y>=area.y);
      assert.ok(bounds.x+bounds.width<=area.x+area.width);
      assert.ok(bounds.y+bounds.height<=area.y+area.height);
    }
  }
  const collapsed=integrationBounds({mode:'hud',expanded:false,pinned:true},{x:0,y:0,width:1920,height:1040});
  assert.equal(collapsed.height,160);
  for(const mode of ['sidecar','hud','intel'] as const){
    const bounds=integrationBounds({mode,expanded:true,pinned:true},{x:0,y:0,width:1536,height:824});
    assert.ok(bounds.y>=88,'Compact mode covers the game top bar: '+mode);
  }
});
