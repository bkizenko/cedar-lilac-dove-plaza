// A detached process keeps the local preview alive after its startup shell ends.
// Use the npm script so the project's app-environment wrapper stays in effect.
import {spawn} from 'node:child_process';
import {openSync,closeSync,mkdirSync} from 'node:fs';
const port=process.env.DAWN_PORT||'8080';
if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw new Error('Invalid preview port');
mkdirSync('.preview',{recursive:true});
const log=openSync('.preview/dev.log','a');
try{
  const child=spawn('npm',['run','dev','--','--port',port,'--strictPort'],{detached:true,stdio:['ignore',log,log],env:process.env});
  child.on('error',error=>{console.error(error.message);process.exitCode=1;});
  child.unref();
}finally{closeSync(log);}
