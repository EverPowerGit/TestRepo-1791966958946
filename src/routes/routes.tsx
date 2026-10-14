import { Routes, Route } from 'react-router-dom';
import Layout from '../Components/Layout/Layout';
import NotFound from '../Components/Shared/NotFound';
import DashboardHome from '../views/DashboardHome';
import EmployeesPage from '../Components/Employee/EmployeePage';
import PayrollPage from '../Components/Payroll/PayrollPage';
import PaymentsPage from '../Components/Payments/PaymentsPage';
import ClusterPage from '../Components/Cluster/ClusterPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardHome />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="cluster" element={<ClusterPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
