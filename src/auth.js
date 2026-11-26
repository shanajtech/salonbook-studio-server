import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { jwt } from 'better-auth/plugins';
import { fromNodeHeaders } from 'better-auth/node';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { db,client,users,id } from './db.js';
const baseURL = process.env.BETTER_AUTH_URL;
export const passwordOK = password => typeof password === 'string' && /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/.test(password);
export const auth = betterAuth({
  baseURL, secret:process.env.BETTER_AUTH_SECRET, trustedOrigins:[process.env.CLIENT_URL],
  database:mongodbAdapter(db,{client}), user:{modelName:'users',additionalFields:{
    role:{type:'string',defaultValue:'customer',input:false},
    isBlocked:{type:'boolean',defaultValue:false,input:false},
    phone:{type:'string',required:false}
  }},
  emailAndPassword:{enabled:true,minPasswordLength:6},
  socialProviders:process.env.GOOGLE_CLIENT_ID ? {google:{clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET}} : {},
  plugins:[jwt({jwt:{issuer:baseURL,audience:baseURL,expirationTime:'5m'}})]
});
export const requireUser = role => async (req,res,next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({error:'Please sign in.'});
  let payload;
  try {
    const { keys } = await auth.api.getJwks();
    ({payload} = await jwtVerify(token,createLocalJWKSet({keys}),{issuer:baseURL,audience:baseURL}));
    const session = await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
    if (session?.user.id !== payload.sub) throw Error('Session expired.');
  } catch {
    return res.status(401).json({error:'Your session expired. Please sign in.'});
  }
  const user = await users.findOne({_id:id(payload.sub) || payload.sub});
  if (!user || user.isBlocked || (role && user.role !== role)) return res.status(403).json({error:'You do not have access to this page.'});
  req.user = {...user,id:payload.sub};
  next();
};
