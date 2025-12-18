import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Support both DATABASE_URL and individual connection parameters
let poolConfig: any;

if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if provided (for Docker/Heroku style)
    const dbUrl = process.env.DATABASE_URL;

    // Check if password is missing in DATABASE_URL
    if (dbUrl.includes(':@') || dbUrl.includes('://postgres:@')) {
        console.error('❌ DATABASE_URL appears to be missing password!');
        console.error('Please set POSTGRES_PASSWORD environment variable');
    }

    poolConfig = {
        connectionString: dbUrl
    };
} else {
    // Use individual parameters
    poolConfig = {
        host: process.env.DB_HOST || 'postgres',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'co2meter',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    };

    if (!process.env.DB_PASSWORD) {
        console.error('❌ DB_PASSWORD is not set!');
    }
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Database error:', err);
});

export default pool;