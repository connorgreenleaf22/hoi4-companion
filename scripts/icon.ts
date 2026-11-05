import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
async function main(){
  const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright');
  const cached=fs.readdirSync(cache).filter(d=>/^chromium-\d+$/.test(d)).sort().at(-1)!;
  const browser=await chromium.launch({executablePath:path.join(cache,cached,'chrome-win64','chrome.exe')});
  try{
    const page=await browser.newPage({viewport:{width:256,height:256},deviceScaleFactor:1});
    await page.setContent(`<style>body{margin:0;background:transparent}</style>${fs.readFileSync('public/icon.svg','utf8')}`);
    const png=await page.screenshot({omitBackground:true});fs.mkdirSync('assets',{recursive:true});fs.writeFileSync('assets/icon.png',png);
    const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
    fs.writeFileSync('assets/icon.ico',Buffer.concat([header,png]));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
