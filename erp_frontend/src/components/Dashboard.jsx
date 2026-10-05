import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Welcome, {user.name}</h1>
                <button 
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Your role: <span className="font-bold">{user.role}</span></p>
                <p className="mt-4 text-sm text-gray-500">Dashboard modules will load here...</p>
            </div>
        </div>
    );
};

export default Dashboard;