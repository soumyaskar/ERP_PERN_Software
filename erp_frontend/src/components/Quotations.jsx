import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { 
    FileText, 
    Plus, 
    CheckCircle, 
    XCircle, 
    Send, 
    ShoppingCart, 
    ChevronDown, 
    ChevronRight, 
    X, 
    AlertCircle, 
    Mail, 
    Phone, 
    SendHorizontal,
    Check
} from 'lucide-react';

const Quotations = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [enquiries, setEnquiries] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for Create Quotation
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedQuoteId, setExpandedQuoteId] = useState(null);

    // Send Quote Modal State
    const [sendingQuote, setSendingQuote] = useState(null);
    const [sendChannel, setSendChannel] = useState('EMAIL'); // 'EMAIL' or 'PHONE'
    const [statusToast, setStatusToast] = useState(null); // { type: 'success' | 'error', text: '' }
    const [isSending, setIsSending] = useState(false);

    // Form state
    const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [quoteItems, setQuoteItems] = useState([]);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch all necessary data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [quoteRes, enqRes, ordersRes] = await Promise.all([
                api.get('/quotations'),
                api.get('/enquiries'),
                api.get('/sales-orders')
            ]);
            setQuotations(quoteRes.data);
            setEnquiries(enqRes.data);
            setSalesOrders(ordersRes.data);
        } catch (error) {
            console.error('Failed to load quotations data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Check if redirected from Enquiries page with a specific enquiry
    useEffect(() => {
        if (location.state?.createForEnquiryId && enquiries.length > 0) {
            handleOpenModalForEnquiry(location.state.createForEnquiryId);
            // CRITICAL: Clear location.state so subsequent renders/fetches don't reopen modal
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.createForEnquiryId, enquiries.length]);

    const handleOpenModalForEnquiry = (enquiryId) => {
        setSelectedEnquiryId(enquiryId);
        const enq = enquiries.find(e => e.id === enquiryId);
        if (enq && enq.items) {
            const items = enq.items.map(it => ({
                product_id: it.product_id,
                product_code: it.product_code,
                product_name: it.product_name,
                unit: it.unit,
                quantity: it.quantity,
                unit_price: Number(it.base_price || 0),
                discount_pct: 0,
                gst_pct: 18
            }));
            setQuoteItems(items);
        } else {
            setQuoteItems([]);
        }

        // Set default valid until to 30 days ahead
        const future = new Date();
        future.setDate(future.getDate() + 30);
        setValidUntil(future.toISOString().slice(0, 10));

        setFormError('');
        setIsModalOpen(true);
    };

    const handleEnquirySelectChange = (e) => {
        const enqId = e.target.value;
        setSelectedEnquiryId(enqId);
        const enq = enquiries.find(item => item.id === enqId);
        if (enq && enq.items) {
            setQuoteItems(enq.items.map(it => ({
                product_id: it.product_id,
                product_code: it.product_code,
                product_name: it.product_name,
                unit: it.unit,
                quantity: it.quantity,
                unit_price: Number(it.base_price || 0),
                discount_pct: 0,
                gst_pct: 18
            })));
        } else {
            setQuoteItems([]);
        }
    };

    const handleItemParamChange = (index, field, value) => {
        const updated = [...quoteItems];
        updated[index][field] = Number(value);
        setQuoteItems(updated);
    };

    // Live Calculation Summary
    const calculatedSummary = quoteItems.reduce((acc, it) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.unit_price || 0);
        const discPct = Number(it.discount_pct || 0);
        const gstPct = Number(it.gst_pct !== undefined ? it.gst_pct : 18);

        const base = qty * price;
        const discount = base * (discPct / 100);
        const taxable = base - discount;
        const tax = taxable * (gstPct / 100);
        const line = taxable + tax;

        acc.subtotal += base;
        acc.discount += discount;
        acc.tax += tax;
        acc.grandTotal += line;
        return acc;
    }, { subtotal: 0, discount: 0, tax: 0, grandTotal: 0 });

    const handleCreateQuotation = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!selectedEnquiryId) {
            setFormError('Please select a referenced enquiry.');
            return;
        }
        if (quoteItems.length === 0) {
            setFormError('Quotation must contain at least one product item.');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/quotations', {
                enquiry_id: selectedEnquiryId,
                valid_until: validUntil || null,
                items: quoteItems.map(it => ({
                    product_id: it.product_id,
                    quantity: it.quantity,
                    unit_price: it.unit_price,
                    discount_pct: it.discount_pct,
                    gst_pct: it.gst_pct
                }))
            });

            setIsModalOpen(false);
            setSelectedEnquiryId('');
            setQuoteItems([]);
            setValidUntil('');
            setFormError('');
            navigate(location.pathname, { replace: true, state: {} });
            await fetchData();
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to create quotation');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmSendQuote = async (e) => {
        if (e) e.preventDefault();
        if (!sendingQuote) return;

        try {
            setIsSending(true);
            await api.patch(`/quotations/${sendingQuote.id}/status`, { status: 'SENT' });
            
            const contactTarget = sendChannel === 'EMAIL' 
                ? (sendingQuote.customer_email ? `Email (${sendingQuote.customer_email})` : 'Registered Email')
                : (sendingQuote.customer_mobile ? `Phone Call (${sendingQuote.customer_mobile})` : 'Registered Phone');

            setStatusToast({
                type: 'success',
                text: `Quotation ${sendingQuote.quotation_number} successfully dispatched to ${sendingQuote.company_name} via ${contactTarget}!`
            });
            setSendingQuote(null);
            await fetchData();
        } catch (error) {
            setStatusToast({
                type: 'error',
                text: 'Failed to send quotation: ' + (error.response?.data?.error || error.message)
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleStatusUpdate = async (quote, status) => {
        try {
            await api.patch(`/quotations/${quote.id}/status`, { status });
            if (status === 'ACCEPTED') {
                setStatusToast({
                    type: 'success',
                    text: `Customer ${quote.company_name} ACCEPTED quotation ${quote.quotation_number}! The proposal has been approved and is ready to convert to a Sales Order.`
                });
            } else if (status === 'REJECTED') {
                setStatusToast({
                    type: 'error',
                    text: `Customer ${quote.company_name} REJECTED quotation ${quote.quotation_number}. The proposal has been marked as Lost/Rejected.`
                });
            }
            await fetchData();
        } catch (error) {
            setStatusToast({
                type: 'error',
                text: 'Failed to update status: ' + (error.response?.data?.error || error.message)
            });
        }
    };

    const handleConvertToSalesOrder = async (quoteId) => {
        try {
            const res = await api.post(`/quotations/${quoteId}/convert`);
            alert(`Sales Order ${res.data.order_number} successfully created!`);
            fetchData();
            navigate('/dashboard/orders');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to convert quotation into Sales Order');
        }
    };

    const toggleExpand = (id) => {
        setExpandedQuoteId(expandedQuoteId === id ? null : id);
    };

    // Check if quotation already has an order generated
    const hasOrder = (quoteId) => {
        return salesOrders.some(so => so.quotation_id === quoteId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500 font-medium">
                Loading Quotations...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Notification Toast Banner: Green for Accept/Success, Red for Reject/Error */}
            {statusToast && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all ${
                    statusToast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                    <div className="flex items-center space-x-2.5">
                        {statusToast.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                        )}
                        <span>{statusToast.text}</span>
                    </div>
                    <button 
                        onClick={() => setStatusToast(null)}
                        className={`font-bold ml-4 p-1 rounded-md transition ${
                            statusToast.type === 'success'
                                ? 'text-emerald-700 hover:bg-emerald-100'
                                : 'text-red-700 hover:bg-red-100'
                        }`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Total Quotations</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{quotations.length}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
                    <p className="text-xs font-semibold text-amber-600 uppercase">Drafts</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                        {quotations.filter(q => q.status === 'DRAFT').length}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                    <p className="text-xs font-semibold text-blue-600 uppercase">Sent to Customer</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                        {quotations.filter(q => q.status === 'SENT').length}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                    <p className="text-xs font-semibold text-emerald-600 uppercase">Accepted</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                        {quotations.filter(q => q.status === 'ACCEPTED').length}
                    </p>
                </div>
            </div>

            {/* Quotations Main Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Commercial Quotations</h3>
                            <p className="text-xs text-gray-500">Draft, price, tax, and convert quotations into confirmed sales orders</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            if (enquiries.length > 0) {
                                handleOpenModalForEnquiry(enquiries[0].id);
                            } else {
                                alert('Please create a customer enquiry first before creating a quotation.');
                            }
                        }}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Quotation</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4 font-semibold w-12"></th>
                                <th className="p-4 font-semibold">Quote No.</th>
                                <th className="p-4 font-semibold">Enquiry Ref</th>
                                <th className="p-4 font-semibold">Customer</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Subtotal</th>
                                <th className="p-4 font-semibold text-right">GST (18%)</th>
                                <th className="p-4 font-semibold text-right">Grand Total</th>
                                <th className="p-4 font-semibold text-center">Lifecycle Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {quotations.map((quote) => {
                                const isExpanded = expandedQuoteId === quote.id;
                                const isConverted = hasOrder(quote.id);

                                return (
                                    <React.Fragment key={quote.id}>
                                        <tr className="hover:bg-blue-50/40 transition-colors">
                                            <td className="p-4 text-center cursor-pointer" onClick={() => toggleExpand(quote.id)}>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500 inline" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                                                )}
                                            </td>
                                            <td className="p-4 font-semibold text-gray-900 font-mono text-xs">
                                                {quote.quotation_number}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-blue-600">
                                                {quote.enquiry_number}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold text-gray-800">{quote.company_name}</div>
                                                <div className="text-xs text-gray-400">{quote.contact_person}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                                    quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                                                    quote.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                    quote.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {quote.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right text-gray-600 text-xs font-mono">
                                                ₹{Number(quote.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-right text-xs font-mono text-indigo-600">
                                                +₹{Number(quote.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-right font-bold text-gray-900 text-sm font-mono">
                                                ₹{Number(quote.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-center">
                                                {/* Action buttons based on status & conversion */}
                                                <div className="flex items-center justify-center space-x-1.5">
                                                    {quote.status === 'DRAFT' && (
                                                        <button
                                                            onClick={() => {
                                                                setSendingQuote(quote);
                                                                setSendChannel(quote.customer_email ? 'EMAIL' : (quote.customer_mobile ? 'PHONE' : 'EMAIL'));
                                                            }}
                                                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold transition"
                                                            title="Send Quote to Customer"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            <span>Send</span>
                                                        </button>
                                                    )}

                                                    {quote.status === 'SENT' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(quote, 'ACCEPTED')}
                                                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold transition"
                                                            >
                                                                <CheckCircle className="w-3 h-3" />
                                                                <span>Accept</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(quote, 'REJECTED')}
                                                                className="inline-flex items-center space-x-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-semibold transition"
                                                            >
                                                                <XCircle className="w-3 h-3" />
                                                                <span>Reject</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    {quote.status === 'ACCEPTED' && !isConverted && (
                                                        <button
                                                            onClick={() => handleConvertToSalesOrder(quote.id)}
                                                            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition"
                                                        >
                                                            <ShoppingCart className="w-3 h-3" />
                                                            <span>Convert to Order</span>
                                                        </button>
                                                    )}

                                                    {isConverted && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-600">
                                                            Order Generated
                                                        </span>
                                                    )}

                                                    {quote.status === 'REJECTED' && (
                                                        <span className="text-xs text-gray-400">Archived</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row for Line Items */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50/70 border-b border-gray-200">
                                                <td colSpan="9" className="p-5 pl-14">
                                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                                                Itemized Quotation Breakdown ({quote.items?.length || 0})
                                                            </h4>
                                                            <p className="text-xs text-gray-500">
                                                                Valid Until: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '30 Days from Issue'}
                                                            </p>
                                                        </div>
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="border-b border-gray-200 text-gray-500">
                                                                    <th className="pb-2 font-semibold">Product Code</th>
                                                                    <th className="pb-2 font-semibold">Product Description</th>
                                                                    <th className="pb-2 font-semibold text-right">Quantity</th>
                                                                    <th className="pb-2 font-semibold text-right">Unit Price</th>
                                                                    <th className="pb-2 font-semibold text-right">Discount</th>
                                                                    <th className="pb-2 font-semibold text-right">GST %</th>
                                                                    <th className="pb-2 font-semibold text-right">Line Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {quote.items?.map((item, idx) => (
                                                                    <tr key={idx} className="py-2 font-mono">
                                                                        <td className="py-2 text-gray-700 font-medium">{item.product_code}</td>
                                                                        <td className="py-2 text-gray-800 font-sans">{item.product_name}</td>
                                                                        <td className="py-2 text-right text-gray-900">{item.quantity} {item.unit}</td>
                                                                        <td className="py-2 text-right text-gray-600">₹{Number(item.unit_price).toFixed(2)}</td>
                                                                        <td className="py-2 text-right text-amber-600">{item.discount_pct}%</td>
                                                                        <td className="py-2 text-right text-indigo-600">{item.gst_pct}%</td>
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
                            {quotations.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="p-10 text-center text-gray-500 text-sm">
                                        No quotations generated yet. Click <strong>"Create Quotation"</strong> to begin.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: Create Commercial Quotation */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h3 className="text-base font-bold text-gray-900">Generate Commercial Quotation</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateQuotation} className="p-6 space-y-4 overflow-y-auto flex-1">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Referenced Enquiry *</label>
                                    <select
                                        required
                                        value={selectedEnquiryId}
                                        onChange={handleEnquirySelectChange}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Customer Enquiry...</option>
                                        {enquiries.map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.enquiry_number} — {e.company_name} ({e.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Quotation Valid Until</label>
                                    <input
                                        type="date"
                                        value={validUntil}
                                        onChange={(e) => setValidUntil(e.target.value)}
                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Line Items Pricing Table */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                                    Product Pricing & Line Calculations
                                </label>
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider">
                                                <th className="p-3 font-semibold">Product</th>
                                                <th className="p-3 font-semibold w-20 text-right">Qty</th>
                                                <th className="p-3 font-semibold w-28 text-right">Unit Price (₹)</th>
                                                <th className="p-3 font-semibold w-20 text-right">Disc %</th>
                                                <th className="p-3 font-semibold w-20 text-right">GST %</th>
                                                <th className="p-3 font-semibold w-28 text-right">Line Total (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {quoteItems.map((item, idx) => {
                                                const base = item.quantity * item.unit_price;
                                                const disc = base * (item.discount_pct / 100);
                                                const tax = (base - disc) * (item.gst_pct / 100);
                                                const line = (base - disc) + tax;

                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50/50">
                                                        <td className="p-3">
                                                            <div className="font-semibold text-gray-900">{item.product_name}</div>
                                                            <div className="text-[11px] text-gray-400 font-mono">{item.product_code} • {item.unit}</div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                required
                                                                value={item.quantity}
                                                                onChange={(e) => handleItemParamChange(idx, 'quantity', e.target.value)}
                                                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                required
                                                                value={item.unit_price}
                                                                onChange={(e) => handleItemParamChange(idx, 'unit_price', e.target.value)}
                                                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={item.discount_pct}
                                                                onChange={(e) => handleItemParamChange(idx, 'discount_pct', e.target.value)}
                                                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.gst_pct}
                                                                onChange={(e) => handleItemParamChange(idx, 'gst_pct', e.target.value)}
                                                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-gray-900">
                                                            ₹{line.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Real-time Financials Calculation Preview */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                                <div className="max-w-xs ml-auto space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal (Base):</span>
                                        <span className="font-mono">₹{calculatedSummary.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-amber-600">
                                        <span>Discount:</span>
                                        <span className="font-mono">- ₹{calculatedSummary.discount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-indigo-600">
                                        <span>GST (18%):</span>
                                        <span className="font-mono">+ ₹{calculatedSummary.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                                        <span>Grand Total:</span>
                                        <span className="font-mono">₹{calculatedSummary.grandTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
                                >
                                    {submitting ? 'Generating...' : 'Create Quotation (Draft)'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Dispatch / Inform Quotation to Customer */}
            {sendingQuote && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center space-x-2">
                                <SendHorizontal className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-gray-900 text-sm">Send Quotation to Customer</h3>
                            </div>
                            <button
                                onClick={() => setSendingQuote(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Summary Box */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Quotation No:</span>
                                    <span className="font-mono font-bold text-gray-800">{sendingQuote.quotation_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Customer:</span>
                                    <span className="font-semibold text-gray-800">{sendingQuote.company_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Contact Person:</span>
                                    <span className="text-gray-700">{sendingQuote.contact_person || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                                    <span className="text-gray-500">Grand Total:</span>
                                    <span className="font-mono font-bold text-emerald-700">₹{Number(sendingQuote.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Dispatch Channel Selector */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Select Notification Method:
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSendChannel('EMAIL')}
                                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs transition ${
                                            sendChannel === 'EMAIL'
                                                ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-bold shadow-xs'
                                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Mail className={`w-5 h-5 mb-1 ${sendChannel === 'EMAIL' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <span>Send via Email</span>
                                        <span className="text-[11px] text-gray-400 font-normal truncate max-w-full px-1">
                                            {sendingQuote.customer_email || 'No email saved'}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSendChannel('PHONE')}
                                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs transition ${
                                            sendChannel === 'PHONE'
                                                ? 'border-blue-600 bg-blue-50/60 text-blue-700 font-bold shadow-xs'
                                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Phone className={`w-5 h-5 mb-1 ${sendChannel === 'PHONE' ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <span>Notify via Call / SMS</span>
                                        <span className="text-[11px] text-gray-400 font-normal truncate max-w-full px-1">
                                            {sendingQuote.customer_mobile || 'No phone saved'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-500 italic bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 text-amber-800">
                                This will update the quotation status to <strong>SENT</strong> and notify the customer to approve or reject the proposal.
                            </p>

                            <div className="pt-3 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setSendingQuote(null)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSending}
                                    onClick={handleConfirmSendQuote}
                                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{isSending ? 'Sending...' : `Confirm & Send via ${sendChannel === 'EMAIL' ? 'Email' : 'Call'}`}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quotations;