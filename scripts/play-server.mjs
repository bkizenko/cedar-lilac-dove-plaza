// A production snapshot: no file watcher or hot reload can interrupt a village.
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
export function staticPath(root,url){
  let path;try{path=decodeURIComponent(new URL(url,'http://localhost').pathname);}catch{return null;}
  const file=resolve(root,'.'+path);
  return file.startsWith(resolve(root)+sep)?file:null;
}
export const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
export function createPlayServer(root,app){
  return createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||'/','http://127.0.0.1');
      if(url.pathname==='/__hearthwild_health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({service:'hearthwild-play',release:root.split(sep).pop()}));return;}
      const file=staticPath(resolve(root,'static'),url.href);
      if(file&&existsSync(file)&&statSync(file).isFile()){
        if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
        res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});
        res.end(req.method==='HEAD'?undefined:readFileSync(file));return;
      }
      if(url.pathname.startsWith('/assets/')){res.writeHead(404);res.end('Asset unavailable');return;}
      const method=req.method||'GET',headers=new Headers();
      for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
      const request=new Request('http://127.0.0.1:'+ (process.env.PLAY_PORT||8086)+req.url,{method,headers,...(!['GET','HEAD'].includes(method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
      const response=await app.fetch(request);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      if(req.method==='HEAD'||!response.body){res.end();return;}
      for await(const chunk of response.body)res.write(chunk);
      res.end();
    }catch(error){console.error(error);if(!res.headersSent)res.writeHead(500);res.end('Unable to load the game. Your browser save is unchanged.');}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=resolve(process.argv[2]||'.play/current'),port=Number(process.env.PLAY_PORT||8086);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid play port');
 const {default:app}=await import(pathToFileURL(resolve(root,'functions/__server.func/index.mjs')).href);
 const server=createPlayServer(root,app);server.listen(port,'127.0.0.1',()=>console.log('Hearthwild play server: http://127.0.0.1:'+port));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
