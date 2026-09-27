import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import RequireRole from './components/RequireRole'
import RoleRedirect from './components/RoleRedirect'
import AppLayout from './layouts/AppLayout'
import CartaAceptacionPage from './pages/alumno/CartaAceptacionPage'
import DocumentosPage from './pages/alumno/DocumentosPage'
import LoginPage from './pages/LoginPage'
import SolicitudesPage from './pages/coordinador/SolicitudesPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoleRedirect />} />

          <Route element={<RequireRole role="alumno" />}>
            <Route path="/alumno" element={<Navigate to="/alumno/documentos" replace />} />
            <Route path="/alumno/documentos" element={<DocumentosPage />} />
            <Route path="/alumno/solicitud/carta-aceptacion" element={<CartaAceptacionPage />} />
          </Route>

          <Route element={<RequireRole role="coordinador" />}>
            <Route path="/coordinador" element={<SolicitudesPage />} />
          </Route>

          <Route
            path="*"
            element={<div className="py-16 text-center text-gray-500">Página no encontrada</div>}
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
