import { MongoClient, ObjectId } from 'mongodb';
export const client = new MongoClient(process.env.MONGODB_URI);
export const db = client.db(process.env.MONGODB_DB || 'salonbook_studio');
export const services = db.collection('services');
export const appointments = db.collection('appointments');
export const transactions = db.collection('transactions');
export const users = db.collection('users');
export const id = value => ObjectId.isValid(value) ? new ObjectId(value) : null;
export async function init() {
  await client.connect();
  await appointments.createIndex({ appointmentDate:1,timeSlot:1 }, {unique:true,partialFilterExpression:{active:true}});
  await transactions.createIndex({stripeSessionId:1},{unique:true});
  await appointments.createIndex({customerId:1,createdAt:-1});
}
