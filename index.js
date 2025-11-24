const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB = process.env.DB_NAME || 'voter_finder';
const COLLECTION = process.env.COLLECTION || 'voters';
const PORT = process.env.PORT || 8080;

let col;

async function start() {
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB);
  col = db.collection(COLLECTION);
  await col.createIndex({ name: 1 });
  await col.createIndex({ voter_id: 1 });
  await col.createIndex({ source: 1 });
  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}

app.get('/health', (req, res) => res.json({ ok: true }));

// Basic search endpoint. Query params: q, field, page, limit
app.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const field = req.query.field || 'name';
    const page = Math.max(0, parseInt(req.query.page || '0'));
    const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit || '50')));

    const filter = q ? { [field]: { $regex: q, $options: 'i' } } : {};
    const cursor = col.find(filter).skip(page * limit).limit(limit);
    const results = await cursor.toArray();
    res.json({ ok: true, count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/voter/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await col.findOne({ _id: ObjectId.isValid(id) ? new ObjectId(id) : id });
    if (!doc) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json({ ok: true, result: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

start().catch(err => { console.error(err); process.exit(1); });
