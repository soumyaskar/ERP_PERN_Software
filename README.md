# Logisaar ERP — Full-Stack Technical Case Study (PERN Stack)

Production-ready industrial ERP software built with **PostgreSQL**, **Express.js**, **React.js**, and **Node.js** demonstrating the end-to-end business workflow:

$$\text{Customer Enquiry} \longrightarrow \text{Quotation} \longrightarrow \text{Sales Order} \longrightarrow \text{Inventory Reservation} \longrightarrow \text{Dispatch}$$

---

## 1. Architecture & Business Workflow

```mermaid
flowchart LR
    A[Customer Enquiry\nStatus: NEW] -->|Sales User Quotes| B[Commercial Quotation\nStatus: DRAFT / SENT]
    B -->|Customer Acceptance| C[Accepted Quotation\nStatus: ACCEPTED]
    C -->|Convert to Order| D[Sales Order\nStatus: PENDING]
    D -->|Admin Confirmation\nRow Lock & Stock Check| E[Inventory Reservation\nStatus: CONFIRMED]
    E -->|Admin Dispatches Goods| F[Dispatched Outbound\nStatus: DISPATCHED]

    subgraph "Warehouse Inventory State"
        I1["Physical: 100\nReserved: 0\nAvailable: 100"]
        I2["Physical: 100\nReserved: 60\nAvailable: 40"]
        I3["Physical: 40\nReserved: 0\nAvailable: 40"]
    end

    A -.-> I1
    E -.-> I2
    F -.-> I3
```

---

## 2. Key Business & Technical Rules Implemented

1. **Strict Role-Based Access Control (RBAC)**:
   - **`ADMIN`**: Full visibility, manage inventory, confirm sales orders (inventory reservation), and process physical dispatches.
   - **`SALES`**: Create customers/enquiries, draft quotations, convert accepted quotations to sales orders, view inventory availability.
   - *Enforced on both Backend APIs and Frontend UI* (backend responds with HTTP 403 Forbidden on unauthorized operations).

2. **Backend Financial Calculation & Validation**:
   - The backend validates and computes all financials rather than blindly accepting numbers from the frontend:
     $$\text{Base Amount} = \text{Quantity} \times \text{Unit Price}$$
     $$\text{Discount} = \text{Base Amount} \times \frac{\text{Discount \%}}{100}$$
     $$\text{GST Amount} = (\text{Base Amount} - \text{Discount}) \times \frac{\text{GST \%}}{100}$$
     $$\text{Line Total} = (\text{Base Amount} - \text{Discount}) + \text{GST Amount}$$

3. **Status Integrity & Traceability**:
   - Only `ACCEPTED` quotations can be converted into Sales Orders (HTTP 400 rejection for `DRAFT` or `REJECTED`).
   - Unique database constraint on `quotation_id` in `sales_orders` prevents duplicate order generation.
   - Full audit trail: Customer $\to$ Enquiry $\to$ Quotation $\to$ Sales Order $\to$ Dispatch.

4. **Concurrency Challenge Solved (Row-Level Locking)**:
   - When User A and User B simultaneously attempt to reserve stock:
     - The backend wraps the transaction with `BEGIN ... COMMIT`.
     - Acquires an exclusive row-level lock via `SELECT ... FROM inventory WHERE product_id = $1 FOR UPDATE`.
     - Validates available quantity:
       $$\text{Available} = \text{Physical} - \text{Reserved} - \text{Damaged}$$
     - If sufficient, updates `reserved_qty = reserved_qty + required`.
     - If insufficient, rolls back and returns HTTP 400.
     - Database-level constraint: `CHECK (reserved_qty + damaged_qty <= physical_qty)`.

5. **Inventory Movement During Dispatch**:
   - When an order is dispatched:
     $$\text{Physical Quantity} \leftarrow \text{Physical Quantity} - \text{Dispatched Quantity}$$
     $$\text{Reserved Quantity} \leftarrow \text{Reserved Quantity} - \text{Dispatched Quantity}$$
     $$\text{Available Quantity} = \text{Invariant (remains identical)}$$

6. **Order Cancellation & Stock Release** *(Live Verification Feature)*:
   - If a confirmed order is cancelled, reserved stock is safely released back to available inventory.

---

