import { Router } from 'express';
import { services,id } from './db.js';
import { requireUser } from './auth.js';
import { clean, escapeRegex, fail, imageURL } from './http.js';
export const catalog = Router();
catalog.get('/', async (req,res) => {
  const filter = {status:'active'};
  const search = clean(req.query.q).slice(0,100);
  if (search) filter.serviceName = {$regex:escapeRegex(search),$options:'i'};
  if (clean(req.query.category)) filter.category = clean(req.query.category);
  const sort = {asc:{price:1},desc:{price:-1}}[req.query.sort] || {createdAt:-1};
  const [items,categories] = await Promise.all([services.find(filter).sort(sort).toArray(),services.distinct('category',{status:'active'})]);
  res.json({items,categories});
});
catalog.get('/admin',requireUser('admin'),async (_req,res) => res.json(await services.find().sort({createdAt:-1}).toArray()));
catalog.get('/:id',requireUser(),async (req,res) => {
  const service = await services.findOne({_id:id(req.params.id),status:'active'});
  if (!service) throw fail(404,'This service is unavailable.');
  res.json(service);
});
async function fields(body, previous) {
  const serviceName=clean(body.serviceName),category=clean(body.category),description=clean(body.description);
  const price=Number(body.price),duration=Number(body.duration),status=body.status || 'active';
  if (!serviceName || !category || !description || !Number.isFinite(price) || price<=0 || !Number.isInteger(duration) || duration<=0 || !['active','inactive'].includes(status)) throw fail(400,'Complete the service fields with a positive price and duration.');
  let image = previous?.image;
  if (body.imageData) {
    if (!/^[A-Za-z0-9+/=]+$/.test(body.imageData) || body.imageData.length>4000000) throw fail(400,'Select a supported image of 3 MB or less.');
    if (!process.env.IMGBB_API_KEY) throw fail(503,'Image uploads are unavailable.');
    const data = new FormData();
    data.set('image',body.imageData);
    const endpoint = new URL('https://api.imgbb.com/1/upload');
    endpoint.searchParams.set('key',process.env.IMGBB_API_KEY);
    const result = await fetch(endpoint,{method:'POST',body:data,signal:AbortSignal.timeout(20000)}).catch(()=>null);
    if (!result?.ok) {
      console.warn('ImgBB upload failed',result?.status || 'connection error');
      throw fail(502,'Image upload failed. Try again.');
    }
    image = imageURL((await result.json()).data.url);
  }
  if (!image) throw fail(400,'Upload a service image.');
  return {serviceName,category,description,price,duration,status,image};
}
catalog.post('/',requireUser('admin'),async (req,res) => {
  const doc={...await fields(req.body),createdAt:new Date()};
  const result=await services.insertOne(doc);
  res.status(201).json({...doc,_id:result.insertedId});
});
catalog.put('/:id',requireUser('admin'),async (req,res) => {
  const prev=await services.findOne({_id:id(req.params.id)});
  if (!prev) throw fail(404,'Service not found.');
  const values=await fields(req.body,prev);
  await services.updateOne({_id:prev._id},{$set:values});
  res.json({...prev,...values});
});
catalog.patch('/:id/status',requireUser('admin'),async (req,res) => {
  if (!['active','inactive'].includes(req.body.status)) throw fail(400,'Invalid service status.');
  const result=await services.updateOne({_id:id(req.params.id)},{$set:{status:req.body.status}});
  if (!result.matchedCount) throw fail(404,'Service not found.');
  res.json({ok:true});
});
catalog.delete('/:id',requireUser('admin'),async (req,res) => {
  if (!(await services.deleteOne({_id:id(req.params.id)})).deletedCount) throw fail(404,'Service not found.');
  res.json({ok:true});
});
