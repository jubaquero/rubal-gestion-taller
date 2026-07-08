import React, { useState } from 'react';
import './App.css';
import logoRubal from './assets/logo_rubal.png';
import Login from './components/Login'; // <-- IMPORTAMOS EL LOGIN
import Clientes from './components/Clientes';
import Marcas from './components/Marcas';
import Categorias from './components/Categorias';
import Proveedores from './components/Proveedores';
import Aumentos from './components/Aumentos';
import Mano_de_Obra from './components/Mano_de_Obra';
import Productos from './components/Productos';
import Almacenes from './components/Almacenes';
import Movimientos from './components/Movimientos';
import Trabajos from './components/Trabajos';
import Presupuestos from './components/Presupuestos';
import Dashboard_Presupuestos from './components/Dashboard_Presupuestos';
import Dashboard_EstadoTaller from './components/Dashboard_EstadoTaller';
import Recibos from './components/Recibos';
import Comisiones from './components/Comisiones';
import Reporte_Saldos from './components/Reporte_Saldos';
import Argon from './components/Argon';
import Caja from './components/Caja';
import Dashboard_Gastos from './components/Dashboard_Gastos';

function App() {
  // =========================================================
  // 0. SISTEMA DE LOGIN Y SEGURIDAD
  // =========================================================
  // Leemos de la memoria del navegador si el usuario ya se había logueado
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('taller_is_logged_in') === 'true';
  });

  const handleLoginStatus = (status) => {
    setIsLoggedIn(status);
    if (status) {
      localStorage.setItem('taller_is_logged_in', 'true');
    } else {
      localStorage.removeItem('taller_is_logged_in');
    }
  };

  // Historial guarda las secciones visitadas
  const [historial, setHistorial] = useState([]);

  // Si no está logueado, BLOQUEA la App entera y muestra el Login
  if (!isLoggedIn) {
    return <Login onLogin={handleLoginStatus} />;
  }

  // =========================================================
  // 1. MENÚ PRINCIPAL (NIVEL 0)
  // =========================================================
  const menuPrincipal = [
    { id: 'configuracion', titulo: 'Configuración', icon: '⚙️', desc: 'Ajustes del sistema (Clientes, Aumentos, Marcas, Categorías de productos).' },
    { id: 'stock', titulo: 'Stock', icon: '📦', desc: 'Administración de repuestos e insumos.' },
    { id: 'presupuestos', titulo: 'Presupuestos', icon: '📋', desc: 'Crear, editar y enviar presupuestos.' },
    { id: 'trabajos', titulo: 'Trabajos', icon: '🛠️', desc: 'Control de motores, estados y fecha fin.' },
    { id: 'pagos', titulo: 'Pagos', icon: '💳', desc: 'Registro de cobros, señas y saldos.' },
    { id: 'caja', titulo: 'Caja', icon: '💵', desc: 'Registro de ingreso y salida de dinero.' }
  ];

  // =========================================================
  // 2. SUBMENÚS DINÁMICOS (NIVEL 1)
  // =========================================================
  const subMenus = {
    configuracion: [
      { id: 'configuracion_clientes', titulo: 'Clientes', icon: '👤', desc: 'Administración, alta y búsqueda de clientes.' },
      { id: 'configuracion_aumentos', titulo: 'Aumentos', icon: '📈', desc: 'Aplicar porcentajes masivos a la mano de obra (FACRA).' },
      { id: 'configuracion_marcas', titulo: 'Marcas', icon: '🏷️', desc: 'Gestión y alta de marcas de motores/vehículos.' },
      { id: 'configuracion_categorias', titulo: 'Categorías', icon: '🗂️', desc: 'Categorías de productos y repuestos.' },
      { id: 'configuracion_proveedores', titulo: 'Proveedores', icon: '🚛', desc: 'Administración, alta y búsqueda de Proveedores.' },
      { id: 'configuracion_mo', titulo: 'Mano de Obra', icon: '🛠️', desc: 'Gestión de servicios, categorías y factores.' },
    ],
    stock: [
      { id: 'stock_productos', titulo: 'Productos', icon: '🧰', desc: 'Catálogo, stock actual y ficha de movimientos.' },
      { id: 'stock_almacenes', titulo: 'Almacenes', icon: '🏢', desc: 'Gestión de estanterías y ubicaciones físicas.' },
      { id: 'stock_movimientos', titulo: 'Movimientos', icon: '🔄', desc: 'Registro de ingresos y egresos de Productos.' },
      { id: 'stock_argon', titulo: 'Argon', icon: '👨‍🏭', desc: 'Registro de recargas del tubo de Argón.' }
    ],
    presupuestos: [
      { id: 'presupuestos_gestion', titulo: 'Gestión de Presupuestos', icon: '📝', desc: 'Crear, editar, aprobar o rechazar presupuestos.' },
      { id: 'presupuestos_dashboard', titulo: 'Dashboard Presupuestos', icon: '📊', desc: 'Métricas de presupuestos.' }
    ],
    pagos: [
      { id: 'pagos_recibos', titulo: 'Recibos', icon: '💲', desc: 'Cobro a clientes.' },
      { id: 'pagos_comisiones', titulo: 'Comisiones', icon: '🤝', desc: 'Pago a mecánicos.' },
      { id: 'pagos_reportes', titulo: 'Deudores', icon: '📉', desc: 'Listado de deudores.' }
    ],
    trabajos: [
      { id: 'trabajos_gestion', titulo: 'Gestión de Trabajos', icon: '🔧', desc: 'Órdenes de trabajos, estados y fechas.' },
      { id: 'trabajos_dashboard', titulo: 'Dashboard Trabajos', icon: '🚥', desc: 'Monitoreo de trabajos iniciados y finalizados.' }
    ],
    caja: [
      { id: 'caja_gestion', titulo: 'Gestión de Caja', icon: '💸', desc: 'Ingresos y Salidas de dinero.' },
      { id: 'caja_dashboard_gastos', titulo: 'Dashboard Gastos', icon: '📈', desc: 'Monitoreo de salidas de dinero.' }
    ]
  };

  // Identificamos la sección activa
  const seccionActiva = historial.length > 0 ? historial[historial.length - 1] : null;

  // Funciones de navegación
  const irASeccion = (idSeccion) => setHistorial([...historial, idSeccion]);
  const volverAtras = () => {
    const nuevoHistorial = [...historial];
    nuevoHistorial.pop();
    setHistorial(nuevoHistorial);
  };
  const irAlInicio = () => setHistorial([]);

  // =========================================================
  // 3. BÚSQUEDA DE TÍTULO PARA EL HEADER
  // =========================================================
  let tarjetaActual = menuPrincipal.find(t => t.id === seccionActiva);
  if (!tarjetaActual) {
    for (const key in subMenus) {
      const encontrada = subMenus[key].find(t => t.id === seccionActiva);
      if (encontrada) {
        tarjetaActual = encontrada;
        break;
      }
    }
  }

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="app-header">
        <div className="header-logo" onClick={irAlInicio} title="Ir al Inicio" style={{ cursor: 'pointer' }}>
          <img src={logoRubal} alt="Rubal Rectificaciones" className="logo-img" />
          <h1 className="header-titulo">Sistema Rubal Rectificaciones</h1>
        </div>

        <div className="nav-actions">
          {/* Botones de navegación interna */}
          {historial.length > 0 && (
            <>
              {historial.length > 1 && (
                <button className="btn-nav btn-inicio" onClick={irAlInicio}>🏠 Inicio</button>
              )}
              <button className="btn-nav btn-volver" onClick={volverAtras}>← Volver</button>
            </>
          )}

          {/* BOTÓN DE CERRAR SESIÓN */}
          <button
            onClick={() => handleLoginStatus(false)}
            style={{ marginLeft: '20px', background: '#334155', color: 'white', border: '1px solid #475569', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="app-main">

        {/* NIVEL 0: MENÚ PRINCIPAL */}
        {seccionActiva === null && (
          <div className="menu-grid">
            {menuPrincipal.map((tarjeta) => (
              <div key={tarjeta.id} className="menu-card" onClick={() => irASeccion(tarjeta.id)}>
                <div className="card-icon">{tarjeta.icon}</div>
                <h3>{tarjeta.titulo}</h3>
                <p>{tarjeta.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* NIVEL 1: SUBMENÚS DINÁMICOS */}
        {subMenus[seccionActiva] && (
          <div className="seccion-contenedor">
            <h2>Módulo: {tarjetaActual?.titulo}</h2>
            <div className="menu-grid" style={{ marginTop: '25px' }}>
              {subMenus[seccionActiva].map((subTarjeta) => (
                <div key={subTarjeta.id} className="menu-card" onClick={() => irASeccion(subTarjeta.id)}>
                  <div className="card-icon">{subTarjeta.icon}</div>
                  <h3>{subTarjeta.titulo}</h3>
                  <p>{subTarjeta.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NIVEL 2: COMPONENTES FINALES */}
        {seccionActiva !== null && !subMenus[seccionActiva] && (
          <div className="seccion-contenedor">

            {/* Título dinámico con icono forzado si es Marcas */}
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {tarjetaActual?.icon && <span>{tarjetaActual.icon}</span>}
              {tarjetaActual?.titulo || 'Sección Interna'}
            </h2>

            {seccionActiva === 'configuracion_clientes' ? (
              <Clientes />
            ) : seccionActiva === 'configuracion_marcas' ? (
              <Marcas />
            ) : seccionActiva === 'configuracion_categorias' ? (
              <Categorias />
            ) : seccionActiva === 'configuracion_aumentos' ? (
              <Aumentos />
            ) : seccionActiva === 'configuracion_proveedores' ? (
              <Proveedores />
            ) : seccionActiva === 'configuracion_mo' ? (
              <Mano_de_Obra />
            ) : seccionActiva === 'stock_productos' ? (
              <Productos />
            ) : seccionActiva === 'stock_almacenes' ? (
              <Almacenes />
            ) : seccionActiva === 'stock_movimientos' ? (
              <Movimientos />
            ) : seccionActiva === 'stock_argon' ? (
              <Argon />
            ) : seccionActiva === 'trabajos_gestion' ? (
              <Trabajos />
            ) : seccionActiva === 'presupuestos_gestion' ? (
              <Presupuestos />
            ) : seccionActiva === 'presupuestos_dashboard' ? (
              <Dashboard_Presupuestos />
            ) : seccionActiva === 'trabajos_dashboard' ? (
              <Dashboard_EstadoTaller />
            ) : seccionActiva === 'pagos_recibos' ? (
              <Recibos />
            ) : seccionActiva === 'pagos_comisiones' ? (
              <Comisiones />
            ) : seccionActiva === 'pagos_reportes' ? (
              <Reporte_Saldos />
            ) : seccionActiva === 'caja_gestion' ? (
              <Caja />
            ) : seccionActiva === 'caja_dashboard_gastos' ? (
              <Dashboard_Gastos />
            ) : (
              <div className="en-construccion">
                <span className="constructor-icon">🛠️</span>
                <p>Esta sección se encuentra en construcción.</p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

export default App;