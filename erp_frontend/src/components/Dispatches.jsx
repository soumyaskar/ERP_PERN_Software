import { useState, useEffect } from 'react';
import api from '../api';
import { Truck } from 'lucide-react';

const Dispatches = () => {
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDispatches = async () => {
        try {
            const response = await api.get('/dispatches');
            setDispatches(response.data);
        } catch (error) {
            console.error('Failed to fetch dispatches', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDispatches();
    }, []);

    if (loading) return <div className="text-center py-10 font-medium text-gray-500">Loading dispatches...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Dispatch Log</h3>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                            <th className="p-4 font-semibold">Dispatch No.</th>
                            <th className="p-4 font-semibold">Sales Order No.</th>
                            <th className="p-4 font-semibold">Vehicle Number</th>
                            <th className="p-4 font-semibold">Driver Name</th>
                            <th className="p-4 font-semibold">Dispatch Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {dispatches.map((dispatch) => (
                            <tr key={dispatch.id} className="hover:blue-50/50 transition-colors">
                                <td className="p-4 font-semibold text-gray-800">{dispatch.dispatch_number}</td>
                                <td className="p-4 text-blue-600 font-medium text-sm">{dispatch.order_number}</td>
                                <td className="p-4 text-gray-800 font-medium text-sm bg-gray-50/50 rounded">
                                    {dispatch.vehicle_number}
                                </td>
                                <td className="p-4 text-gray-600 text-sm">{dispatch.driver_name}</td>
                                <td className="p-4 text-gray-600 text-sm">
                                    {new Date(dispatch.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {dispatches.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500 text-sm">
                                    No dispatches found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dispatches;