const fs=require('node:fs'),path=require('node:path');const dir=path.resolve(__dirname,'../messages');
function key(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return 'm'+(h>>>0).toString(16);}
const normalize=s=>s.replaceAll('&apos;',"'").replaceAll('&amp;','&').replaceAll('&quot;','"');
const sources=JSON.parse(fs.readFileSync(path.join(dir,'sources.json'),'utf8')).map(normalize);const catalogs={en:{},ar:{},fr:{},es:{}};
const translations=new Map();
for(const line of fs.readFileSync(path.join(dir,'translations.tsv'),'utf8').split(/\r?\n/).filter(Boolean)){
 const row=line.split('|');if(row.length!==4)throw new Error(`Expected 4 columns: ${line}`);if(translations.has(row[0]))throw new Error(`Duplicate source: ${row[0]}`);translations.set(row[0],row);
}
const missing=[];
for(const source of new Set([...sources,...translations.keys()])){
 const id=key(source);if(catalogs.en[id]&&catalogs.en[id]!==source)throw new Error(`Message key collision: ${source}`);catalogs.en[id]=source;
 const row=translations.get(source);
 if(!row){missing.push(source);continue;}
 ['ar','fr','es'].forEach((lang,i)=>catalogs[lang][id]=row[i+1]);
 const vars=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
 if(row.slice(1).some(t=>vars(t)!==vars(source)))throw new Error(`Placeholder mismatch: ${source}`);
}
for(const [lang,catalog]of Object.entries(catalogs))fs.writeFileSync(path.join(dir,`${lang}.json`),JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify(missing,null,2)); console.log(`${Object.keys(catalogs.en).length} messages; ${missing.length} English fallbacks`);
