import { Router } from 'express';
import { appointments,services,users,id } from './db.js';
import { requireUser } from './auth.js';
import { clean,fail,profile } from './http.js';
export const bookings=Router();
export const times=['10:00','11:30','13:00','14:30','16:00','17:30'];
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0,10)===value;
}
bookings.get('/availability',requireUser(),async (req,res) => {
  const date=clean(req.query.date);
  if (!validDate(date)) throw fail(400,'Choose an appointment date.');
  const occupied=await appointments.distinct('timeSlot',{appointmentDate:date,active:true});
  res.json(times.map(time=>({time,available:!occupied.includes(time) && +new Date(date+'T'+time+':00+06:00')>Date.now()})));
});
bookings.post('/',requireUser('customer'),async (req,res) => {
  const {serviceId,appointmentDate,timeSlot}=req.body;
  if (!validDate(appointmentDate) || !times.includes(timeSlot) || +new Date(appointmentDate+'T'+timeSlot+':00+06:00')<=Date.now()) throw fail(400,'Choose a future date and an available time.');
  const service=await services.findOne({_id:id(serviceId),status:'active'});
  if (!service) throw fail(404,'This service is unavailable.');
  const doc={serviceId:service._id,customerId:req.user.id,serviceName:service.serviceName,category:service.category,image:service.image,servicePrice:service.price,appointmentDate,timeSlot,message:clean(req.body.message).slice(0,500),status:'pending',paymentStatus:'unpaid',active:true,createdAt:new Date()};
  try { await appointments.insertOne(doc); } catch(error) {
    if(error.code===11000) throw fail(409,'This time was just booked. Choose another slot.');
    throw error;
  }
  res.status(201).json(doc);
});
bookings.get('/',requireUser(),async (req,res) => {
  const admin=req.user.role==='admin';
  const rows=await appointments.find(admin?{}:{customerId:req.user.id}).sort({createdAt:-1}).toArray();
  if (!admin) return res.json(rows);
  const customers=await users.find({_id:{$in:[...new Set(rows.map(row=>row.customerId))].map(value=>id(value)||value)}}).toArray();
  const directory=new Map(customers.map(user=>[String(user._id),profile(user)]));
  res.json(rows.map(row=>({...row,customer:directory.get(row.customerId)})));
});
bookings.patch('/:id',requireUser(),async (req,res) => {
  const admin=req.user.role==='admin', status=req.body.status;
  if (!(status==='cancelled' || (admin && status==='confirmed'))) throw fail(403,'This action is unavailable.');
  const filter={_id:id(req.params.id),status:admin && status==='cancelled'?{$in:['pending','confirmed']}:'pending'};
  if (!admin) filter.customerId=req.user.id;
  const result=await appointments.updateOne(filter,{$set:{status,active:status!=='cancelled'}});
  if(!result.matchedCount) throw fail(409,'This appointment cannot be changed.');
  res.json({ok:true});
});
