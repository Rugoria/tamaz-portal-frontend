const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file){const testModule={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(code,{module:testModule,exports:testModule.exports,require,Intl,Date});return testModule.exports;}
const {translateText,messageKey}=load('i18n/text.ts');const en=require('../messages/en.json');
test('all locales cover English messages and preserve placeholders',()=>{
 for(const lang of ['ar','fr','es']){const catalog=require(`../messages/${lang}.json`);for(const [key,source]of Object.entries(en)){assert.ok(catalog[key],`${lang}: ${source}`);const variables=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join();assert.equal(variables(source),variables(catalog[key]),`${lang}: ${source}`);}}
});
test('English fallback, whitespace, entities, interpolation and record values',()=>{
 assert.equal(translateText({},'Missing message'),'Missing message');
 const fr=require('../messages/fr.json');assert.equal(translateText(fr,' Sign in '),' Se connecter ');
 assert.equal(translateText(en,"I&apos;m a doctor, register"),"I'm a doctor, register");
 assert.equal(translateText(fr,'Notifications, {v0} unread',{v0:3}),'Notifications, 3 non lues');
 assert.equal(translateText(fr,'Amira Hassan'),'Amira Hassan');
 assert.equal(en[messageKey('Sign in')],'Sign in');
});
test('dates and relative time follow locale',()=>{
 const formats=load('lib/format.ts');assert.match(formats.dateOnly('2026-10-12T12:00:00Z','fr'),/oct\./);
 assert.match(formats.dateOnly('2026-10-12T12:00:00Z','es'),/oct/);
 assert.match(formats.dateOnly('2026-10-12T12:00:00Z','ar'),/[\u0600-\u06ff]/);
 assert.match(formats.relative(new Date(Date.now()-120000).toISOString(),'fr'),/minutes/);
 assert.equal(formats.dateOnly(null,'ar'),'');
});
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name.endsWith('.tsx')?[path.join(dir,e.name)]:[]);}
test('USD formatting follows language without converting amounts',()=>{
 const {formatCurrency}=load('lib/format.ts');
 assert.equal(formatCurrency(12345.67,'en'),'USD\u00a012,345.67');
 assert.equal(formatCurrency(12345.67,'fr'),'12\u202f345,67\u00a0USD');
 assert.equal(formatCurrency(12345.67,'es'),'12.345,67\u00a0USD');
 const arabic=formatCurrency(12345.67,'ar');
 assert.match(arabic,/USD/);
 assert.equal(arabic.replace(/[\u200e\u200f\u061c\s]/g,'').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/٬/g,',').replace(/٫/g,'.'),'12,345.67USD');
 assert.equal(formatCurrency(0),'USD\u00a00.00');
 assert.equal(formatCurrency(-25),'\u002dUSD\u00a025.00');
 assert.equal(formatCurrency(1.235),'USD\u00a01.24');
 assert.equal(formatCurrency(12345.67,'unsupported'),formatCurrency(12345.67,'en'));
 for(const value of [null,undefined,NaN,Infinity,-Infinity]) assert.equal(formatCurrency(value,'fr'),'');
});
test('every literal translation call exists in the catalog',()=>{
 for(const file of [...files(path.join(root,'app')),...files(path.join(root,'components'))]){const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),99,true,ts.ScriptKind.TSX);function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(sf)==='translate'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const source=n.arguments[0].text.replaceAll('&apos;',"'").replaceAll('&amp;','&').replaceAll('&quot;','"').trim();assert.ok(en[messageKey(source)],`${file}: ${source}`);}ts.forEachChild(n,visit);}visit(sf);}
});
