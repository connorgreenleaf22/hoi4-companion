import {execFileSync} from 'node:child_process';
import type {ProcessIdentity} from './owned-session';
/** OS metadata only. No input, game memory, Live Tools or focus adapter is used. */
export function readProcessIdentity(pid:number):ProcessIdentity {
 if(process.platform!=='win32'||!Number.isSafeInteger(pid)||pid<1)throw Error('A Windows process ID is required');
 const command=`$ErrorActionPreference='Stop'; $targetProcess=Get-Process -Id ${pid}; $heldHandle=$targetProcess.Handle; @{pid=[int]$targetProcess.Id;creation_time=$targetProcess.StartTime.ToUniversalTime().ToFileTimeUtc().ToString();executable_path=$targetProcess.Path} | ConvertTo-Json -Compress`;
 const value=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true,timeout:10000,stdio:['pipe','pipe','pipe']}));
 return {pid:value.pid,creation_time:value.creation_time,executable_path:value.executable_path};
}

/** Terminate through the retained OS handle, never a second lookup of a potentially reused PID. */
export function terminateOwnedProcess(expected:ProcessIdentity){
 if(process.platform!=='win32'||!Number.isSafeInteger(expected.pid)||expected.pid<1)throw Error('A Windows owned process is required');
 const command=`$ErrorActionPreference='Stop'
$expectedProcess = ($input | Out-String | ConvertFrom-Json)
$ownedProcess = Get-Process -Id $expectedProcess.pid
try {
 $heldHandle = $ownedProcess.Handle
 if ($ownedProcess.StartTime.ToUniversalTime().ToFileTimeUtc().ToString() -cne $expectedProcess.creation_time -or $ownedProcess.Path -cne $expectedProcess.executable_path) { throw 'Owned process identity mismatch; no termination' }
 Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class OwnedTestTermination { [DllImport("kernel32.dll", SetLastError=true)] public static extern bool TerminateProcess(IntPtr handle, uint code); }'
 if (![OwnedTestTermination]::TerminateProcess($heldHandle, 0)) { throw 'Owned handle termination failed' }
 if (!$ownedProcess.WaitForExit(5000)) { throw 'Owned process exit unconfirmed' }
} finally { $ownedProcess.Dispose() }`;
 execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input:JSON.stringify(expected),encoding:'utf8',windowsHide:true,timeout:10000,stdio:['pipe','pipe','pipe']});
}
