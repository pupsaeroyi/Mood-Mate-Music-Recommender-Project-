import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();

export const db = client.db("moodmate");
export const history = db.collection("recommendations");
