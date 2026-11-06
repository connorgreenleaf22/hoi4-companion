import {expect,type Page} from '@playwright/test';
import path from 'node:path';

export async function createAndCompareStrategies(p:Page,output:string){
 const work=p.getByRole('region',{name:'Strategy workbench'});
 const field=work.getByRole('combobox',{name:'Find an objective'});
 await field.fill('GER_industrial_expansion');await expect(work.getByRole('option',{name:/Industrial Expansion/})).toBeVisible();await field.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(output,'objective-suggestions.png')});await field.press('ArrowDown');await field.press('Enter');
 const selected=work.getByRole('region',{name:'Selected objective'});await selected.getByText('Requirements and detailed mechanics',{exact:true}).click();await expect(selected.getByText('Every numbered requirement below is required (AND).',{exact:true})).toBeVisible();await expect(selected).toContainText('Housing Developments');await expect(selected).toContainText('Lower Taxes');
 await field.fill('GER_prioritize_economic_growth');await expect(work.getByRole('option',{name:/Prioritize Economic Growth/})).toBeVisible();await field.press('ArrowDown');await field.press('Enter');await expect(selected).toContainText('Decrease stability by 10 percentage points.');await selected.getByText('Requirements and detailed mechanics',{exact:true}).click();await expect(selected.getByText(/These focuses are mutually exclusive/)).toBeVisible();
 await selected.screenshot({path:path.join(output,'objective-explained.png')});
 await selected.getByRole('button',{name:'Open objective details'}).click();const detail=p.getByRole('dialog',{name:'Prioritize Economic Growth'});await expect(detail.getByRole('region',{name:'Game mechanics explained'})).toContainText('Decrease stability by 10 percentage points.');await expect(detail.locator('pre:visible')).toHaveCount(0);await detail.getByText('Advanced technical source & provenance',{exact:true}).click();await detail.getByText('Inspect full source block',{exact:true}).click();await expect(detail.locator('pre:visible')).toContainText('add_stability');await p.getByRole('button',{name:'Close reference',exact:true}).click();
 await field.fill('GER_construct_the_reichsautobahn');await expect(work.getByRole('option',{name:/GER_construct_the_reichsautobahn/})).toBeVisible();await field.press('Escape');await expect(work.getByRole('listbox')).toHaveCount(0);await field.press('ArrowDown');await field.press('Enter');
 await expect(selected).toContainText('Construct the [GetAutobahnName]');
 for(const [i,name] of ['Economic route','Four-year route'].entries()){
  await work.getByRole('button',{name:'Explore prerequisite routes'}).click();await expect(work.getByRole('region',{name:'Route 2',exact:true})).toBeVisible();
  const route=work.getByRole('region',{name:`Route ${i+1}`,exact:true});
  await expect(route.getByRole('button',{name:i?'The Four-Year Plan':'Prioritize Economic Growth',exact:true})).toBeVisible();
  await work.getByRole('button',{name:`Draft route ${i+1} as new alternative`}).click();await p.getByLabel('Plan name').fill(name);
  await expect(p.getByRole('button',{name:'Apply reviewed plan'})).toBeEnabled();await p.getByRole('button',{name:'Apply reviewed plan'}).click();await expect(p.getByText('Reviewed plan applied. Actual completion history is unchanged.')).toBeVisible();
 }
 await verifyStrategyComparison(p);
 const refs=work.getByRole('region',{name:'Decision and research references'});await refs.getByText('Look up decisions and technologies',{exact:true}).click();await expect(refs.locator('.strategy-reference-list article').first()).toBeVisible();
 await refs.getByLabel('Planning reference type').selectOption('technology');await refs.getByLabel('Search planning references').fill('basic_machine_tools');await expect(refs.getByRole('button',{name:'Basic Machine Tools',exact:true})).toBeVisible();
 await expect(refs).toContainText('Base research-cost factor:');await expect(refs.locator('pre:visible')).toHaveCount(0);await refs.getByText('Advanced technical source',{exact:true}).click();await expect(refs.locator('pre:visible')).toContainText('research_cost');await refs.getByText('Advanced technical source',{exact:true}).click();
 await p.screenshot({path:path.join(output,'strategy-comparison.png'),fullPage:true});
 await p.setViewportSize({width:390,height:844});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Strategy mobile overflow');await field.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(output,'strategy-mobile.png')});await p.setViewportSize({width:1440,height:1100});
}
export async function verifyStrategyComparison(p:Page){
 const work=p.getByRole('region',{name:'Strategy workbench'});
 await work.getByLabel('Compare Economic route',{exact:true}).check();await work.getByLabel('Compare Four-year route',{exact:true}).check();await work.getByRole('button',{name:'Compare selected strategies'}).click();
 const results=work.getByRole('region',{name:'Comparison results'});await expect(results).toContainText('1 shared focus definitions. 1 mutually exclusive branch pairs');
 await expect(results).toContainText('GER_prioritize_economic_growth');await expect(results).toContainText('GER_the_four_year_plan');
 await expect(p.getByRole('region',{name:'Recorded planning baseline'})).toContainText('Unavailable: research, completed focuses');
}

export async function verifyUniversalSearch(p:Page){
 const field=p.getByRole('combobox',{name:'Search all game content'});
 for(const query of ['Indonesia','INS','dUtCh EaSt','Dutch East Indes','Dutch East Indies']){
  await field.fill(query);await expect(p.getByRole('option').filter({hasText:'Countries'}).filter({hasText:'Indonesia'}).first()).toBeVisible();
 }
 const options=await p.getByRole('option').allTextContents();const countryIndex=options.findIndex(text=>text.startsWith('Countries')&&text.includes('Indonesia'));expect(countryIndex).toBeGreaterThanOrEqual(0);for(let i=0;i<=countryIndex;i++)await field.press('ArrowDown');await field.press('Enter');await expect(p.getByRole('dialog',{name:'Indonesia',exact:true})).toBeVisible();await p.getByRole('button',{name:'Close reference',exact:true}).click();await field.fill('');
}
