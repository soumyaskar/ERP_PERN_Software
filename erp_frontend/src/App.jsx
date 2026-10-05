import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import Customers from './components/Customer';
import Quotations from './components/Quotations'; // 1. Import the new component
import SalesOrders from './components/SalesOrders';
import Dispatches from './components/Dispatches';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          {/* 2. Add the Quotations route here */}
          <Route path="quotations" element={<Quotations />} />
          <Route path="orders" element={<SalesOrders />} />
          <Route path="dispatches" element={<Dispatches />} />
          
          <Route path="*" element={<div className="p-4">Module coming soon...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;