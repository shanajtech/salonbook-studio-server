import { auth,passwordOK } from './auth.js';
import { client,init,services,users } from './db.js';
const entries=[
 ['Signature Haircut','Haircut & Styling',1200,45,'A tailored cut and soft finish, with time to talk through what works for your hair.','1560066984-138dadb4c035'],
 ['Gloss & Tone','Hair Coloring',2400,75,'A gloss treatment for refreshed tone and polished shine.','1522335789203-aabd1fc54bc9'],
 ['Repair Ritual','Hair Treatment',1800,60,'A conditioning treatment and scalp massage for dry, stressed hair.','1527799820374-dcf8d9d4a388'],
 ['Botanical Facial','Facial & Skincare',1600,50,'A gentle cleanse, exfoliation and botanical hydration tailored to your skin.','1570172619644-dfd03ed5d881'],
 ['Studio Manicure','Manicure & Pedicure',900,40,'Nail shaping, cuticle care and your choice of polish.','1604654894610-df63bc536371'],
 ['Deep Reset Massage','Spa & Massage',2200,60,'A full-body massage with pressure adjusted to your comfort.','1544161515-4ab6ce6db874']
];
await init();
try {
  for(const [serviceName,category,price,duration,description,photo] of entries) await services.updateOne({serviceName},{$setOnInsert:{serviceName,category,price,duration,description,image:'https://images.unsplash.com/photo-'+photo+'?auto=format&fit=crop&w=1000&q=80',status:'active',createdAt:new Date()}},{upsert:true});
  const {ADMIN_NAME,ADMIN_EMAIL,ADMIN_PASSWORD}=process.env;
  if(ADMIN_EMAIL && ADMIN_PASSWORD) {
    const email=ADMIN_EMAIL.trim().toLowerCase();
    if(!passwordOK(ADMIN_PASSWORD)) throw Error('Configure an admin password with upper and lower case letters and at least six characters.');
    if(await users.findOne({email})) throw Error('Choose a fresh evaluator email for first-run bootstrap.');
    await auth.api.signUpEmail({body:{name:ADMIN_NAME||'Studio Admin',email,password:ADMIN_PASSWORD}});
    await users.updateOne({email},{$set:{role:'admin',isBlocked:false}});
  }
} finally { await client.close(); }
