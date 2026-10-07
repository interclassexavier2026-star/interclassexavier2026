import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

// Memory fallback for serverless cold instances
let memoryStore = {
  teams: [] as any[],
  matches: [] as any[],
  subadmins: [] as any[],
  lastUpdated: 0,
};

function getStoragePath() {
  const tmpPath = path.resolve('/tmp', 'tournament.json');
  return tmpPath;
}

function readData() {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Vercel serverless fs read fallback to memory:', err);
  }
  return memoryStore;
}

function writeData(data: any) {
  try {
    memoryStore = data;
    const filePath = getStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn('Vercel serverless fs write fallback to memory:', err);
    memoryStore = data;
    return true;
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const data = readData();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(data));
    return;
  }

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      const current = readData();
      const updated = {
        teams: Array.isArray(body?.teams) ? body.teams : current.teams || [],
        matches: Array.isArray(body?.matches) ? body.matches : current.matches || [],
        subadmins: Array.isArray(body?.subadmins) ? body.subadmins : current.subadmins || [],
        lastUpdated: body?.lastUpdated || Date.now(),
      };
      writeData(updated);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, lastUpdated: updated.lastUpdated }));
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
