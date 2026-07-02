import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Caja() {
    const [ingresos, setIngresos] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [vista, setVista] = useState('listado'); // 'listado', 'crearIngreso', 'crearGasto'
    const [pestañaActiva, setPestañaActiva] = useState('ingresos'); // 'ingresos' o 'gastos'
    const [cargando, setCargando] = useState(true);

    // Estados para el Buscador Predictivo de Proveedores
    const [proveedores, setProveedores] = useState([]);
    const [busquedaProveedor, setBusquedaProveedor] = useState('');
    const [mostrarSugerenciasProveedor, setMostrarSugerenciasProveedor] = useState(false);

    const estadoInicialIngreso = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        id_cliente: "",
        detalle: "",
        categoria: "",
        importe: "",
        moneda: 'PESO',
        cuenta_destino: 'EFECTIVO',
        recibo: "",
        presupuesto: "",
        aclaracion: ""
    };

    const estadoInicialGasto = {
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        detalle: '',
        importe: '',
        id_proveedor: '', // <--- CAMBIADO destino por id_proveedor
        categoria: '',
        moneda: 'PESO',
        medio_pago: 'EFECTIVO',
        tipo: 'VARIABLE'
    };

    const [formIngreso, setFormIngreso] = useState(estadoInicialIngreso);
    const [formGasto, setFormGasto] = useState(estadoInicialGasto);

    // Obtiene el año actual automáticamente
    const [añoFiltro, setAñoFiltro] = useState(new Date().getFullYear().toString());
    const añosDisponibles = [...new Set([
        ...ingresos.map(i => new Date(i.fecha).getFullYear().toString()),
        ...gastos.map(g => new Date(g.fecha).getFullYear().toString()),
        new Date().getFullYear().toString()
    ])].sort().reverse();

    const [mesFiltro, setMesFiltro] = useState('TODOS');
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const [listaClientes, setListaClientes] = useState([]);

    const cargarClientes = async () => {
        const { data } = await supabase.from('bd_clientes').select('id, nombre, apellido').order('nombre');
        setListaClientes(data || []);
    };

    // NUEVA FUNCIÓN: Carga el catálogo relacional de proveedores
    const fetchProveedores = async () => {
        const { data, error } = await supabase
            .from('bd_proveedores')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) console.error("Error al traer proveedores:", error);
        else setProveedores(data || []);
    };

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#1e293b' },
        th: { padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' },
        td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.95rem' },
        btnIn: { background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
        btnOut: { background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
        tabActiva: { padding: '10px 20px', background: '#e0f2fe', color: '#0369a1', borderBottom: '3px solid #0284c7', fontWeight: 'bold', cursor: 'pointer' },
        tabInactiva: { padding: '10px 20px', background: 'transparent', color: '#64748b', borderBottom: '3px solid transparent', cursor: 'pointer' },
        resumenBox: { padding: '20px', borderRadius: '12px', color: '#fff', textAlign: 'center', flex: 1, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
    };

    const formatDinero = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Number(valor || 0));
    };

    useEffect(() => {
        cargarDatos();
        cargarClientes();
        fetchProveedores(); // <--- Carga inicial
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        const [resIngresos, resGastos] = await Promise.all([
            supabase.from('bd_caja_ingresos').select('*').order('fecha', { ascending: false }),
            supabase.from('bd_caja_gastos').select('*').order('fecha', { ascending: false })
        ]);
        setIngresos(resIngresos.data || []);
        setGastos(resGastos.data || []);
        setCargando(false);
    };

    // COMPONENTE AUXILIAR INTERNO: Renderizador del Buscador de Proveedores
    const RenderBuscadorProveedor = (idActual, setIdFn) => (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                style={s.input}
                placeholder="🔎 Escriba parte del nombre del proveedor..."
                value={busquedaProveedor}
                onChange={e => {
                    const valor = e.target.value;
                    setBusquedaProveedor(valor);

                    if (valor.length > 0) {
                        setMostrarSugerenciasProveedor(true);
                        setIdFn(''); // Limpia el ID para obligar a seleccionar una opción real
                    } else {
                        setMostrarSugerenciasProveedor(false);
                    }
                }}
                onFocus={() => {
                    if (busquedaProveedor.length > 0) setMostrarSugerenciasProveedor(true);
                }}
            />
            {mostrarSugerenciasProveedor && (
                <ul style={{
                    position: 'absolute', background: '#fff', border: '1px solid #cbd5e1',
                    width: '100%', zIndex: 100, maxHeight: '180px', overflowY: 'auto',
                    listStyle: 'none', padding: 0, marginTop: '4px', borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    {proveedores
                        .filter(p => (p.nombre || '').toLowerCase().includes(busquedaProveedor.toLowerCase()))
                        .map(p => (
                            <li
                                key={p.id}
                                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', textAlign: 'left' }}
                                onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.target.style.background = '#fff'}
                                onClick={() => {
                                    setIdFn(p.id);
                                    setBusquedaProveedor(p.nombre);
                                    setMostrarSugerenciasProveedor(false);
                                }}
                            >
                                <b>{p.nombre}</b> <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>#{p.id}</span>
                            </li>
                        ))}
                    {proveedores.filter(p => (p.nombre || '').toLowerCase().includes(busquedaProveedor.toLowerCase())).length === 0 && (
                        <li style={{ padding: '10px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                            No se encontró el proveedor... Podés crearlo en Configuración.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );

    const handleGuardarIngreso = async () => {
        if (!formIngreso.fecha || !formIngreso.importe) return alert("⚠️ Fecha e Importe son obligatorios.");

        const dataToSave = {
            ...formIngreso,
            importe: Number(formIngreso.importe),
            id_cliente: formIngreso.id_cliente ? Number(formIngreso.id_cliente) : null
        };

        delete dataToSave.id;

        try {
            if (formIngreso.id) {
                const { error } = await supabase
                    .from('bd_caja_ingresos')
                    .update(dataToSave)
                    .eq('id', formIngreso.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('bd_caja_ingresos')
                    .insert([dataToSave]);

                if (error) throw error;
            }

            setVista('listado');
            cargarDatos();
        } catch (err) {
            console.error("Error detallado:", err);
            alert("Error al guardar: " + err.message);
        }
    };

    const handleGuardarGasto = async () => {
        if (!formGasto.fecha || !formGasto.importe) return alert("⚠️ Fecha e Importe son obligatorios.");

        // 1. Limpiamos y preparamos el objeto para Supabase
        const dataToSave = {
            fecha: formGasto.fecha,
            detalle: formGasto.detalle,
            importe: Number(formGasto.importe),
            id_proveedor: formGasto.id_proveedor ? Number(formGasto.id_proveedor) : null, // <--- ID del Proveedor Relacional
            categoria: formGasto.categoria,
            moneda: formGasto.moneda,
            medio_pago: formGasto.medio_pago,
            tipo: formGasto.tipo
        };

        try {
            if (formGasto.id) {
                const { error } = await supabase
                    .from('bd_caja_gastos')
                    .update(dataToSave)
                    .eq('id', formGasto.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('bd_caja_gastos')
                    .insert([dataToSave]);

                if (error) throw error;
            }

            setVista('listado');
            cargarDatos();
        } catch (err) {
            console.error("Error al guardar gasto:", err);
            alert("Error al guardar el gasto: " + err.message);
        }
    };

    const filtrarDatos = (lista) => {
        return lista.filter(item => {
            const fecha = new Date(item.fecha);
            const añoCoincide = (añoFiltro === 'TODOS' || fecha.getFullYear().toString() === añoFiltro);
            const mesCoincide = (mesFiltro === 'TODOS' || (fecha.getMonth() + 1).toString() === mesFiltro);
            return añoCoincide && mesCoincide;
        });
    };

    const ingresosFiltrados = filtrarDatos(ingresos);
    const gastosFiltrados = filtrarDatos(gastos);

    const totalIngresos = Math.round(ingresosFiltrados.filter(i => i.moneda === 'PESO').reduce((sum, i) => sum + Number(i.importe), 0));
    const totalGastos = Math.round(gastosFiltrados.filter(g => g.moneda === 'PESO').reduce((sum, g) => sum + Number(g.importe), 0));
    const balanceNeto = totalIngresos - totalGastos;

    // Función auxiliar para obtener el nombre del proveedor en el listado
    const getNombreProveedor = (idProveedor) => {
        const prov = proveedores.find(p => p.id === idProveedor);
        return prov ? prov.nombre : '-';
    };

    return (
        <div style={{ padding: '20px', width: '96%', maxWidth: '1600px', margin: '0 auto', boxSizing: 'border-box' }}>

            {/* PANEL DE KPIs FINANCIEROS */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', width: '100%' }}>
                <div style={{ ...s.resumenBox, background: '#10b981' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.9 }}>Ingresos Totales (ARS)</h3>
                    <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 'bold' }}>$ {formatDinero(totalIngresos)}</p>
                </div>
                <div style={{ ...s.resumenBox, background: '#ef4444' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.9 }}>Gastos Totales (ARS)</h3>
                    <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 'bold' }}>$ {formatDinero(totalGastos)}</p>
                </div>
                <div style={{ ...s.resumenBox, background: balanceNeto >= 0 ? '#0284c7' : '#b91c1c' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.9 }}>Balance Neto</h3>
                    <p style={{ margin: 0, fontSize: '1.7rem', fontWeight: 'bold' }}>$ {formatDinero(balanceNeto)}</p>
                </div>
            </div>

            {/* SELECCIÓN DE AÑO */}
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => setAñoFiltro('TODOS')}
                    style={{
                        padding: '5px 15px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        background: añoFiltro === 'TODOS' ? '#0284c7' : '#e2e8f0',
                        color: añoFiltro === 'TODOS' ? 'white' : '#64748b'
                    }}>TODOS</button>

                {añosDisponibles.map(anio => (
                    <button
                        key={anio}
                        onClick={() => setAñoFiltro(anio)}
                        style={{
                            padding: '5px 15px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                            background: añoFiltro === anio ? '#0284c7' : '#e2e8f0',
                            color: añoFiltro === anio ? 'white' : '#64748b'
                        }}>
                        {anio}
                    </button>
                ))}
            </div>

            {/* SELECCIÓN DE MES */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button onClick={() => setMesFiltro('TODOS')}
                    style={{
                        padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        background: mesFiltro === 'TODOS' ? '#0369a1' : '#e2e8f0'
                    }}>TODOS</button>

                {nombresMeses.map((mes, index) => (
                    <button key={mes} onClick={() => setMesFiltro((index + 1).toString())}
                        style={{
                            padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                            background: mesFiltro === (index + 1).toString() ? '#0369a1' : '#e2e8f0',
                            color: mesFiltro === (index + 1).toString() ? 'white' : '#64748b'
                        }}>
                        {mes}
                    </button>
                ))}
            </div>

            <div style={s.card}>
                {vista === 'listado' ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={pestañaActiva === 'ingresos' ? s.tabActiva : s.tabInactiva} onClick={() => setPestañaActiva('ingresos')}>
                                    💰 Tabla de Ingresos
                                </div>
                                <div style={pestañaActiva === 'gastos' ? s.tabActiva : s.tabInactiva} onClick={() => setPestañaActiva('gastos')}>
                                    📉 Tabla de Gastos
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={s.btnIn} onClick={() => { setFormIngreso(estadoInicialIngreso); setVista('crearIngreso'); }}>+ Nuevo Ingreso</button>
                                <button style={s.btnOut} onClick={() => { setFormGasto(estadoInicialGasto); setBusquedaProveedor(''); setVista('crearGasto'); }}>- Nuevo Gasto</button>
                            </div>
                        </div>

                        {cargando ? (
                            <p>Cargando movimientos de caja...</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>

                                {/* TABLA DE INGRESOS */}
                                {pestañaActiva === 'ingresos' && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                                <th style={s.th}>Fecha</th><th style={s.th}>Cliente / Detalle</th><th style={s.th}>Categoría</th>
                                                <th style={s.th}>Cuenta</th><th style={s.th}>Comprobantes</th><th style={{ ...s.th, textAlign: 'right' }}>Importe</th>
                                                <th style={{ ...s.th, textAlign: 'center' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtrarDatos(ingresos).map(i => (
                                                <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={s.td}>{new Date(i.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                                    <td style={s.td}><b>{i.cliente || '-'}</b> <br /><small style={{ color: '#64748b' }}>{i.detalle}</small></td>
                                                    <td style={s.td}>{i.categoria}</td>
                                                    <td style={s.td}>{i.cuenta_destino}</td>
                                                    <td style={s.td}><small>Rec: {i.recibo || '-'} / Pres: {i.presupuesto || '-'}</small></td>
                                                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>
                                                        {i.moneda === 'DOLAR' ? 'U$S' : '$'} {formatDinero(i.importe)}
                                                    </td>
                                                    <td style={{ ...s.td, textAlign: 'center' }}>
                                                        <span style={{ cursor: 'pointer', marginRight: '15px' }} onClick={() => { setFormIngreso(i); setVista('crearIngreso'); }}>✏️</span>
                                                        <span style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => { if (window.confirm('¿Eliminar ingreso?')) supabase.from('bd_caja_ingresos').delete().eq('id', i.id).then(cargarDatos); }}>🗑️</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {/* TABLA DE GASTOS */}
                                {pestañaActiva === 'gastos' && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                                <th style={s.th}>Fecha</th><th style={s.th}>Detalle del Gasto</th><th style={s.th}>Categoría  Tipo</th>
                                                <th style={s.th}>Proveedor  Forma Pago</th><th style={{ ...s.th, textAlign: 'right' }}>Importe</th>
                                                <th style={{ ...s.th, textAlign: 'center' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtrarDatos(gastos).map(g => (
                                                <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={s.td}>{new Date(g.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                                    <td style={s.td}><b>{g.detalle}</b></td>
                                                    <td style={s.td}>
                                                        {g.categoria} <br />
                                                        <small style={{
                                                            color: g.tipo === 'FIJO' ? '#dc2626' : '#2c3d35',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {g.tipo}
                                                        </small>
                                                    </td>

                                                    <td style={s.td}>
                                                        {/* Acá va el nombre del destino o proveedor, dejalo como lo tenías */}
                                                        {g.destino || getNombreProveedor(g.id_proveedor)} <br />

                                                        <small style={{
                                                            color: g.medio_pago === 'EFECTIVO' ? '#16a34a' :  /* Verde si es Efectivo */
                                                                g.medio_pago === 'CUENTA' ? '#2563eb' :  /* Azul si es Cuenta */
                                                                    '#d97706',                                 /* Naranja si es Otro */
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {g.medio_pago}
                                                        </small>
                                                    </td>
                                                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                                                        {g.moneda === 'DOLAR' ? 'U$S' : '$'} {formatDinero(g.importe)}
                                                    </td>
                                                    <td style={{ ...s.td, textAlign: 'center' }}>
                                                        <span style={{ cursor: 'pointer', marginRight: '15px' }} onClick={() => {
                                                            setFormGasto(g);

                                                            const p = proveedores.find(prov => prov.id === g.id_proveedor);
                                                            setBusquedaProveedor(p ? p.nombre : '');
                                                            setVista('crearGasto');
                                                        }}>✏️</span>
                                                        <span style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => { if (window.confirm('¿Eliminar gasto?')) supabase.from('bd_caja_gastos').delete().eq('id', g.id).then(cargarDatos); }}>🗑️</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </>
                ) : vista === 'crearIngreso' ? (

                    // FORMULARIO DE INGRESOS
                    <div>
                        <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>{formIngreso.id ? '✏️ Editar Ingreso' : '💰 Registrar Nuevo Ingreso'}</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px', marginTop: '20px' }}>
                            <div><label style={s.label}>Fecha *</label><input type="date" style={s.input} value={formIngreso.fecha} onChange={e => setFormIngreso({ ...formIngreso, fecha: e.target.value })} /></div>
                            <div><label style={s.label}>Importe *</label><input type="number" style={s.input} value={formIngreso.importe} onChange={e => setFormIngreso({ ...formIngreso, importe: e.target.value })} /></div>
                            <div><label style={s.label}>Moneda</label><select style={s.input} value={formIngreso.moneda} onChange={e => setFormIngreso({ ...formIngreso, moneda: e.target.value })}><option>PESO</option><option>DOLAR</option></select></div>

                            <div>
                                <label style={s.label}>Cliente *</label>
                                <select
                                    style={s.input}
                                    value={formIngreso.id_cliente || ''}
                                    onChange={e => {
                                        const clienteSeleccionado = listaClientes.find(c => c.id == e.target.value);
                                        setFormIngreso({
                                            ...formIngreso,
                                            id_cliente: e.target.value,
                                            cliente: clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : ""
                                        });
                                    }}
                                >
                                    <option value="">Seleccione un cliente...</option>
                                    {listaClientes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre} {c.apellido}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}><label style={s.label}>Detalle</label><input type="text" style={s.input} value={formIngreso.detalle || ''} onChange={e => setFormIngreso({ ...formIngreso, detalle: e.target.value })} /></div>

                            <div>
                                <label style={s.label}>Categoría</label>
                                <select style={s.input} value={formIngreso.categoria || ""} onChange={e => setFormIngreso({ ...formIngreso, categoria: e.target.value })}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Motor">Motor</option>
                                    <option value="Tapa">Tapa</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label style={s.label}>Cuenta Destino *</label>
                                <select
                                    style={s.input}
                                    value={formIngreso.cuenta_destino}
                                    onChange={e => setFormIngreso({ ...formIngreso, cuenta_destino: e.target.value })}
                                >
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="CUENTA">Cuenta</option>
                                    <option value="A OTROS">A otros</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="CARRI">Carri</option>
                                </select>
                            </div>
                            <div><label style={s.label}>N° Recibo (Opcional)</label><input type="text" style={s.input} value={formIngreso.recibo || ''} onChange={e => setFormIngreso({ ...formIngreso, recibo: e.target.value })} /></div>

                            <div><label style={s.label}>N° Presupuesto (Opcional)</label><input type="text" style={s.input} value={formIngreso.presupuesto || ''} onChange={e => setFormIngreso({ ...formIngreso, presupuesto: e.target.value })} /></div>
                            <div style={{ gridColumn: 'span 2' }}><label style={s.label}>Aclaración</label><input type="text" style={s.input} value={formIngreso.aclaracion || ''} onChange={e => setFormIngreso({ ...formIngreso, aclaracion: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button style={{ ...s.btnIn, flex: 2, padding: '15px' }} onClick={handleGuardarIngreso}>💾 Guardar Ingreso</button>
                            <button style={{ ...s.btnSec, flex: 1, padding: '15px' }} onClick={() => setVista('listado')}>Cancelar</button>
                        </div>
                    </div>
                ) : (

                    // FORMULARIO DE GASTOS
                    <div>
                        <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>{formGasto.id ? '✏️ Editar Gasto' : '📉 Registrar Nuevo Gasto'}</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px', marginTop: '20px' }}>
                            <div><label style={s.label}>Fecha *</label><input type="date" style={s.input} value={formGasto.fecha} onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })} /></div>
                            <div><label style={s.label}>Importe *</label><input type="number" style={s.input} value={formGasto.importe} onChange={e => setFormGasto({ ...formGasto, importe: e.target.value })} /></div>
                            <div><label style={s.label}>Moneda</label><select style={s.input} value={formGasto.moneda} onChange={e => setFormGasto({ ...formGasto, moneda: e.target.value })}><option>PESO</option><option>DOLAR</option></select></div>

                            <div style={{ gridColumn: 'span 2' }}><label style={s.label}>Detalle del gasto</label><input type="text" style={s.input} value={formGasto.detalle || ''} onChange={e => setFormGasto({ ...formGasto, detalle: e.target.value })} placeholder="Ej: Juego de aros..." /></div>

                            {/* 🌟 REEMPLAZO COMPLETO POR EL NUEVO BUSCADOR PREDICTIVO RELACIONAL */}
                            <div>
                                <label style={s.label}>Proveedor / Destino *</label>
                                {RenderBuscadorProveedor(formGasto.id_proveedor, (id) => setFormGasto({ ...formGasto, id_proveedor: id }))}
                            </div>

                            <div>
                                <label style={s.label}>Categoría</label>
                                <select
                                    style={s.input}
                                    value={formGasto.categoria || ""}
                                    onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Servicios">Servicios</option>
                                    <option value="Repuestos">Repuestos</option>
                                    <option value="Fletes">Fletes</option>
                                    <option value="Insumos">Insumos</option>
                                    <option value="Alquiler">Alquiler</option>
                                    <option value="Sueldos">Sueldos</option>
                                    <option value="Herramientas">Herramientas</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>
                            <div>
                                <label style={s.label}>Medio de Pago</label>
                                <select
                                    style={s.input}
                                    value={formGasto.medio_pago || ''}
                                    onChange={e => setFormGasto({ ...formGasto, medio_pago: e.target.value })}
                                >
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="CUENTA">Cuenta</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label style={s.label}>Tipo de Gasto</label>
                                <select style={s.input} value={formGasto.tipo} onChange={e => setFormGasto({ ...formGasto, tipo: e.target.value })}>
                                    <option>VARIABLE</option>
                                    <option>FIJO</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button style={{ ...s.btnOut, flex: 2, padding: '15px' }} onClick={handleGuardarGasto}>💾 Guardar Gasto</button>
                            <button style={{ ...s.btnSec, flex: 1, padding: '15px' }} onClick={() => setVista('listado')}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Caja;