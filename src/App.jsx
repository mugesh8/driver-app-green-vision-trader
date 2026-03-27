import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import MainLayout from './layout/MainLayout';
import AuthLayout from './layout/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import AddFuelExpense from './pages/AddFuelExpense';
import Kilometer from './pages/Kilometer';
import AdvancePay from './pages/AdvancePay';
import Profile from './pages/Profile';
import RouteInformation from './pages/RouteInformation';
import AirportDelivery from './pages/AirportDelivery';
import LocalOrderView from './pages/LocalOrderView';
import AirportOrderView from './pages/AirportOrderView';
import LocalOrderViewInfo from './pages/LocalOrderViewInfo';
import AirportOrderViewInfo from './pages/AirportOrderViewInfo';
import Notifications from './pages/Notifications';
import Remarks from './pages/Remarks';
import Settings from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';

function App() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-white">
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={
                <PublicRoute>
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                </PublicRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="expenses" element={<AddFuelExpense />} />
                <Route path="kilometer" element={<Kilometer />} />
                <Route path="advance-pay" element={<AdvancePay />} />
                <Route path="profile" element={<Profile />} />
                <Route path="route-info" element={<RouteInformation />} />
                <Route path="airport-delivery" element={<AirportDelivery />} />
                <Route path="local-order-view" element={<LocalOrderView />} />
                <Route path="airport-order-view" element={<AirportOrderView />} />
                <Route path="local-order-view-info" element={<LocalOrderViewInfo />} />
                <Route path="airport-order-view-info" element={<AirportOrderViewInfo />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="remarks" element={<Remarks />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
