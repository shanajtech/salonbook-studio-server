import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth,passwordOK } from './auth.js';
import { init } from './db.js';
import { accounts } from './accounts.js';
import { bookings } from './appointments.js';
import { catalog } from './services.js';
import { payments,webhook } from './payments.js';
const app=express();
const authHandler=toNodeHandler(auth);
app.disable('x-powered-by');
app.use(cors({origin:process.env.CLIENT_URL,credentials:true}));
app.post('/api/webhooks/stripe',express.raw({type:'application/json'}),webhook);
app.post('/api/auth/sign-up/email',express.raw({type:'application/json',limit:'64kb'}),async(req,res)=>{
  let body;
  try { body=JSON.parse(req.body.toString()); } catch { return res.status(400).json({message:'Invalid registration.'}); }
  if(!passwordOK(body.password)) return res.status(400).json({message:'Use at least six characters, an uppercase and a lowercase letter.'});
  const response=await auth.handler(new Request(process.env.BETTER_AUTH_URL+'/api/auth/sign-up/email',{method:'POST',headers:Object.fromEntries(Object.entries(req.headers).filter(([key])=>!['host','content-length','connection'].includes(key))),body:JSON.stringify({name:body.name,email:body.email,password:body.password,image:body.image})}));
  for(const [key,value] of response.headers) if(key!=='set-cookie') res.setHeader(key,value);
  for(const cookie of response.headers.getSetCookie()) res.append('Set-Cookie',cookie);
  res.status(response.status).send(await response.text());
});
app.all('/api/auth/{*path}',authHandler);
app.use(express.json({limit:'8mb'}));
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.use('/api/services',catalog);
app.use('/api/appointments',bookings);
app.use('/api/account',accounts);
app.use('/api/payments',payments);
app.use((_req,res)=>res.status(404).json({error:'This API route was not found.'}));
app.use((error,_req,res,_next)=>{
  const status=error.status||500;
  if(status>=500) console.error(error.name,status);
  res.status(status).json({error:status===500?'Something went wrong. Please try again.':error.message});
});
await init();
app.listen(Number(process.env.PORT||4000),()=>console.info('SalonBook API ready'));
