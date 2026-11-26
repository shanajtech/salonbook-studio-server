import { Router } from 'express';
import Stripe from 'stripe';
import { appointments, transactions, users, client,id } from './db.js';
import { requireUser } from './auth.js';
import { fail,profile } from './http.js';
export const payments=Router();
const stripe = () => {
  if(!process.env.STRIPE_SECRET_KEY) throw fail(503,'Stripe Checkout is unavailable.');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};
const currency='bdt';
payments.post('/checkout/:id',requireUser('customer'),async(req,res)=>{
  const booking=await appointments.findOne({_id:id(req.params.id),customerId:req.user.id,status:'confirmed',paymentStatus:'unpaid'});
  if(!booking) throw fail(409,'Only confirmed, unpaid appointments can be paid.');
  const api=stripe(), origin=process.env.CLIENT_URL;
  const session=await api.checkout.sessions.create({
    mode:'payment', payment_method_types:['card'], customer_email:req.user.email,
    success_url:origin+'/payment/success?ref={CHECKOUT_SESSION_ID}',cancel_url:origin+'/payment/cancel',
    metadata:{appointmentId:String(booking._id),customerId:req.user.id},
    line_items:[{quantity:1,price_data:{currency,unit_amount:Math.round(booking.servicePrice*100),product_data:{name:booking.serviceName}}}]
  },{idempotencyKey:'appointment-'+booking._id+'-'+Math.floor(Date.now()/86400000)});
  if(!session.url || session.status!=='open') throw fail(409,'A checkout is already being processed.');
  res.json({url:session.url});
});
payments.get('/status/:ref',requireUser('customer'),async(req,res)=>{
  const record=await transactions.findOne({stripeSessionId:req.params.ref,customerId:req.user.id});
  res.json({status:record?.status||'processing'});
});
payments.get('/transactions',requireUser('admin'),async(_req,res)=>{
  const rows=await transactions.find().sort({createdAt:-1}).toArray();
  const people=await users.find({_id:{$in:[...new Set(rows.map(row=>row.customerId))].map(value=>id(value)||value)}}).toArray();
  const directory=new Map(people.map(user=>[String(user._id),profile(user)]));
  res.json(rows.map(row=>({...row,customer:directory.get(row.customerId)})));
});
export async function webhook(req,res) {
  let event;
  try { event=stripe().webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET); }
  catch { throw fail(400,'Invalid webhook signature.'); }
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type)) return res.sendStatus(200);
  const checkout=event.data.object;
  const paid=checkout.payment_status==='paid';
  if (!paid && event.type!=='checkout.session.async_payment_failed') return res.sendStatus(200);
  await client.withSession(async session=>session.withTransaction(async()=>{
    const booking=await appointments.findOne({_id:id(checkout.metadata?.appointmentId),customerId:checkout.metadata?.customerId},{session});
    if(!booking || checkout.currency!==currency || checkout.amount_total!==Math.round(booking.servicePrice*100)) throw fail(400,'Payment does not match appointment.');
    const existing=await transactions.findOne({stripeSessionId:checkout.id},{session});
    if(existing?.status==='paid') return;
    await transactions.updateOne({stripeSessionId:checkout.id},{$set:{appointmentId:booking._id,customerId:booking.customerId,amount:checkout.amount_total/100,currency,serviceName:booking.serviceName,appointmentDate:booking.appointmentDate,status:paid?'paid':'failed'},$setOnInsert:{createdAt:new Date()}},{upsert:true,session});
    if(paid) await appointments.updateOne({_id:booking._id},{$set:{paymentStatus:'paid'}},{session});
  }));
  res.sendStatus(200);
}
