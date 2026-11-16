import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { HomeRedirect, ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Login } from './pages/Login.jsx';
import { Manager } from './pages/Manager.jsx';
import { FleetMap } from './pages/FleetMap.jsx';
import { MachineDetail } from './pages/MachineDetail.jsx';
import { Incidents } from './pages/Incidents.jsx';
import { MyTasks } from './pages/MyTasks.jsx';
import { Parts } from './pages/Parts.jsx';
import { Productivity } from './pages/Productivity.jsx';
import { CommonCauses } from './pages/CommonCauses.jsx';
import { Maintenance } from './pages/Maintenance.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/mapa" element={<FleetMap />} />
          <Route path="/maquinas/:id" element={<MachineDetail />} />

          <Route element={<ProtectedRoute roles={['tecnico', 'gerente']} />}>
            <Route path="/mis-tareas" element={<MyTasks />} />
            <Route path="/incidentes" element={<Incidents />} />
            <Route path="/incidentes/:id" element={<Incidents />} />
            <Route path="/repuestos" element={<Parts />} />
            <Route path="/mantenimiento" element={<Maintenance />} />
          </Route>

          <Route element={<ProtectedRoute roles={['gerente']} />}>
            <Route path="/gerente" element={<Manager />} />
            <Route path="/productividad" element={<Productivity />} />
            <Route path="/causas-comunes" element={<CommonCauses />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Route>
    </Routes>
  );
}
