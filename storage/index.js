import fs from 'fs';
import path from 'path';
import os from 'os';

const USE_0G = process.env.USE_0G === 'true';
const STRATEGY = process.env.STORAGE_STRATEGY || 'fs'; // 'fs' or 'redis'
const LOCAL_DIR = path.join(process.cwd(), 'memory');

// Initialize local dir if using FS strategy
if (STRATEGY === 'fs' && !fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

// Lazy-load Redis to avoid issues in purely local environments
let redis = null;
async function getRedisClient() {
  if (!redis && STRATEGY === 'redis') {
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export async function saveMemory(key, data) {
  const payload = { key, data, timestamp: Date.now() };

  if (USE_0G) {
    const { Indexer, ZgFile } = await import('@0glabs/0g-ts-sdk');
    const { ethers } = await import('ethers');

    const provider = new ethers.JsonRpcProvider(process.env.EVM_RPC);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const indexer = new Indexer(process.env.INDEXER_RPC);

    // Use OS temp directory for serverless compatibility
    const tmpPath = path.join(os.tmpdir(), `memo_tmp_${key}_${Date.now()}.json`);
    fs.writeFileSync(tmpPath, JSON.stringify(payload));

    const zgFile = await ZgFile.fromFilePath(tmpPath);
    const [tree, treeErr] = await zgFile.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

    const [tx, uploadErr] = await indexer.upload(zgFile, process.env.EVM_RPC, signer);
    if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

    await zgFile.close();
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

    const indexEntry = { rootHash: tree.rootHash(), txHash: tx, timestamp: Date.now() };

    if (STRATEGY === 'redis') {
      const client = await getRedisClient();
      await client.hset('memo:0g_index', { [key]: JSON.stringify(indexEntry) });
    } else {
      const indexPath = path.join(LOCAL_DIR, 'index.json');
      const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath)) : {};
      index[key] = indexEntry;
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    }

    return { rootHash: tree.rootHash(), txHash: tx };

  } else {
    // Normal storage (Non-0G)
    if (STRATEGY === 'redis') {
      const client = await getRedisClient();
      await client.set(`memo:data:${key}`, JSON.stringify(payload));
      return { key, type: 'redis' };
    } else {
      const filePath = path.join(LOCAL_DIR, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
      return { key, path: filePath };
    }
  }
}

export async function loadMemory(key) {
  if (USE_0G) {
    const { Indexer } = await import('@0glabs/0g-ts-sdk');
    let indexEntry = null;

    if (STRATEGY === 'redis') {
      const client = await getRedisClient();
      const raw = await client.hget('memo:0g_index', key);
      if (raw) indexEntry = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } else {
      const indexPath = path.join(LOCAL_DIR, 'index.json');
      if (fs.existsSync(indexPath)) {
        const index = JSON.parse(fs.readFileSync(indexPath));
        indexEntry = index[key];
      }
    }

    if (!indexEntry) return null;

    const indexer = new Indexer(process.env.INDEXER_RPC);
    const tmpPath = path.join(os.tmpdir(), `memo_download_${key}_${Date.now()}.json`);

    const err = await indexer.download(indexEntry.rootHash, tmpPath, false);
    if (err) throw new Error(`Download error: ${err}`);

    const content = JSON.parse(fs.readFileSync(tmpPath));
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    return content.data;

  } else {
    // Normal storage (Non-0G)
    if (STRATEGY === 'redis') {
      const client = await getRedisClient();
      const content = await client.get(`memo:data:${key}`);
      return content ? (typeof content === 'string' ? JSON.parse(content).data : content.data) : null;
    } else {
      const filePath = path.join(LOCAL_DIR, `${key}.json`);
      if (!fs.existsSync(filePath)) return null;
      const content = JSON.parse(fs.readFileSync(filePath));
      return content.data;
    }
  }
}

export async function listMemories() {
  if (STRATEGY === 'redis') {
    const client = await getRedisClient();
    if (USE_0G) {
      const index = await client.hgetall('memo:0g_index');
      if (!index) return [];
      return Object.entries(index).map(([key, val]) => {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        return { key, ...parsed };
      }).sort((a, b) => b.timestamp - a.timestamp);
    } else {
      const keys = await client.keys('memo:data:*');
      const memories = [];
      for (const k of keys) {
        const content = await client.get(k);
        if (content) {
          const parsed = typeof content === 'string' ? JSON.parse(content) : content;
          memories.push({ key: parsed.key, timestamp: parsed.timestamp });
        }
      }
      return memories.sort((a, b) => b.timestamp - a.timestamp);
    }
  } else {
    if (!fs.existsSync(LOCAL_DIR)) return [];
    if (USE_0G) {
      const indexPath = path.join(LOCAL_DIR, 'index.json');
      if (!fs.existsSync(indexPath)) return [];
      const index = JSON.parse(fs.readFileSync(indexPath));
      return Object.entries(index).map(([key, val]) => ({ key, ...val }))
        .sort((a, b) => b.timestamp - a.timestamp);
    } else {
      return fs.readdirSync(LOCAL_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .map(f => {
          const content = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, f)));
          return { key: f.replace('.json', ''), timestamp: content.timestamp };
        })
        .sort((a, b) => b.timestamp - a.timestamp);
    }
  }
}