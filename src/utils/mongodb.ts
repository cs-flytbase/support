import { MongoClient, Db, MongoClientOptions, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
let client: MongoClient;
let db: Db;
let isConnected = false;
const DB_NAME = process.env.MONGODB_DB_NAME || 'support';

// Configure connection options with proper timeouts and server API version
const options: MongoClientOptions = {
  serverApi: ServerApiVersion.v1,
  connectTimeoutMS: 10000,  // 10 seconds connection timeout
  socketTimeoutMS: 45000,   // 45 seconds socket timeout
  maxPoolSize: 10,          // Maximum connection pool size
};

// Create a logger for MongoDB operations
const mongoLogger = (level: 'info' | 'error' | 'warn', ...args: any[]) => {
  const timestamp = new Date().toISOString();
  console[level](`[MONGODB ${level.toUpperCase()}] [${timestamp}]`, ...args);
};

/**
 * Connect to the MongoDB database with retry logic and proper logging
 * @param retryAttempts Number of connection retry attempts (default: 3)
 * @param retryDelay Delay between retries in ms (default: 2000)
 */
export async function connectToDatabase(retryAttempts = 3, retryDelay = 2000) {
  if (isConnected && client && db) {
    mongoLogger('info', 'Using existing MongoDB connection');
    return { client, db };
  }
  
  // Validate MongoDB URI
  if (!uri) {
    const error = new Error('MongoDB connection string (MONGODB_URI) is not defined');
    mongoLogger('error', error.message);
    throw error;
  }

  let attempts = 0;
  
  while (attempts <= retryAttempts) {
    try {
      mongoLogger('info', `Connecting to MongoDB... (Attempt ${attempts + 1}/${retryAttempts + 1})`);
      
      if (!client) {
        client = new MongoClient(uri, options);
      }
      
      // Attempt connection
      await client.connect();
      db = client.db(DB_NAME);
      
      // Test connection by executing a simple command
      await db.command({ ping: 1 });
      
      isConnected = true;
      mongoLogger('info', `Successfully connected to MongoDB (${DB_NAME})`);
      return { client, db };
    } catch (error: any) {
      mongoLogger('error', `MongoDB connection failed: ${error.message}`);
      
      // Check if we should retry
      attempts++;
      if (attempts <= retryAttempts) {
        mongoLogger('warn', `Retrying connection in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        mongoLogger('error', 'Max connection retry attempts reached. Could not connect to MongoDB.');
        throw error;
      }
    }
  }
  
  // This should never be reached due to error throwing above, but TypeScript needs it
  throw new Error('Failed to connect to MongoDB after maximum retry attempts');
}

/**
 * Check if the MongoDB connection is currently established
 * @returns Boolean indicating connection status
 */
export function isMongoConnected() {
  return isConnected;
}

/**
 * Gracefully close the MongoDB connection
 */
export async function closeDatabaseConnection() {
  try {
    if (client && isConnected) {
      await client.close();
      isConnected = false;
      mongoLogger('info', 'MongoDB connection closed');
    }
  } catch (error: any) {
    mongoLogger('error', `Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch all partner organizations from the database
 */
export async function fetchPartnerOrgs() {
  try {
    mongoLogger('info', 'Fetching partner organizations');
    const { db } = await connectToDatabase();
    const result = await db.collection('partner_orgs').find({}).toArray();
    // const result = await db.collection('partner_orgs').find({});
    // mongoLogger('info', `Retrieved ${result.length} partner orgs`);
    return result;
  } catch (error: any) {
    mongoLogger('error', `Failed to fetch partner orgs: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch all partner transactions from the database
 */
export async function fetchPartnerTransactions(partner_org_id: string) {
  try {
    mongoLogger('info', 'Fetching partner transactions');
    const { db } = await connectToDatabase();
    const result = await db.collection('partner_transaction').find({}).toArray()
    console.log('result', result);
    mongoLogger('info', `Retrieved ${result.length} partner transactions`);
    return result;
  } catch (error: any) {
    mongoLogger('error', `Failed to fetch partner transactions: ${error.message}`);
    throw error;
  }
}

/**
 * Helper to check MongoDB connection health
 * @returns Object containing connection status and details
 */
export async function checkMongoDBHealth() {
  try {
    const startTime = Date.now();
    const { db } = await connectToDatabase();
    
    // Run a simple ping command to verify the connection
    const pingResult = await db.command({ ping: 1 });
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      status: 'healthy',
      pingResult,
      responseTimeMs: responseTime,
      dbName: db.databaseName
    };
  } catch (error: any) {
    mongoLogger('error', `Health check failed: ${error.message}`);
    return {
      connected: false,
      status: 'unhealthy',
      error: error.message
    };
  }
}
