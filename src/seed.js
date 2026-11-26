import { auth,passwordOK } from './auth.js';
import { client,init,users } from './db.js';
import { seedCatalog } from './catalog-seed.js';
await init();
try {
  await seedCatalog();
  const {ADMIN_NAME,ADMIN_EMAIL,ADMIN_PASSWORD}=process.env;
  if(ADMIN_EMAIL && ADMIN_PASSWORD) {
    const email=ADMIN_EMAIL.trim().toLowerCase();
    if(!passwordOK(ADMIN_PASSWORD)) throw Error('Configure an admin password with upper and lower case letters and at least six characters.');
    if(await users.findOne({email})) throw Error('Choose a fresh evaluator email for first-run bootstrap.');
    await auth.api.signUpEmail({body:{name:ADMIN_NAME||'Studio Admin',email,password:ADMIN_PASSWORD}});
    await users.updateOne({email},{$set:{role:'admin',isBlocked:false}});
  }
} finally { await client.close(); }