## 3. Database Schema & Entity-Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role "ADMIN | SALES"
        timestamp created_at
    }

    CUSTOMERS {
        uuid id PK
        varchar company_name
        varchar contact_person
        varchar email
        varchar mobile
        varchar city
        timestamp created_at
    }

    PRODUCTS {
        uuid id PK
        varchar product_code UK
        varchar name
        varchar category
        varchar unit
        numeric base_price
        timestamp created_at
    }

    INVENTORY {
        uuid id PK
        uuid product_id FK,UK
        int physical_qty
        int reserved_qty
        int damaged_qty
        timestamp updated_at
    }

    ENQUIRIES {
        uuid id PK
        varchar enquiry_number UK
        uuid customer_id FK
        date enquiry_date
        date required_date
        text notes
        varchar status "NEW | QUOTED | WON | LOST"
        timestamp created_at
    }

    ENQUIRY_ITEMS {
        uuid id PK
        uuid enquiry_id FK
        uuid product_id FK
        int quantity
    }

    QUOTATIONS {
        uuid id PK
        varchar quotation_number UK
        uuid enquiry_id FK
        uuid customer_id FK
        date valid_until
        varchar status "DRAFT | SENT | ACCEPTED | REJECTED"
        numeric subtotal
        numeric discount_amount
        numeric tax_amount
        numeric grand_total
        timestamp created_at
    }

    QUOTATION_ITEMS {
        uuid id PK
        uuid quotation_id FK
        uuid product_id FK
        int quantity
        numeric unit_price
        numeric discount_pct
        numeric gst_pct
        numeric line_amount
    }

    SALES_ORDERS {
        uuid id PK
        varchar order_number UK
        uuid quotation_id FK,UK
        uuid customer_id FK
        date order_date
        numeric total_amount
        varchar status "PENDING | CONFIRMED | DISPATCHED | CANCELLED"
        timestamp created_at
    }

    SALES_ORDER_ITEMS {
        uuid id PK
        uuid sales_order_id FK
        uuid product_id FK
        int quantity
        numeric unit_price
        numeric line_amount
    }

    DISPATCHES {
        uuid id PK
        varchar dispatch_number UK
        uuid sales_order_id FK,UK
        date dispatch_date
        varchar vehicle_number
        varchar driver_name
        timestamp created_at
    }

    DISPATCH_ITEMS {
        uuid id PK
        uuid dispatch_id FK
        uuid product_id FK
        int quantity
    }

    CUSTOMERS ||--o{ ENQUIRIES : places
    CUSTOMERS ||--o{ QUOTATIONS : receives
    CUSTOMERS ||--o{ SALES_ORDERS : orders
    PRODUCTS ||--|| INVENTORY : maintains
    ENQUIRIES ||--|{ ENQUIRY_ITEMS : contains
    PRODUCTS ||--o{ ENQUIRY_ITEMS : referenced_in
    ENQUIRIES ||--o{ QUOTATIONS : generated_for
    QUOTATIONS ||--|{ QUOTATION_ITEMS : contains
    PRODUCTS ||--o{ QUOTATION_ITEMS : priced_in
    QUOTATIONS ||--o| SALES_ORDERS : converted_to
    SALES_ORDERS ||--|{ SALES_ORDER_ITEMS : contains
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : fulfilled_in
    SALES_ORDERS ||--o| DISPATCHES : dispatched_by
    DISPATCHES ||--|{ DISPATCH_ITEMS : delivers
    PRODUCTS ||--o{ DISPATCH_ITEMS : shipped_in
```

---

## 4. API Documentation

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticate user & receive JWT token |
| `GET` | `/api/customers` | Admin, Sales | Fetch list of registered customers |
| `POST` | `/api/customers` | Admin, Sales | Create customer (`company_name`, `contact_person`, `email`, `mobile`, `city`) |
| `GET` | `/api/products` | Admin, Sales | Fetch product master catalog |
| `GET` | `/api/inventory` | Admin, Sales | Fetch warehouse stock with calculated available quantity |
| `GET` | `/api/enquiries` | Admin, Sales | Fetch enquiries with line items and customer info |
| `POST` | `/api/enquiries` | Admin, Sales | Create enquiry with multiple product line items |
| `GET` | `/api/quotations` | Admin, Sales | Fetch quotations with financial breakdown |
| `POST` | `/api/quotations` | Admin, Sales | Create quotation against enquiry (backend calculates tax/discount/totals) |
| `PATCH` | `/api/quotations/:id/status` | Admin, Sales | Update status (`DRAFT` $\to$ `SENT` $\to$ `ACCEPTED` / `REJECTED`) |
| `POST` | `/api/quotations/:id/convert` | Admin, Sales | Convert `ACCEPTED` quotation into Sales Order (rejection prevention & duplicate protection) |
| `GET` | `/api/sales-orders` | Admin, Sales | Fetch all sales orders with line items |
| `POST` | `/api/sales-orders/:id/confirm` | **Admin Only** | Concurrency-protected inventory reservation |
| `POST` | `/api/sales-orders/:id/dispatch` | **Admin Only** | Process dispatch, deduct physical & reserved quantities |
| `POST` | `/api/sales-orders/:id/cancel` | Admin, Sales | Cancel sales order and release reserved stock |
| `GET` | `/api/dispatches` | Admin, Sales | Fetch outbound dispatch history |

---

## 5. Automated Test Suite

The project includes an automated test suite verifying all 5 mandatory case study tests + concurrency bonus + end-to-end workflow:

```bash
cd erp_backend
npm test
```

### Verified Test Cases:
- **Test 1**: Quotation total is calculated correctly by backend (Subtotal, 10% Discount, 18% GST, Grand Total).
- **Test 2**: `DRAFT` and `REJECTED` quotations cannot create a Sales Order.
- **Test 3**: Same quotation cannot generate duplicate Sales Orders.
- **Test 4**: Cannot reserve more than available inventory during Sales Order confirmation.
- **Test 5**: Unauthorized Sales user cannot perform restricted Admin actions (`confirm`, `dispatch`).
- **Bonus Test**: Concurrent reservations beyond available inventory cannot both succeed (`Promise.all` race condition validation).
- **End-to-End Workflow**: Full lifecycle $\text{Enquiry} \to \text{Quote} \to \text{Order} \to \text{Reservation} \to \text{Dispatch}$ decreases inventory accurately.

---

## 6. How to Run Locally

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally on port 5432)

### 1. Database Setup
Ensure PostgreSQL is running and a database named `ERP_System` exists:
```sql
CREATE DATABASE "ERP_System";
```

### 2. Backend Setup
```bash
cd erp_backend
npm install
npm run seed     # Automatically applies schema.sql and seeds initial products, users, customers
npm run dev      # Starts Express server on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd erp_frontend
npm install
npm run dev      # Starts Vite React dev server on http://localhost:5173
```

---

## 7. Test Login Credentials

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **ADMIN** | `admin@company.com` | `password123` | View all, Reserve stock, Confirm orders, Process dispatches, Cancel orders |
| **SALES** | `sales@company.com` | `password123` | Create customers & enquiries, Draft quotations, Convert accepted quotes, View inventory |

*(The login screen also features 1-click credential buttons for immediate demoing).*
