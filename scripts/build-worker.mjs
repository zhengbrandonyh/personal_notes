import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.jpg':'image/jpeg','.json':'application/json; charset=utf-8'};
const assets={};
async function walk(directory){for(const item of await readdir(directory,{withFileTypes:true})){if(item.name==='server'||item.name==='.openai')continue;const file=path.join(directory,item.name);if(item.isDirectory())await walk(file);else assets['/'+path.relative('dist',file).split(path.sep).join('/')]={type:types[path.extname(file)]||'application/octet-stream',body:(await readFile(file)).toString('base64')};}}
await walk('dist');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js','const ASSETS = '+JSON.stringify(assets)+';\n'+await readFile('worker/index.js','utf8'));
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json','utf8'));
console.log('Worker built with '+Object.keys(assets).length+' embedded assets');
