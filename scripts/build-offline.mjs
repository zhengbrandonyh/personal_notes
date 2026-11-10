import fs from 'node:fs';
import path from 'node:path';
let html=fs.readFileSync('dist/index.html','utf8');
html=html.replace(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,src)=>'<script type="module">'+fs.readFileSync(path.join('dist',src.replace(/^\//,'')),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g,(_,src)=>'<style>'+fs.readFileSync(path.join('dist',src.replace(/^\//,'')),'utf8')+'</style>');
html=html.replace(/<link\b[^>]*(?:https:\/\/fonts\.|rel="modulepreload")[^>]*>/g,'');
fs.writeFileSync('dist/daynight-offline.html',html);
// Retired prototype exports and design archives are not production assets.
for(const file of ['dist/DayNight_昼夜簿_单文件本地版.html','dist/assets/aistudio/DayNight-design-handoff_b4ab122d.zip'])if(fs.existsSync(file))fs.unlinkSync(file);
console.log('Offline v2 HTML:',Buffer.byteLength(html),'bytes');
