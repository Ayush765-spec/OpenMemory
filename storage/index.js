import fs from 'fs';
import path from 'path';

const USE_0G = process.env.USE_0G === 'true';
const LOCAL_DIR = './memory';

if (!fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

export async function saveMemory(key, data) {
  const payload = { key, data, timestamp: Date.now() };

  if (USE_0G) {
    const { Indexer, ZgFile } = await import('@0glabs/0g-ts-sdk');
    const { ethers } = await import('ethers');

    const provider = new ethers.JsonRpcProvider(process.env.EVM_RPC);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const indexer = new Indexer(process.env.INDEXER_RPC);

    const tmpPath = `./tmp_${key}.json`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload));

    const zgFile = await ZgFile.fromFilePath(tmpPath);
    const [tree, treeErr] = await zgFile.merkleTree();
    if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

    const [tx, uploadErr] = await indexer.upload(zgFile, process.env.EVM_RPC, signer);
    if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

    await zgFile.close();
    fs.unlinkSync(tmpPath);

    const indexPath = path.join(LOCAL_DIR, 'index.json');
    const index = fs.existsSync(indexPath)
      ? JSON.parse(fs.readFileSync(indexPath))
      : {};
    index[key] = { rootHash: tree.rootHash(), txHash: tx, timestamp: Date.now() };
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    return { rootHash: tree.rootHash(), txHash: tx };

  } else {
    const filePath = path.join(LOCAL_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return { key, path: filePath };
  }
}

export async function loadMemory(key) {
  if (USE_0G) {
    const { Indexer } = await import('@0glabs/0g-ts-sdk');

    const indexPath = path.join(LOCAL_DIR, 'index.json');
    if (!fs.existsSync(indexPath)) return null;

    const index = JSON.parse(fs.readFileSync(indexPath));
    if (!index[key]) return null;

    const indexer = new Indexer(process.env.INDEXER_RPC);
    const tmpPath = `./tmp_download_${key}.json`;

    const err = await indexer.download(index[key].rootHash, tmpPath, false);
    if (err) throw new Error(`Download error: ${err}`);

    const content = JSON.parse(fs.readFileSync(tmpPath));
    fs.unlinkSync(tmpPath);
    return content.data;

  } else {
    const filePath = path.join(LOCAL_DIR, `${key}.json`);
    if (!fs.existsSync(filePath)) return null;
    const content = JSON.parse(fs.readFileSync(filePath));
    return content.data;
  }
}

export async function listMemories() {
  if (!fs.existsSync(LOCAL_DIR)) return [];

  if (USE_0G) {
    const indexPath = path.join(LOCAL_DIR, 'index.json');
    if (!fs.existsSync(indexPath)) return [];
    const index = JSON.parse(fs.readFileSync(indexPath));
    return Object.entries(index).map(([key, val]) => ({ key, ...val }));
  } else {
    return fs.readdirSync(LOCAL_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, f)));
        return { key: f.replace('.json', ''), timestamp: content.timestamp };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}