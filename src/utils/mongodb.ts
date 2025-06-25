import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
let client: MongoClient;
let db: Db;

export async function connectToDatabase() {
  if (!client || !db) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db();
  }
  return { client, db };
}

export async function fetchPartnerOrgs() {
  const { db } = await connectToDatabase();
  return db.collection('partner_orgs').find({}).toArray();
}

export async function fetchPartnerTransactions() {
  const { db } = await connectToDatabase();
  return db.collection('partner_transaction').find({}).toArray();
}
