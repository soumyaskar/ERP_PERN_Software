const request = require('supertest');
const app = require('../server');
const pool = require('../config/db');
const seed = require('../config/seed');

describe('ERP Full-Stack Technical Case Study Test Suite', () => {
    let adminToken, salesToken;
    let testCustomerId;
    let productA, productB;

    beforeAll(async () => {
        // Reset and seed database for a clean, deterministic test environment
        await seed();

        // 1. Authenticate ADMIN and SALES users
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@company.com', password: 'password123' });
        adminToken = adminRes.body.token;

        const salesRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'sales@company.com', password: 'password123' });
        salesToken = salesRes.body.token;

        // Fetch test customer
        const custRes = await pool.query(`SELECT id FROM customers LIMIT 1`);
        testCustomerId = custRes.rows[0].id;

        // Fetch test products
        const prodRes = await pool.query(`SELECT * FROM products ORDER BY product_code ASC LIMIT 2`);
        productA = prodRes.rows[0]; // e.g. PRD-101 (Price 1500, Physical 100)
        productB = prodRes.rows[1]; // e.g. PRD-102 (Price 4500, Physical 50)
    });

    afterAll(async () => {
        await pool.end();
    });

    // TEST 1: Quotation total is calculated correctly
    it('Test 1: Quotation total is calculated correctly by the backend', async () => {
        // 1. Create Enquiry
        const enqRes = await request(app)
            .post('/api/enquiries')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                customer_id: testCustomerId,
                notes: 'Need quote for industrial pipes and valves',
                items: [
                    { product_id: productA.id, quantity: 10 },
                    { product_id: productB.id, quantity: 5 }
                ]
            });
        expect([200, 201]).toContain(enqRes.statusCode);
        const enquiryId = enqRes.body.id;

        // 2. Create Quotation:
        // Item 1: 10 * 1500 = 15,000, 10% discount = 13,500 taxable, 18% GST (2,430) = 15,930
        // Item 2: 5 * 4500 = 22,500, 0% discount = 22,500 taxable, 18% GST (4,050) = 26,550
        // Subtotal: 37,500.00
        // Total Tax: 6,480.00
        // Grand Total: 42,480.00
        const quoteRes = await request(app)
            .post('/api/quotations')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                enquiry_id: enquiryId,
                items: [
                    { product_id: productA.id, quantity: 10, unit_price: 1500, discount_pct: 10, gst_pct: 18 },
                    { product_id: productB.id, quantity: 5, unit_price: 4500, discount_pct: 0, gst_pct: 18 }
                ]
            });

        expect(quoteRes.statusCode).toBe(201);
        expect(Number(quoteRes.body.subtotal)).toBeCloseTo(37500.00, 2);
        expect(Number(quoteRes.body.discount_amount)).toBeCloseTo(1500.00, 2);
        expect(Number(quoteRes.body.tax_amount)).toBeCloseTo(6480.00, 2);
        expect(Number(quoteRes.body.grand_total)).toBeCloseTo(42480.00, 2);
        expect(quoteRes.body.status).toBe('DRAFT');
    });

    // TEST 2: Rejected/Draft quotation cannot create a Sales Order
    it('Test 2: Rejected/Draft quotation cannot create a Sales Order', async () => {
        // Create an enquiry & draft quotation
        const enqRes = await request(app)
            .post('/api/enquiries')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                customer_id: testCustomerId,
                notes: 'Test status constraints',
                items: [{ product_id: productA.id, quantity: 2 }]
            });
        const enquiryId = enqRes.body.id;

        const quoteRes = await request(app)
            .post('/api/quotations')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                enquiry_id: enquiryId,
                items: [{ product_id: productA.id, quantity: 2, unit_price: 1500 }]
            });
        const quoteId = quoteRes.body.id;

        // Attempt converting DRAFT quotation -> Must fail with 400
        const draftConvertRes = await request(app)
            .post(`/api/quotations/${quoteId}/convert`)
            .set('Authorization', `Bearer ${salesToken}`);
        expect(draftConvertRes.statusCode).toBe(400);
        expect(draftConvertRes.body.error).toMatch(/Only ACCEPTED quotations can create/i);

        // Update status to REJECTED
        await request(app)
            .patch(`/api/quotations/${quoteId}/status`)
            .set('Authorization', `Bearer ${salesToken}`)
            .send({ status: 'REJECTED' });

        // Attempt converting REJECTED quotation -> Must fail with 400
        const rejectedConvertRes = await request(app)
            .post(`/api/quotations/${quoteId}/convert`)
            .set('Authorization', `Bearer ${salesToken}`);
        expect(rejectedConvertRes.statusCode).toBe(400);
        expect(rejectedConvertRes.body.error).toMatch(/Only ACCEPTED quotations can create/i);
    });

    // TEST 3: Same quotation cannot generate duplicate Sales Orders
    it('Test 3: Same quotation cannot generate duplicate Sales Orders', async () => {
        // Create enquiry & quotation
        const enqRes = await request(app)
            .post('/api/enquiries')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                customer_id: testCustomerId,
                notes: 'Test duplicate prevention',
                items: [{ product_id: productA.id, quantity: 4 }]
            });
        const quoteRes = await request(app)
            .post('/api/quotations')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                enquiry_id: enqRes.body.id,
                items: [{ product_id: productA.id, quantity: 4, unit_price: 1500 }]
            });
        const quoteId = quoteRes.body.id;

        // Set status to ACCEPTED
        await request(app)
            .patch(`/api/quotations/${quoteId}/status`)
            .set('Authorization', `Bearer ${salesToken}`)
            .send({ status: 'ACCEPTED' });

        // First convert -> Should SUCCEED
        const firstConvert = await request(app)
            .post(`/api/quotations/${quoteId}/convert`)
            .set('Authorization', `Bearer ${salesToken}`);
        expect(firstConvert.statusCode).toBe(201);
        expect(firstConvert.body.order_number).toBeDefined();

        // Second convert -> Must FAIL with 400 (duplicate prevention)
        const secondConvert = await request(app)
            .post(`/api/quotations/${quoteId}/convert`)
            .set('Authorization', `Bearer ${salesToken}`);
        expect(secondConvert.statusCode).toBe(400);
        expect(secondConvert.body.error).toMatch(/already been generated/i);
    });

    // TEST 4: Cannot reserve more than available inventory
    it('Test 4: Cannot reserve more than available inventory during Sales Order confirmation', async () => {
        // PRD-101 has physical 100 in stock. We request 500 units.
        const enqRes = await request(app)
            .post('/api/enquiries')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                customer_id: testCustomerId,
                notes: 'Large order exceeding stock',
                items: [{ product_id: productA.id, quantity: 500 }]
            });

        const quoteRes = await request(app)
            .post('/api/quotations')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                enquiry_id: enqRes.body.id,
                items: [{ product_id: productA.id, quantity: 500, unit_price: 1500 }]
            });
        const quoteId = quoteRes.body.id;

        await request(app)
            .patch(`/api/quotations/${quoteId}/status`)
            .set('Authorization', `Bearer ${salesToken}`)
            .send({ status: 'ACCEPTED' });

        const orderRes = await request(app)
            .post(`/api/quotations/${quoteId}/convert`)
            .set('Authorization', `Bearer ${salesToken}`);
        const orderId = orderRes.body.id;

        // Admin tries to confirm order exceeding available stock -> Must fail with 400
        const confirmRes = await request(app)
            .post(`/api/sales-orders/${orderId}/confirm`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(confirmRes.statusCode).toBe(400);
        expect(confirmRes.body.error).toMatch(/Insufficient available inventory/i);

        // Verify that inventory was NOT reserved
        const invCheck = await pool.query('SELECT reserved_qty FROM inventory WHERE product_id = $1', [productA.id]);
        expect(invCheck.rows[0].reserved_qty).toBe(0);
    });

    // TEST 5: Unauthorized user cannot perform a restricted operation
    it('Test 5: Unauthorized Sales user cannot perform restricted Admin actions', async () => {
        // Create a confirmed order to test dispatch
        const enqRes = await request(app)
            .post('/api/enquiries')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                customer_id: testCustomerId,
                notes: 'RBAC test order',
                items: [{ product_id: productA.id, quantity: 5 }]
            });
        const quoteRes = await request(app)
            .post('/api/quotations')
            .set('Authorization', `Bearer ${salesToken}`)
            .send({
                enquiry_id: enqRes.body.id,
                items: [{ product_id: productA.id, quantity: 5, unit_price: 1500 }]
            });
        await request(app)
            .patch(`/api/quotations/${quoteRes.body.id}/status`)
            .set('Authorization', `Bearer ${salesToken}`)
            .send({ status: 'ACCEPTED' });
        const orderRes = await request(app)
            .post(`/api/quotations/${quoteRes.body.id}/convert`)
            .set('Authorization', `Bearer ${salesToken}`);
        const orderId = orderRes.body.id;

        // 1. Sales user tries to confirm order -> 403 Forbidden
        const salesConfirmRes = await request(app)
            .post(`/api/sales-orders/${orderId}/confirm`)
            .set('Authorization', `Bearer ${salesToken}`);
        expect(salesConfirmRes.statusCode).toBe(403);

        // Confirm order as Admin so it is ready for dispatch
        await request(app)
            .post(`/api/sales-orders/${orderId}/confirm`)
            .set('Authorization', `Bearer ${adminToken}`);

        // 2. Sales user tries to dispatch order -> 403 Forbidden
        const salesDispatchRes = await request(app)
            .post(`/api/sales-orders/${orderId}/dispatch`)
            .set('Authorization', `Bearer ${salesToken}`)
            .send({ vehicle_number: 'MH-01-AB-1234', driver_name: 'John Doe' });
        expect(salesDispatchRes.statusCode).toBe(403);

        // 3. Unauthenticated request -> 401 Unauthorized
        const unauthRes = await request(app)
            .post(`/api/sales-orders/${orderId}/dispatch`)
            .send({ vehicle_number: 'MH-01-AB-1234', driver_name: 'John Doe' });
        expect(unauthRes.statusCode).toBe(401);
    });

    // BONUS TEST: Simultaneous inventory reservations (Concurrency race condition)
    it('Bonus Test: Concurrent reservations beyond available inventory cannot both succeed', async () => {
        // Reset inventory for productA: Physical = 100, Reserved = 0
        await pool.query('UPDATE inventory SET physical_qty = 100, reserved_qty = 0, damaged_qty = 0 WHERE product_id = $1', [productA.id]);

        // Create Order 1 (Needs 80)
        const enq1 = await request(app).post('/api/enquiries').set('Authorization', `Bearer ${salesToken}`).send({
            customer_id: testCustomerId, items: [{ product_id: productA.id, quantity: 80 }]
        });
        const quote1 = await request(app).post('/api/quotations').set('Authorization', `Bearer ${salesToken}`).send({
            enquiry_id: enq1.body.id, items: [{ product_id: productA.id, quantity: 80, unit_price: 1500 }]
        });
        await request(app).patch(`/api/quotations/${quote1.body.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'ACCEPTED' });
        const ord1 = await request(app).post(`/api/quotations/${quote1.body.id}/convert`).set('Authorization', `Bearer ${salesToken}`);

        // Create Order 2 (Needs 50)
        const enq2 = await request(app).post('/api/enquiries').set('Authorization', `Bearer ${salesToken}`).send({
            customer_id: testCustomerId, items: [{ product_id: productA.id, quantity: 50 }]
        });
        const quote2 = await request(app).post('/api/quotations').set('Authorization', `Bearer ${salesToken}`).send({
            enquiry_id: enq2.body.id, items: [{ product_id: productA.id, quantity: 50, unit_price: 1500 }]
        });
        await request(app).patch(`/api/quotations/${quote2.body.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'ACCEPTED' });
        const ord2 = await request(app).post(`/api/quotations/${quote2.body.id}/convert`).set('Authorization', `Bearer ${salesToken}`);

        // Fire both reservation requests simultaneously
        const [res1, res2] = await Promise.all([
            request(app).post(`/api/sales-orders/${ord1.body.id}/confirm`).set('Authorization', `Bearer ${adminToken}`),
            request(app).post(`/api/sales-orders/${ord2.body.id}/confirm`).set('Authorization', `Bearer ${adminToken}`)
        ]);

        const statusCodes = [res1.statusCode, res2.statusCode].sort();
        // One MUST succeed (200), and the other MUST fail (400)
        expect(statusCodes).toEqual([200, 400]);

        // Check final inventory in database: reserved_qty must be <= 100, NEVER 130!
        const finalInv = await pool.query('SELECT physical_qty, reserved_qty FROM inventory WHERE product_id = $1', [productA.id]);
        expect(finalInv.rows[0].reserved_qty).toBeLessThanOrEqual(100);
        expect([50, 80]).toContain(finalInv.rows[0].reserved_qty);
    });

    // WORKFLOW TEST: Full Complete End-to-End Cycle (Enquiry -> Quote -> Order -> Reservation -> Dispatch)
    it('End-to-End Workflow: Enquiry -> Quote -> Order -> Reservation -> Dispatch decreases inventory', async () => {
        // PRD-102: Physical = 50, Reserved = 0
        await pool.query('UPDATE inventory SET physical_qty = 50, reserved_qty = 0, damaged_qty = 0 WHERE product_id = $1', [productB.id]);

        // 1. Create Enquiry
        const enq = await request(app).post('/api/enquiries').set('Authorization', `Bearer ${salesToken}`).send({
            customer_id: testCustomerId,
            required_date: '2026-11-01',
            notes: 'Dispatch flow verification',
            items: [{ product_id: productB.id, quantity: 20 }]
        });
        expect(enq.body.status).toBe('NEW');

        // 2. Create Quotation
        const quote = await request(app).post('/api/quotations').set('Authorization', `Bearer ${salesToken}`).send({
            enquiry_id: enq.body.id,
            items: [{ product_id: productB.id, quantity: 20, unit_price: 4500, discount_pct: 5, gst_pct: 18 }]
        });
        expect(quote.body.status).toBe('DRAFT');

        // Check enquiry status is now QUOTED
        const checkEnq = await request(app).get(`/api/enquiries/${enq.body.id}`).set('Authorization', `Bearer ${salesToken}`);
        expect(checkEnq.body.status).toBe('QUOTED');

        // Accept Quotation
        await request(app).patch(`/api/quotations/${quote.body.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'ACCEPTED' });

        // Check enquiry status is now WON
        const checkEnqWon = await request(app).get(`/api/enquiries/${enq.body.id}`).set('Authorization', `Bearer ${salesToken}`);
        expect(checkEnqWon.body.status).toBe('WON');

        // 3. Convert to Sales Order
        const order = await request(app).post(`/api/quotations/${quote.body.id}/convert`).set('Authorization', `Bearer ${salesToken}`);
        expect(order.body.status).toBe('PENDING');

        // 4. Admin Confirms Order & Reserves stock
        const confirm = await request(app).post(`/api/sales-orders/${order.body.id}/confirm`).set('Authorization', `Bearer ${adminToken}`);
        expect(confirm.statusCode).toBe(200);

        // Verify inventory after reservation:
        // Physical = 50 (unchanged), Reserved = 20, Available = 30
        let inv = await pool.query('SELECT physical_qty, reserved_qty FROM inventory WHERE product_id = $1', [productB.id]);
        expect(inv.rows[0].physical_qty).toBe(50);
        expect(inv.rows[0].reserved_qty).toBe(20);

        // 5. Admin Dispatches Order
        const dispatch = await request(app).post(`/api/sales-orders/${order.body.id}/dispatch`).set('Authorization', `Bearer ${adminToken}`).send({
            vehicle_number: 'DL-01-XY-9999',
            driver_name: 'Harish Kumar'
        });
        expect(dispatch.statusCode).toBe(201);
        expect(dispatch.body.dispatch.dispatch_number).toBeDefined();

        // Verify inventory after dispatch:
        // Physical Quantity decreases: 50 - 20 = 30
        // Reserved Quantity decreases: 20 - 20 = 0
        // Available Quantity remains: 30 - 0 = 30
        inv = await pool.query('SELECT physical_qty, reserved_qty FROM inventory WHERE product_id = $1', [productB.id]);
        expect(inv.rows[0].physical_qty).toBe(30);
        expect(inv.rows[0].reserved_qty).toBe(0);
    });
});