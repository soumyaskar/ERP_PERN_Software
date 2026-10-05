import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
    ShoppingCart, 
    CheckCircle, 
    Truck, 
    XCircle, 
    Boxes, 
    AlertTriangle, 
    ChevronDown, 
    ChevronRight, 
    X, 
    ShieldAlert, 
    RefreshCw,
    ClipboardCheck
} from 'lucide-react';

const SalesOrders = () => {
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Active View Tab: 'ORDERS', 'INVENTORY', 'DISPATCHES'
    const [activeTab, setActiveTab] = useState('ORDERS');
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    // Dispatch Modal State
    const [dispatchingOrder, setDispatchingOrder] = useState(null);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [driverName, setDriverName] = useState('');
    const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().slice(0, 10));
    const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    // Current user and role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'ADMIN';

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordersRes, invRes, dispRes] = await Promise.all([
                api.get('/sales-orders'),
                api.get('/inventory'),
                api.get('/dispatches')
            ]);
            setOrders(ordersRes.data);
            setInventory(invRes.data);
            setDispatches(dispRes.data);
        } catch (error) {
            console.error('Failed to load Sales Orders & Inventory', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 1. Confirm & Reserve Stock (Admin Only)
    const handleConfirmOrder = async (orderId) => {
        setActionMessage(null);
        try {
            const res = await api.post(`/sales-orders/${orderId}/confirm`);
            setActionMessage({ type: 'success', text: res.data.message || 'Order confirmed and inventory reserved!' });
            fetchData();
        } catch (error) {
            const errMsg = error.response?.data?.error || 'Failed to confirm order';
            setActionMessage({ type: 'error', text: errMsg });
        }
    };

    // 2. Open Dispatch Modal
    const handleOpenDispatchModal = (order) => {
        setDispatchingOrder(order);
        setVehicleNumber('');
        setDriverName('');
        setDispatchDate(new Date().toISOString().slice(0, 10));
    };

    // 3. Process Dispatch Submit
    const handleProcessDispatch = async (e) => {
        e.preventDefault();
        if (!dispatchingOrder) return;
        setActionMessage(null);
        setDispatchSubmitting(true);

        try {
            await api.post(`/sales-orders/${dispatchingOrder.id}/dispatch`, {
                vehicle_number: vehicleNumber,
                driver_name: driverName,
                dispatch_date: dispatchDate
            });
            setDispatchingOrder(null);
            setActionMessage({ type: 'success', text: 'Order dispatched successfully! Stock updated.' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to dispatch order');
        } finally {
            setDispatchSubmitting(false);
        }
    };

    // 4. Cancel Order & Release Stock
    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order? Any reserved inventory will be released.')) {
            return;
        }
        setActionMessage(null);
        try {
            const res = await api.post(`/sales-orders/${orderId}/cancel`);
            setActionMessage({ type: 'success', text: res.data.message || 'Order cancelled and stock released.' });
            fetchData();
        } catch (error) {
            setActionMessage({ type: 'error', text: error.response?.data?.error || 'Failed to cancel order' });
        }
    };

    const toggleExpand = (id) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500 font-medium">
                Loading Sales Orders & Warehouse Inventory...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Operational Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Sales Orders & Fulfillment Operations</h2>
                        <p className="text-xs text-gray-500">Live Inventory Reservation • Concurrency Protected • Warehouse Dispatch</p>
                    </div>
                </div>

                {/* Tab Selector */}
                <div className="flex items-center space-x-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                        <button
                            onClick={() => setActiveTab('ORDERS')}
                            className={`px-3 py-1.5 rounded-md transition ${
                                activeTab === 'ORDERS' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Sales Orders ({orders.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('INVENTORY')}
                            className={`px-3 py-1.5 rounded-md transition ${
                                activeTab === 'INVENTORY' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Live Stock Master ({inventory.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('DISPATCHES')}
                            className={`px-3 py-1.5 rounded-md transition ${
                                activeTab === 'DISPATCHES' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Dispatch History ({dispatches.length})
                        </button>
                    </div>

                    <button
                        onClick={fetchData}
                        title="Refresh Data"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {actionMessage && (
                <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
                    actionMessage.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    <span>{actionMessage.text}</span>
                    <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* TAB 1: SALES ORDERS */}
            {activeTab === 'ORDERS' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                            <h3 className="text-sm font-bold text-gray-900">Registered Sales Orders</h3>
                        </div>
                        {!isAdmin && (
                            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                Sales User View (Confirmation & Dispatch require Admin)
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold w-12"></th>
                                    <th className="p-4 font-semibold">Order No.</th>
                                    <th className="p-4 font-semibold">Customer</th>
                                    <th className="p-4 font-semibold">Quote Ref</th>
                                    <th className="p-4 font-semibold">Order Date</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Total Amount</th>
                                    <th className="p-4 font-semibold text-center">Fulfillment Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => {
                                    const isExpanded = expandedOrderId === order.id;

                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr className="hover:bg-blue-50/40 transition-colors">
                                                <td className="p-4 text-center cursor-pointer" onClick={() => toggleExpand(order.id)}>
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-gray-500 inline" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                                                    )}
                                                </td>
                                                <td className="p-4 font-semibold text-gray-900 font-mono text-xs">
                                                    {order.order_number}
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold text-gray-800">{order.customer_name}</div>
                                                    <div className="text-xs text-gray-400">{order.contact_person}</div>
                                                </td>
                                                <td className="p-4 font-mono text-xs text-blue-600">
                                                    {order.quotation_number}
                                                </td>
                                                <td className="p-4 text-xs text-gray-600">
                                                    {order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                                        order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                                        order.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-800' :
                                                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                        'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-bold text-gray-900 font-mono text-sm">
                                                    ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center space-x-1.5">
                                                        {/* Status PENDING */}
                                                        {order.status === 'PENDING' && (
                                                            <>
                                                                {isAdmin ? (
                                                                    <button
                                                                        onClick={() => handleConfirmOrder(order.id)}
                                                                        className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition"
                                                                    >
                                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                                        <span>Confirm & Reserve</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 italic">Awaiting Admin Confirmation</span>
                                                                )}

                                                                <button
                                                                    onClick={() => handleCancelOrder(order.id)}
                                                                    className="inline-flex items-center space-x-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                    <span>Cancel</span>
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Status CONFIRMED */}
                                                        {order.status === 'CONFIRMED' && (
                                                            <>
                                                                {isAdmin ? (
                                                                    <button
                                                                        onClick={() => handleOpenDispatchModal(order)}
                                                                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-xs transition"
                                                                    >
                                                                        <Truck className="w-3.5 h-3.5" />
                                                                        <span>Dispatch Goods</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-blue-600 font-medium">Stock Reserved</span>
                                                                )}

                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => handleCancelOrder(order.id)}
                                                                        title="Cancel and release reserved stock"
                                                                        className="inline-flex items-center space-x-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition"
                                                                    >
                                                                        <span>Cancel & Release</span>
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Status DISPATCHED */}
                                                        {order.status === 'DISPATCHED' && (
                                                            <div className="flex items-center space-x-1 text-purple-700 text-xs font-medium">
                                                                <ClipboardCheck className="w-4 h-4" />
                                                                <span>{order.dispatch_number || 'Dispatched'}</span>
                                                            </div>
                                                        )}

                                                        {/* Status CANCELLED */}
                                                        {order.status === 'CANCELLED' && (
                                                            <span className="text-xs text-gray-400">Cancelled</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Order Items Row */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/70 border-b border-gray-200">
                                                    <td colSpan="8" className="p-5 pl-14">
                                                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                                                    Ordered Line Items ({order.items?.length || 0})
                                                                </h4>
                                                                {order.dispatch_number && (
                                                                    <span className="text-xs font-mono text-purple-700 font-semibold">
                                                                        Dispatch: {order.dispatch_number} (Vehicle: {order.vehicle_number}, Driver: {order.driver_name})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <table className="w-full text-left text-xs">
                                                                <thead>
                                                                    <tr className="border-b border-gray-200 text-gray-500">
                                                                        <th className="pb-2 font-semibold">Product Code</th>
                                                                        <th className="pb-2 font-semibold">Product Description</th>
                                                                        <th className="pb-2 font-semibold text-right">Quantity</th>
                                                                        <th className="pb-2 font-semibold text-right">Unit Price</th>
                                                                        <th className="pb-2 font-semibold text-right">Line Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {order.items?.map((item, idx) => (
                                                                        <tr key={idx} className="py-2 font-mono">
                                                                            <td className="py-2 text-gray-700 font-medium">{item.product_code}</td>
                                                                            <td className="py-2 text-gray-800 font-sans">{item.product_name}</td>
                                                                            <td className="py-2 text-right font-bold text-gray-900">{item.quantity} {item.unit}</td>
                                                                            <td className="py-2 text-right text-gray-600">₹{Number(item.unit_price).toFixed(2)}</td>
                                                                            <td className="py-2 text-right font-bold text-gray-900">₹{Number(item.line_amount).toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="p-10 text-center text-gray-500 text-sm">
                                            No sales orders created yet. Accept a Quotation and convert it into a Sales Order.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: LIVE INVENTORY MASTER */}
            {activeTab === 'INVENTORY' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <Boxes className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-sm font-bold text-gray-900">Warehouse Inventory Master</h3>
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                            Available Stock = Physical Stock − Reserved Stock − Damaged Stock
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold">Product Code</th>
                                    <th className="p-4 font-semibold">Product Name</th>
                                    <th className="p-4 font-semibold">Category</th>
                                    <th className="p-4 font-semibold">Base Price</th>
                                    <th className="p-4 font-semibold text-right">Physical Stock</th>
                                    <th className="p-4 font-semibold text-right text-amber-700">Reserved</th>
                                    <th className="p-4 font-semibold text-right text-red-600">Damaged</th>
                                    <th className="p-4 font-semibold text-right text-emerald-700 font-bold">Available Stock</th>
                                    <th className="p-4 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono text-xs">
                                {inventory.map((inv) => {
                                    const available = Number(inv.available_qty);
                                    const physical = Number(inv.physical_qty);
                                    const reserved = Number(inv.reserved_qty);
                                    const damaged = Number(inv.damaged_qty || 0);

                                    return (
                                        <tr key={inv.product_id} className="hover:bg-gray-50/70">
                                            <td className="p-4 font-bold text-gray-900">{inv.product_code}</td>
                                            <td className="p-4 font-sans font-semibold text-gray-800 text-sm">
                                                {inv.product_name}
                                                <span className="block text-[11px] text-gray-400 font-normal">Per {inv.unit}</span>
                                            </td>
                                            <td className="p-4 font-sans text-gray-600">{inv.category}</td>
                                            <td className="p-4 text-gray-600">₹{Number(inv.base_price).toLocaleString('en-IN')}</td>
                                            <td className="p-4 text-right font-bold text-gray-800">{physical}</td>
                                            <td className="p-4 text-right font-bold text-amber-600">
                                                {reserved > 0 ? reserved : 0}
                                            </td>
                                            <td className="p-4 text-right font-bold text-red-500">
                                                {damaged}
                                            </td>
                                            <td className="p-4 text-right font-black text-sm text-emerald-700">
                                                {available}
                                            </td>
                                            <td className="p-4 text-center font-sans">
                                                {available > 20 ? (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                        Healthy Stock
                                                    </span>
                                                ) : available > 0 ? (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                                        Low Stock
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                                                        Fully Reserved
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: DISPATCH HISTORY */}
            {activeTab === 'DISPATCHES' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <Truck className="w-4 h-4 text-purple-600" />
                            <h3 className="text-sm font-bold text-gray-900">Warehouse Outbound Dispatches</h3>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                    <th className="p-4 font-semibold">Dispatch No.</th>
                                    <th className="p-4 font-semibold">Sales Order No.</th>
                                    <th className="p-4 font-semibold">Customer</th>
                                    <th className="p-4 font-semibold">Vehicle Number</th>
                                    <th className="p-4 font-semibold">Driver Name</th>
                                    <th className="p-4 font-semibold">Date Dispatched</th>
                                    <th className="p-4 font-semibold">Dispatched Items</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {dispatches.map((disp) => (
                                    <tr key={disp.id} className="hover:bg-purple-50/30">
                                        <td className="p-4 font-mono font-bold text-gray-900">{disp.dispatch_number}</td>
                                        <td className="p-4 font-mono font-semibold text-blue-600">{disp.order_number}</td>
                                        <td className="p-4 font-semibold text-gray-800">{disp.customer_name}</td>
                                        <td className="p-4 font-mono font-semibold text-gray-800 bg-gray-50 rounded">
                                            {disp.vehicle_number}
                                        </td>
                                        <td className="p-4 text-gray-600">{disp.driver_name}</td>
                                        <td className="p-4 text-gray-500">
                                            {new Date(disp.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                {disp.items?.map((it, idx) => (
                                                    <div key={idx} className="text-gray-700">
                                                        <span className="font-semibold">{it.product_code}</span>: {it.quantity} {it.unit}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {dispatches.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-10 text-center text-gray-500 text-sm">
                                            No dispatches processed yet. Confirm an order and process dispatch as Admin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: Process Order Dispatch */}
            {dispatchingOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <Truck className="w-5 h-5 text-purple-600" />
                                <h3 className="text-base font-bold text-gray-900">Process Goods Dispatch</h3>
                            </div>
                            <button onClick={() => setDispatchingOrder(null)} className="text-gray-400 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleProcessDispatch} className="p-6 space-y-4">
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 space-y-1">
                                <div className="font-bold">Sales Order: {dispatchingOrder.order_number}</div>
                                <div>Customer: {dispatchingOrder.customer_name}</div>
                                <div>Total Items: {dispatchingOrder.items?.length || 0} Products</div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Logistics Vehicle Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. MH-04-AB-1234"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Driver / Logistics Partner Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Ramesh Patil / BlueDart Logistics"
                                    value={driverName}
                                    onChange={(e) => setDriverName(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Dispatch Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={dispatchDate}
                                    onChange={(e) => setDispatchDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-gray-500 italic">
                                * Dispatching will automatically deduct both Physical Quantity and Reserved Quantity in warehouse inventory.
                            </p>

                            <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setDispatchingOrder(null)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={dispatchSubmitting}
                                    className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
                                >
                                    {dispatchSubmitting ? 'Dispatching...' : 'Confirm Dispatch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesOrders;