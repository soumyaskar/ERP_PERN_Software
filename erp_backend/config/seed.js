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

        console.log('--- Seeding Sample Enquiries ---');
        // Customer 1: ABC Engineering, Customer 2: Apex Manufacturing, Customer 3: Global Petrochem
        const cust1Id = custRes.rows[0].id;
        const cust2Id = custRes.rows[1].id;
        const cust3Id = custRes.rows[2].id;

        // Fetch products PRD-103, PRD-104, PRD-105, PRD-106
        const p103 = (await client.query("SELECT * FROM products WHERE product_code = 'PRD-103'")).rows[0];
        const p104 = (await client.query("SELECT * FROM products WHERE product_code = 'PRD-104'")).rows[0];
        const p105 = (await client.query("SELECT * FROM products WHERE product_code = 'PRD-105'")).rows[0];
        const p106 = (await client.query("SELECT * FROM products WHERE product_code = 'PRD-106'")).rows[0];

        // Enquiry 1: NEW (ABC Engineering)
        const enq1Res = await client.query(`
            INSERT INTO enquiries (enquiry_number, customer_id, enquiry_date, required_date, notes, status)
            VALUES ('ENQ-20261001-0001', $1, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '10 days', 'Urgent requirement for electrical wiring and bearings', 'NEW')
            RETURNING id
        `, [cust1Id]);
        await client.query(`
            INSERT INTO enquiry_items (enquiry_id, product_id, quantity) VALUES
            ($1, $2, 15),
            ($1, $3, 25)
        `, [enq1Res.rows[0].id, p103.id, p104.id]);

        // Enquiry 2: QUOTED (Apex Manufacturing)
        const enq2Res = await client.query(`
            INSERT INTO enquiries (enquiry_number, customer_id, enquiry_date, required_date, notes, status)
            VALUES ('ENQ-20261002-0002', $1, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '15 days', 'Supply of pneumatic actuators for new assembly line', 'QUOTED')
            RETURNING id
        `, [cust2Id]);
        await client.query(`
            INSERT INTO enquiry_items (enquiry_id, product_id, quantity) VALUES
            ($1, $2, 5)
        `, [enq2Res.rows[0].id, p105.id]);

        // Enquiry 3: WON (Global Petrochem)
        const enq3Res = await client.query(`
            INSERT INTO enquiries (enquiry_number, customer_id, enquiry_date, required_date, notes, status)
            VALUES ('ENQ-20261003-0003', $1, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days', 'Industrial lubricants ISO 68 bulk order', 'WON')
            RETURNING id
        `, [cust3Id]);
        await client.query(`
            INSERT INTO enquiry_items (enquiry_id, product_id, quantity) VALUES
            ($1, $2, 10)
        `, [enq3Res.rows[0].id, p106.id]);
        console.log('✓ 3 sample enquiries seeded (NEW, QUOTED, WON)');

        console.log('--- Seeding Sample Quotations ---');
        // Quotation 1: DRAFT (for Enquiry 2, Apex Manufacturing)
        // 5 * 8200 = 41,000, 10% disc = 4,100, tax 18% = 6,642, total = 43,542
        const q1Res = await client.query(`
            INSERT INTO quotations (quotation_number, enquiry_id, customer_id, valid_until, status, subtotal, discount_amount, tax_amount, grand_total)
            VALUES ('QUO-20261002-0001', $1, $2, CURRENT_DATE + INTERVAL '30 days', 'DRAFT', 41000.00, 4100.00, 6642.00, 43542.00)
            RETURNING id
        `, [enq2Res.rows[0].id, cust2Id]);
        await client.query(`
            INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount_pct, gst_pct, line_amount)
            VALUES ($1, $2, 5, 8200.00, 10, 18, 43542.00)
        `, [q1Res.rows[0].id, p105.id]);

        // Quotation 2: ACCEPTED (for Enquiry 3, Global Petrochem)
        // 10 * 5500 = 55,000, 5% disc = 2,750, tax 18% = 9,405, total = 61,655
        const q2Res = await client.query(`
            INSERT INTO quotations (quotation_number, enquiry_id, customer_id, valid_until, status, subtotal, discount_amount, tax_amount, grand_total)
            VALUES ('QUO-20261003-0002', $1, $2, CURRENT_DATE + INTERVAL '25 days', 'ACCEPTED', 55000.00, 2750.00, 9405.00, 61655.00)
            RETURNING id
        `, [enq3Res.rows[0].id, cust3Id]);
        await client.query(`
            INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount_pct, gst_pct, line_amount)
            VALUES ($1, $2, 10, 5500.00, 5, 18, 61655.00)
        `, [q2Res.rows[0].id, p106.id]);
        console.log('✓ 2 sample quotations seeded (DRAFT, ACCEPTED)');

        console.log('--- Seeding Sample Sales Order & Warehouse Reservation ---');
        // Sales Order converted from Quotation 2
        const soRes = await client.query(`
            INSERT INTO sales_orders (order_number, quotation_id, customer_id, order_date, total_amount, status)
            VALUES ('SO-20261003-0001', $1, $2, CURRENT_DATE - INTERVAL '1 day', 61655.00, 'CONFIRMED')
            RETURNING id
        `, [q2Res.rows[0].id, cust3Id]);
        await client.query(`
            INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, line_amount)
            VALUES ($1, $2, 10, 5500.00, 61655.00)
        `, [soRes.rows[0].id, p106.id]);

        // Reserve stock in inventory for PRD-106 (Physical 80, Reserved 10)
        await client.query(`
            UPDATE inventory SET reserved_qty = 10, updated_at = NOW() WHERE product_id = $1
        `, [p106.id]);
        console.log('✓ 1 confirmed sales order with reserved inventory seeded');

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
