import { MongoClient, ObjectId } from 'mongodb';
import { ENV } from '../config/env';

let mongoClient: MongoClient | null = null;

export const getMongoDb = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(ENV.DATABASE_URL);
    await mongoClient.connect();
  }
  return mongoClient.db();
};

export const toObjectId = (id: any) => {
  if (!id) return undefined;
  const str = String(id);
  if (str.match(/^[0-9a-fA-F]{24}$/)) {
    return new ObjectId(str);
  }
  return undefined;
};
