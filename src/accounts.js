import { Router } from 'express';
import { users,appointments,services,transactions,id } from './db.js';
import { requireUser } from './auth.js';
import { clean,fail,imageURL,profile } from './http.js';
export const accounts=Router();
accounts.get('/me',requireUser(),(req,res)=>res.json(profile(req.user)));
accounts.patch('/me',requireUser(),async(req,res)=>{
  const name=clean(req.body.name),phone=clean(req.body.phone);
  if(!name || name.length>100 || phone.length>35) throw fail(400,'Check your name and phone number.');
  let image=null;
  if(clean(req.body.image)) { try { image=imageURL(clean(req.body.image)); } catch { throw fail(400,'Enter a valid image URL.'); } }
  await users.updateOne({_id:req.user._id},{$set:{name,phone,image,updatedAt:new Date()}});
  res.json(profile({...req.user,name,phone,image}));
});
accounts.get('/users',requireUser('admin'),async(_req,res)=>res.json((await users.find({role:'customer'}).sort({createdAt:-1}).toArray()).map(profile)));
accounts.patch('/users/:id',requireUser('admin'),async(req,res)=>{
  if(typeof req.body.isBlocked!=='boolean') throw fail(400,'Invalid account state.');
  const result=await users.updateOne({_id:id(req.params.id)||req.params.id,role:'customer'},{$set:{isBlocked:req.body.isBlocked}});
  if(!result.matchedCount) throw fail(404,'Customer not found.');
  res.json({ok:true});
});
accounts.get('/overview',requireUser(),async(req,res)=>{
  const admin=req.user.role==='admin', scope=admin?{}:{customerId:req.user.id};
  const [total,pending,confirmed,cancelled]=await Promise.all([{}, {status:'pending'}, {status:'confirmed'}, {status:'cancelled'}].map(filter=>appointments.countDocuments({...scope,...filter})));
  const metrics={total,pending,confirmed,cancelled};
  if(admin) [metrics.customers,metrics.active,metrics.paid]=await Promise.all([users.countDocuments({role:'customer'}),services.countDocuments({status:'active'}),transactions.countDocuments({status:'paid'})]);
  res.json(metrics);
});
