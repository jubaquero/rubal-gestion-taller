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
import Nomenclador from './components/Nomenclador';
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
  {/* 
  // =========================================================
  // 1. MENÚ PRINCIPAL (NIVEL 0) - PRUEBA MIXTA
  // =========================================================
  const menuPrincipal = [
    { 
      id: 'configuracion', 
      titulo: 'Configuración', 
      // 👇 ACÁ ESTÁ EL SVG DE PRUEBA SOLO PARA ESTE ÍCONO 👇
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#475569" style={{width: '45px', height: '45px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688 0-1.372-.08-2.032-.238M15.54 8.428l.34-.343a4.5 4.5 0 016.364 0l.167.167a4.5 4.5 0 010 6.364l-.343.34M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, 
      desc: 'Ajustes del sistema (Clientes, Aumentos, Marcas, Categorías).' 
    },
    { id: 'stock', titulo: 'Stock', icon: '📦', desc: 'Administración de repuestos e insumos.' },
    { id: 'presupuestos', titulo: 'Presupuestos', icon: '📋', desc: 'Crear, editar y enviar presupuestos.' },
    { id: 'trabajos', titulo: 'Trabajos', icon: '🛠️', desc: 'Control de motores, estados y fecha fin.' },
    { id: 'pagos', titulo: 'Pagos', icon: '💳', desc: 'Registro de cobros, señas y saldos.' },
    { id: 'caja', titulo: 'Caja', icon: '💵', desc: 'Registro de ingreso y salida de dinero.' }
  ];
*/}
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
      { id: 'configuracion_nomenclador', titulo: 'Nomenclador', icon: '🗃️', desc: 'Listado y alta de motores, tapas y categorías.' },
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
            ) : seccionActiva === 'configuracion_nomenclador' ? (
              <Nomenclador />
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