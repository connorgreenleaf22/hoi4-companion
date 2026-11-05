import {expect,type Page} from '@playwright/test';
import path from 'node:path';

export async function createAndCompareStrategies(p:Page,output:string){
 const work=p.getByRole('region',{name:'Strategy workbench'});
 await work.getByLabel('Find objective').fill('GER_construct_the_reichsautobahn');
 const objective=work.getByLabel('Desired focus').getByRole('option',{name:/GER_construct_the_reichsautobahn/});await expect(objective).toHaveCount(1);
 await work.getByLabel('Desired focus').selectOption((await objective.getAttribute('value'))!);
 for(const [i,name] of ['Economic route','Four-year route'].entries()){
  await work.getByRole('button',{name:'Explore prerequisite routes'}).click();await expect(work.getByRole('region',{name:'Route 2',exact:true})).toBeVisible();
  const route=work.getByRole('region',{name:`Route ${i+1}`,exact:true});
  await expect(route.getByRole('button',{name:i?'The Four-Year Plan':'Prioritize Economic Growth',exact:true})).toBeVisible();
  await work.getByRole('button',{name:`Draft route ${i+1} as new alternative`}).click();await p.getByLabel('Plan name').fill(name);
  await expect(p.getByRole('button',{name:'Apply reviewed plan'})).toBeEnabled();await p.getByRole('button',{name:'Apply reviewed plan'}).click();await expect(p.getByText('Reviewed plan applied. Actual completion history is unchanged.')).toBeVisible();
 }
 await verifyStrategyComparison(p);
 const refs=work.getByRole('region',{name:'Decision and research references'});await expect(refs.locator('.strategy-reference-list article').first()).toBeVisible();
 await refs.getByLabel('Planning reference type').selectOption('technology');await refs.getByLabel('Search planning references').fill('basic_machine_tools');await expect(refs.getByRole('button',{name:'Basic Machine Tools',exact:true})).toBeVisible();
 await refs.getByText('Costs, conditions and defined benefits',{exact:true}).click();await expect(refs.locator('pre')).toContainText('research_cost');
 await p.screenshot({path:path.join(output,'strategy-comparison.png'),fullPage:true});
 await p.setViewportSize({width:390,height:844});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Strategy mobile overflow');await p.screenshot({path:path.join(output,'strategy-mobile.png'),fullPage:true});await p.setViewportSize({width:1440,height:1100});
}
export async function verifyStrategyComparison(p:Page){
 const work=p.getByRole('region',{name:'Strategy workbench'});
 await work.getByLabel('Compare Economic route',{exact:true}).check();await work.getByLabel('Compare Four-year route',{exact:true}).check();await work.getByRole('button',{name:'Compare selected strategies'}).click();
 const results=work.getByRole('region',{name:'Comparison results'});await expect(results).toContainText('1 shared focus definitions. 1 mutually exclusive branch pairs');
 await expect(results).toContainText('GER_prioritize_economic_growth');await expect(results).toContainText('GER_the_four_year_plan');
 await expect(p.getByRole('region',{name:'Recorded planning baseline'})).toContainText('Unavailable: research, completed focuses');
}
