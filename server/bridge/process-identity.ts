import {execFileSync} from 'node:child_process';
import type {ProcessIdentity} from './owned-session';
/** OS metadata only. No input, game memory, Live Tools or focus adapter is used. */
export function readProcessIdentity(pid:number):ProcessIdentity {
 if(process.platform!=='win32'||!Number.isSafeInteger(pid)||pid<1)throw Error('A Windows process ID is required');
 const command=`$ErrorActionPreference='Stop'; $targetProcess=Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"; if (!$targetProcess) { throw 'Owned process has exited' }; @{pid=[int]$targetProcess.ProcessId;creation_time=$targetProcess.CreationDate.ToUniversalTime().ToFileTimeUtc().ToString();executable_path=$targetProcess.ExecutablePath} | ConvertTo-Json -Compress`;
 const value=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true,timeout:10000}));
 return {pid:value.pid,creation_time:value.creation_time,executable_path:value.executable_path};
}
