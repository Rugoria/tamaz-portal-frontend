const test=require('node:test'),assert=require('node:assert/strict');const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const request=(path,options={})=>fetch(base+path,{redirect:'manual',...options});
test('locale detection: fallback, browser, saved preference, explicit URL',async()=>{
 for(const [path,headers,target]of [
 ['/login',{'accept-language':'en-US'},'/en/login'],
 ['/login',{'accept-language':'de-DE'},'/en/login'],
 ['/login',{'accept-language':'ar-SA,fr;q=0.8'},'/ar/login'],
 ['/login',{'accept-language':'es-MX','cookie':'tz_language=fr'},'/fr/login'],
 ]){const r=await request(path,{headers});assert.equal(new URL(r.headers.get('location'),base).pathname,target);assert.equal(r.headers.get('set-cookie'),null);}
 const r=await request('/ar/login',{headers:{cookie:'tz_language=fr'}});assert.equal(r.status,200);const html=await r.text();assert.match(html,/dir="rtl"/);assert.match(html,/تسجيل الدخول/);assert.equal(r.headers.get('set-cookie'),null);
});
test('translated pages render with matching document direction and localized links',async()=>{
 const titles={en:'Sign in',ar:'تسجيل الدخول',fr:'Se connecter',es:'Iniciar sesión'};
 for(const locale of ['en','ar','fr','es']){const r=await request(`/${locale}/login`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(titles[locale]));assert.ok(html.includes(`href="/${locale}/register"`));assert.ok(html.includes(`dir="${locale==='ar'?'rtl':'ltr'}"`));assert.ok(!html.includes('&amp;apos;'));assert.match(html,/noindex/);}
});
test('each portal keeps its locale when redirecting unauthenticated visitors',async()=>{
 for(const locale of ['en','ar','fr','es'])for(const portal of ['', 'admin','doctor','clinic','customer/aligners']){const r=await request(`/${locale}${portal ? '/' + portal : ''}`);assert.equal(new URL(r.headers.get('location'),base).pathname,`/${locale}/login`);}
});
test('preference storage requires explicit opt-in and validates requests',async()=>{
 const post=(body,origin=base)=>request('/api/preferences/language',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
 let r=await post({locale:'fr',remember:true});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/tz_language=fr/);assert.match(r.headers.get('set-cookie'),/HttpOnly/i);assert.match(r.headers.get('set-cookie'),/Max-Age=31536000/i);
 r=await post({locale:'ar',remember:false});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Max-Age=0/i);
 assert.equal((await post({locale:'xx',remember:true})).status,400);
 assert.equal((await post({locale:'fr',remember:'yes'})).status,400);
 assert.equal((await post({locale:'fr',remember:true},'https://other.example')).status,403);
});
