import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {startServer} from '../server/api';

async function main(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-ui-'));
  const artifacts=path.resolve('artifacts');fs.mkdirSync(artifacts,{recursive:true});
  const service=await startServer({dataDir:directory,port:0});
  const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright');
  const cached=fs.existsSync(cache)?fs.readdirSync(cache).filter(d=>/^chromium-\d+$/.test(d)).sort().at(-1):undefined;
  const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(cached?path.join(cache,cached,'chrome-win64','chrome.exe'):undefined);
  const browser=await chromium.launch({headless:true,executablePath});
  const errors:string[]=[];
  try{
    const context=await browser.newContext({viewport:{width:1500,height:1000}});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(service.url);await expect(page.getByRole('heading',{name:/Command center/})).toBeVisible();
    await page.getByRole('button',{name:'Create a campaign',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Campaign setup'});
    await dialog.getByLabel('Campaign name').fill('QA Germany');await dialog.getByRole('button',{name:'Save campaign'}).click();await expect(dialog).toHaveCount(0);
    await page.screenshot({path:path.join(artifacts,'desktop-overview.png'),fullPage:true});
    await page.getByRole('button',{name:'Countries & focuses',exact:true}).click();
    await page.getByLabel('Focus tree',{exact:true}).selectOption('focus_tree:common/national_focus/germany.txt:german_focus');
    await page.getByRole('button',{name:'List view',exact:true}).click();
    await page.getByLabel('Find focus',{exact:true}).fill('GER_oppose_hitler_ww');
    await expect(page.locator('.focus-list-row')).toHaveCount(1);
    await page.locator('.focus-list-row>button').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Add to queue',exact:true}).click();
    await page.getByRole('button',{name:'Close reference'}).click();await expect(page.locator('.queue-item')).toHaveCount(1);
    await page.reload();await page.getByRole('button',{name:'Countries & focuses',exact:true}).click();await expect(page.locator('.queue-item')).toHaveCount(1);
    await page.screenshot({path:path.join(artifacts,'desktop-focus-planner.png'),fullPage:true});
    await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();await page.getByLabel('Filter reference entries').fill('infantry_equipment_1');
    await expect(page.locator('.reference-card')).toHaveCount(1);await page.locator('.reference-card').click();
    await expect(page.getByText('Base equipment stats',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Bookmark',exact:true}).click();await page.getByLabel('Reference notes').fill('QA persistence note');await page.getByRole('button',{name:'Save note',exact:true}).click();
    await page.getByRole('button',{name:'Close reference'}).click();await page.reload();await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();await page.getByRole('button',{name:'Bookmarks',exact:true}).click();await expect(page.locator('.reference-card')).toHaveCount(1);await page.locator('.reference-card').click();await expect(page.getByLabel('Reference notes')).toHaveValue('QA persistence note');await page.getByRole('button',{name:'Close reference'}).click();
    await page.getByRole('button',{name:'Division & production',exact:true}).click();await expect(page.getByText('216,000 personnel',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Save template',exact:true}).click();await expect(page.locator('.saved-template')).toHaveCount(1);
    await page.getByRole('button',{name:'Campaign ideas',exact:true}).click();await expect(page.getByRole('heading',{name:/Elizabeth II/})).toHaveCount(0);await page.getByRole('button',{name:'Secrets hidden'}).click();await expect(page.getByRole('heading',{name:/Elizabeth II/})).toBeVisible();
    await page.getByRole('button',{name:'Sources & settings',exact:true}).click();await page.getByRole('button',{name:'Enable phone access'}).click();
    const status=await fetch(`${service.url}/api/v1/status`).then(r=>r.json());
    const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto(`http://127.0.0.1:${status.network.port}`);await expect(mobile.getByRole('button',{name:'Connect',exact:true})).toBeVisible();await mobile.getByLabel('Pairing code').fill(status.network.code);await mobile.getByRole('button',{name:'Connect',exact:true}).click();await expect(mobile.getByRole('heading',{name:/Command center/})).toBeVisible();
    await mobile.screenshot({path:path.join(artifacts,'phone-overview.png'),fullPage:true});
    await mobile.getByRole('button',{name:'Countries & focuses',exact:true}).click();await expect(mobile.locator('.queue-item')).toHaveCount(1);await mobile.screenshot({path:path.join(artifacts,'phone-planner.png'),fullPage:true});
    const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);if(overflow)throw new Error('Phone layout overflows viewport.');
    await mobileContext.close();await context.close();if(errors.length)throw new Error(errors.join('\n'));
    console.log('UI smoke passed: campaign setup, focus queue persistence, reference notes/bookmarks, template save, spoilers, paired phone access, and responsive layout.');
    console.log(`Screenshots: ${artifacts}`);
  }finally{await browser.close();await service.close();if(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep))fs.rmSync(directory,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

