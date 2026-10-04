// User-level macOS service: starts at login, restarts after crashes, never watches source.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),label='com.hearthwild.play';
if(process.platform!=='darwin')throw new Error('This service installer is for macOS. npm run play works on other systems.');
if(!existsSync(resolve(root,'.play/current')))throw new Error('Publish a tested play release first.');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const plist=resolve(homedir(),'Library/LaunchAgents',label+'.plist');
mkdirSync(dirname(plist),{recursive:true});
writeFileSync(plist,`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${escape(process.execPath)}</string><string>${escape(resolve(root,'scripts/play-server.mjs'))}</string><string>${escape(resolve(root,'.play/current'))}</string></array>
<key>WorkingDirectory</key><string>${escape(root)}</string>
<key>EnvironmentVariables</key><dict><key>PLAY_PORT</key><string>8086</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>5</integer>
<key>StandardOutPath</key><string>${escape(resolve(root,'.play/server.log'))}</string>
<key>StandardErrorPath</key><string>${escape(resolve(root,'.play/server.log'))}</string>
</dict></plist>\n`);
const domain='gui/'+process.getuid();
try{execFileSync('/bin/launchctl',['bootout',domain+'/'+label],{stdio:'ignore'});}catch{}
execFileSync('/bin/launchctl',['bootstrap',domain,plist],{stdio:'inherit'});
execFileSync('/bin/launchctl',['kickstart',domain+'/'+label],{stdio:'inherit'});
console.log('Stable game service installed on port 8086; it restarts after crashes and at login.');
