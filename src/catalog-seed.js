import { ObjectId } from 'mongodb';
import { db, services } from './db.js';
const entries=[
 ['Signature Haircut','Haircut & Styling',1200,45,'A tailored cut and soft finish, with time to talk through what works for your hair.','1560066984-138dadb4c035'],
 ['Gloss & Tone','Hair Coloring',2400,75,'A gloss treatment for refreshed tone and polished shine.','1522335789203-aabd1fc54bc9'],
 ['Repair Ritual','Hair Treatment',1800,60,'A conditioning treatment and scalp massage for dry, stressed hair.','1527799820374-dcf8d9d4a388'],
 ['Botanical Facial','Facial & Skincare',1600,50,'A gentle cleanse, exfoliation and botanical hydration tailored to your skin.','1570172619644-dfd03ed5d881'],
 ['Studio Manicure','Manicure & Pedicure',900,40,'Nail shaping, cuticle care and your choice of polish.','1604654894610-df63bc536371'],
 ['Deep Reset Massage','Spa & Massage',2200,60,'A full-body massage with pressure adjusted to your comfort.','1544161515-4ab6ce6db874']
];

export async function seedCatalog() {
  await services.bulkWrite(entries.map(([serviceName,category,price,duration,description,photo],index)=>{
    const _id=new ObjectId((index+1).toString(16).padStart(24,'0'));
    return {updateOne:{filter:{_id},update:{$setOnInsert:{
      serviceName,category,price,duration,description,
      image:'https://images.unsplash.com/photo-'+photo+'?auto=format&fit=crop&w=1000&q=80',
      status:'active',createdAt:new Date()
    }},upsert:true}};
  }));
}
export async function initializeCatalog() {
  const collection=await db.listCollections({name:'services'},{nameOnly:true}).hasNext();
  if (!collection) await seedCatalog();
}
