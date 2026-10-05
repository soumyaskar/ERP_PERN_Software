import { useState, useEffect } from 'react';
import api from '../api';
import { FileText } from 'lucide-react';

const Quotations = () => {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQuotations = async () => {
        try {
            const response = await api.get('/quotations');
            setQuotations(response.data);
        } catch (error) {
            console.error('Failed to fetch quotations', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotations();
    }, []);

    if (loading) return <div className="text-center py-10 font-medium text-gray-500">Loading quotations...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Financial Quotations</h3>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all">
                    Create Quotation
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                            <th className="p-4 font-semibold">Quote No.</th>
                            <th className="p-4 font-semibold">Customer</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Subtotal</th>
                            <th className="p-4 font-semibold text-right">Tax</th>
                            <th className="p-4 font-semibold text-right">Grand Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {quotations.map((quote) => (
                            <tr key={quote.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="p-4 font-semibold text-gray-800">{quote.quotation_number}</td>
                                <td className="p-4 text-gray-600 text-sm">{quote.company_name}</td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                        quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                        quote.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {quote.status}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-600 text-sm text-right">₹{parseFloat(quote.subtotal).toLocaleString('en-IN')}</td>
                                <td className="p-4 text-gray-600 text-sm text-right text-red-500">+ ₹{parseFloat(quote.tax_amount).toLocaleString('en-IN')}</td>
                                <td className="p-4 font-bold text-gray-800 text-right">₹{parseFloat(quote.grand_total).toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                        {quotations.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500 text-sm">
                                    No quotations found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Quotations;