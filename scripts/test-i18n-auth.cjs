// Read-only smoke test against the existing local demo accounts (the ones the backend's seed script creates). Never seeds data.
// Override with DEMO_PASSWORD, DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD if your local accounts differ.
const assert=require('node:assert/strict');const base=process.env.TEST_BASE_URL||'http://localhost:3000';
async function main(){
 const password=process.env.DEMO_PASSWORD||'longenough1';
 const accounts=[['CLINIC','northgate@example.com','clinic'],['DOCTOR','dr.okafor@example.com','doctor'],['CUSTOMER','amira.hale@example.com','customer/aligners']];
 accounts.unshift(['ADMIN',process.env.DEMO_ADMIN_EMAIL||'admin@orthodontics.local','admin',process.env.DEMO_ADMIN_PASSWORD||'ChangeMe123!']);
 for(const [role,email,home,override]of accounts){
  const login=await fetch(base+'/api/session/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:override||password})});
  assert.equal(login.status,200,`${role}: local demo login unavailable (${login.status})`);
  const cookies=login.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  for(const locale of ['en','ar','fr','es']){
   const page=await fetch(`${base}/${locale}/${home}`,{headers:{cookie:cookies},redirect:'manual'});assert.equal(page.status,200,`${role}/${locale}`);const html=await page.text();assert.ok(html.includes(`dir="${locale==='ar'?'rtl':'ltr'}"`));
   const cases=await fetch(base+'/api/cases?size=1',{headers:{cookie:cookies}});assert.equal(cases.status,200,`${role}: unchanged API access`);
  }
  const wrong=await fetch(`${base}/fr/${role==='ADMIN'?'doctor':'admin'}`,{headers:{cookie:cookies},redirect:'manual'});assert.equal(new URL(wrong.headers.get('location'),base).pathname,`/fr/${home}`);
  console.log(`${role}: all four languages, API access and role redirect passed`);
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
