const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./db');

async function seed() {
    const client = await pool.connect();
    try {
        console.log('--- Initializing ERP Database Schema ---');
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await client.query(schemaSql);
        console.log('✓ Schema created successfully');

        console.log('--- Seeding Initial Users ---');
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('password123', salt);
        const salesHash = await bcrypt.hash('password123', salt);

        await client.query(`
            INSERT INTO users (name, email, password_hash, role) VALUES
            ('System Administrator', 'admin@company.com', $1, 'ADMIN'),
            ('Sales Executive', 'sales@company.com', $2, 'SALES')
        `, [adminHash, salesHash]);
        console.log('✓ Users seeded (admin@company.com, sales@company.com / password123)');

        console.log('--- Seeding Customers ---');
        const custRes = await client.query(`
            INSERT INTO customers (company_name, contact_person, email, mobile, city) VALUES
            ('ABC Engineering Pvt. Ltd.', 'Rajesh Sharma', 'rajesh@abceng.com', '9876543210', 'Mumbai'),
            ('Apex Manufacturing Ltd.', 'Priya Nair', 'priya@apexmanuf.com', '9822334455', 'Pune'),
            ('Global Petrochem Corp', 'Amit Verma', 'amit@globalpetro.com', '9811223344', 'Delhi')
            RETURNING id, company_name
        `);
        console.log(`✓ ${custRes.rows.length} customers seeded`);

        console.log('--- Seeding 6 Industrial Products & Inventory ---');
        const productsData = [
            { code: 'PRD-101', name: 'Industrial Steel Pipe 10inch', category: 'Piping', unit: 'Meter', price: 1500.00, physical: 100 },
            { code: 'PRD-102', name: 'High-Pressure Hydraulic Valve', category: 'Valves', unit: 'Piece', price: 4500.00, physical: 50 },
            { code: 'PRD-103', name: 'Copper Heavy Wiring Bundle', category: 'Electrical', unit: 'Coil', price: 2200.00, physical: 200 },
            { code: 'PRD-104', name: 'Heavy Duty Ball Bearing 50mm', category: 'Mechanical', unit: 'Piece', price: 850.00, physical: 150 },
            { code: 'PRD-105', name: 'Pneumatic Actuator 24V', category: 'Pneumatics', unit: 'Unit', price: 8200.00, physical: 40 },
            { code: 'PRD-106', name: 'Industrial Lubricant ISO 68', category: 'Chemicals', unit: 'Barrel', price: 5500.00, physical: 80 }
        ];

        for (const p of productsData) {
            const pRes = await client.query(`
                INSERT INTO products (product_code, name, category, unit, base_price)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [p.code, p.name, p.category, p.unit, p.price]);

            const productId = pRes.rows[0].id;

            await client.query(`
                INSERT INTO inventory (product_id, physical_qty, reserved_qty, damaged_qty)
                VALUES ($1, $2, 0, 0)
            `, [productId, p.physical]);
        }
        console.log(`✓ 6 industrial products & inventory successfully seeded`);

        console.log('--- Database Initialization Complete ---');
    } catch (err) {
        console.error('Error during database seed:', err);
        throw err;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    seed()
        .then(() => pool.end())
        .catch(() => pool.end());
}

module.exports = seed;
