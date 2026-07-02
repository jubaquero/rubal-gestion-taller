import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Reporte_Saldos() {
    const [datosReporte, setDatosReporte] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [presupuestosHistorial, setPresupuestosHistorial] = useState([]);
    const [recibosHistorial, setRecibosHistorial] = useState([]);
    const [comisionesHistorial, setComisionesHistorial] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);
    const granTotalComisiones = datosReporte.reduce((sum, c) => sum + Number(c.totalComisiones || 0), 0);

    // NUEVOS ESTADOS PARA EL VISOR DE DOCUMENTOS
    const [visorDoc, setVisorDoc] = useState(null);
    const [cargandoDoc, setCargandoDoc] = useState(false);

    // MARGEN DE TOLERANCIA
    const MARGEN_TOLERANCIA = 10000;

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        th: { padding: '12px', textAlign: 'right', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' },
        td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.90rem' },
        btnPr: { background: '#316ea7', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' },
        resumenBox: {
            padding: '20px',
            borderRadius: '12px',
            color: '#fff',
            textAlign: 'center',
            flex: 1,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        },
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modal: { background: '#fff', padding: '30px', borderRadius: '16px', width: '95%', maxWidth: '850px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }
    };

    const formatDinero = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(valor || 0));
    };

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        setCargando(true);
        const [clis, presus, recs, coms] = await Promise.all([
            supabase.from('bd_clientes').select('*').order('nombre'),
            supabase.from('bd_presupuestos').select('*').eq('estado', 'APROBADO'),
            supabase.from('bd_recibos').select('*'),
            supabase.from('bd_comisiones').select('*')
        ]);

        const listaClientes = clis.data || [];
        const listaPresupuestos = presus.data || [];
        const listaRecibos = recs.data || [];
        const listaComisiones = coms.data || [];

        setClientes(listaClientes);
        setPresupuestosHistorial(listaPresupuestos);
        setRecibosHistorial(listaRecibos);
        setComisionesHistorial(listaComisiones);

        let reporteClientes = listaClientes.map(c => {
            const presusDelCliente = listaPresupuestos.filter(p => p.id_cliente === c.id);
            const recsDelCliente = listaRecibos.filter(r => r.id_cliente === c.id);
            const comsDelCliente = listaComisiones.filter(co => co.id_cliente === c.id);

            const totalPresupuestos = presusDelCliente.reduce((sum, p) => sum + Number(p.total_presupuesto_con_iva || 0), 0);
            const totalPagado = recsDelCliente.reduce((sum, r) => sum + Number(r.importe || 0), 0);
            const totalDescuentos = recsDelCliente.reduce((sum, r) => sum + Number(r.descuento || 0), 0);
            const totalComisiones = comsDelCliente.reduce((sum, co) => sum + Number(co.importe || 0), 0);

            const saldo = totalPresupuestos - totalPagado - totalDescuentos;

            return {
                ...c,
                totalPresupuestos,
                totalPagado,
                totalDescuentos,
                totalComisiones,
                saldo
            };
        });

        const clientesConActividadReal = reporteClientes.filter(c =>
            c.totalPresupuestos > 0 || c.totalPagado > 0 || c.totalComisiones > 0
        );

        clientesConActividadReal.sort((a, b) => b.saldo - a.saldo);

        setDatosReporte(clientesConActividadReal);
        setCargando(false);
    };

    const handleCompensarCliente = async (cliente) => {
        if (window.confirm(`⚖️ ¿Desea crear un ajuste global por $${formatDinero(cliente.saldo)} para dejar la cuenta corriente de ${cliente.nombre} ${cliente.apellido} en $0,00 exactos?`)) {
            const reciboAjuste = {
                id_presupuesto: null,
                id_cliente: cliente.id,
                fecha_recibo: new Date().toISOString().split('T')[0],
                importe: 0,
                forma_pago: 'Ajuste',
                descuento: cliente.saldo,
                nota: 'Compensación automática de saldo global de cuenta corriente.'
            };

            await supabase.from('bd_recibos').insert([reciboAjuste]);
            cargarDatos();
        }
    };

    const abrirHistorialCliente = (cliente) => {
        setItemSeleccionado(cliente);
        setModalAbierto(true);
    };

    // 🌟 NUEVA FUNCIÓN PARA ABRIR Y CARGAR EL DOCUMENTO AL HACER CLIC
    const handleVerDocumento = async (item) => {
        setCargandoDoc(true);
        let detalles = { ...item };

        // Si es un presupuesto, necesitamos ir a la base de datos a buscar sus items (repuestos y mano de obra)
        if (item.tipoDoc === 'presupuesto') {
            const [mo, prod] = await Promise.all([
                supabase.from('bd_presupuestos_mo').select('*, bd_mo(*)').eq('id_presupuesto', item.docOriginal.id).order('linea'),
                supabase.from('bd_presupuestos_p').select('*').eq('id_presupuesto', item.docOriginal.id).order('linea')
            ]);
            detalles.itemsMO = mo.data || [];
            detalles.itemsProd = prod.data || [];
        }

        setVisorDoc(detalles);
        setCargandoDoc(false);
    };

    const construirLineaTiempo = (idCliente) => {
        const presus = presupuestosHistorial.filter(p => p.id_cliente === idCliente).map(p => ({
            fecha: p.fecha_presupuesto || p.created_at,
            tipo: '📄 Presupuesto Aprobado',
            detalle: `N° ${p.id}`,
            mas: '',
            importe_doc: Number(p.total_presupuesto_con_iva || 0),
            afecta_saldo: true,
            color: '#1e293b',
            tipoDoc: 'presupuesto', // Identificador para el visor
            docOriginal: p          // Guardamos los datos puros
        }));

        const recs = recibosHistorial.filter(r => r.id_cliente === idCliente).map(r => {
            const totalRecibo = Number(r.importe || 0) + Number(r.descuento || 0);
            return {
                fecha: r.fecha_recibo,
                tipo: '💲Recibo de Pago',
                detalle: `N° ${r.id} (${r.forma_pago})`,
                mas: Number(r.descuento) > 0 ? `Incluye descuento aplicado` : '',
                importe_doc: -totalRecibo,
                afecta_saldo: true,
                color: '#16a34a',
                tipoDoc: 'recibo',
                docOriginal: r
            };
        });

        const coms = comisionesHistorial.filter(c => c.id_cliente === idCliente).map(c => ({
            fecha: c.fecha,
            tipo: '💸 Comisión Entregada',
            detalle: `N° ${c.id} - Presu #${c.id_presupuesto || 'S/N'}`,
            mas: `Info interna`,
            importe_doc: Number(c.importe || 0),
            afecta_saldo: false,
            color: '#059669',
            esComision: true,
            tipoDoc: 'comision',
            docOriginal: c
        }));

        let lineaTiempo = [...presus, ...recs, ...coms].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        let saldoActual = 0;
        lineaTiempo = lineaTiempo.map(item => {
            if (item.afecta_saldo) {
                saldoActual += item.importe_doc;
            }
            return {
                ...item,
                saldo_acumulado: saldoActual
            };
        });

        return lineaTiempo;
    };

    const datosFiltrados = datosReporte.filter(c =>
        `${c.nombre} ${c.apellido}`.toLowerCase().includes(busqueda.toLowerCase())
    );

    const granTotalDeuda = datosReporte.reduce((sum, c) => sum + (c.saldo > MARGEN_TOLERANCIA ? c.saldo : 0), 0);
    const granTotalCobrado = datosReporte.reduce((sum, c) => sum + c.totalPagado, 0);

    return (
        <div style={{
            padding: '5px',
            width: '100%',
            maxWidth: '1600px',
            margin: '0 auto',
            boxSizing: 'border-box'
        }}>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', width: '100%' }}>
                <div style={{ ...s.resumenBox, background: '#ef4444' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>Deuda en la Calle</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>$ {formatDinero(granTotalDeuda)}</p>
                </div>
                <div style={{ ...s.resumenBox, background: '#10b981' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>Total Cobrado (Histórico)</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>$ {formatDinero(granTotalCobrado)}</p>
                </div>
                <div style={{ ...s.resumenBox, background: '#0284c7' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>Total Comisiones Entregadas</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>$ {formatDinero(granTotalComisiones)}</p>
                </div>
            </div>

            <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>📊 Reporte de Saldos por Cliente</h2>
                    <input
                        placeholder="🔍 Buscar por nombre o apellido del cliente..."
                        style={{ ...s.input, width: '450px' }}
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                    />
                </div>

                {cargando ? (
                    <p>Consolidando cuentas corrientes y procesando balances generales...</p>
                ) : (
                    <div style={{ overflowX: 'auto', width: '110%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ ...s.th, textAlign: 'left' }}>Cliente</th>
                                    <th style={s.th}>Total Presupuestos</th>
                                    <th style={s.th}>Total Pagado</th>
                                    <th style={s.th}>Total Descuentos</th>
                                    <th style={{ ...s.th, color: '#059669' }}>Comisiones</th>
                                    <th style={{ ...s.th, color: '#000' }}>Estado de Cuenta</th>
                                    <th style={{ ...s.th, textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosFiltrados.map(c => {
                                    const tieneDeudaReal = c.saldo > MARGEN_TOLERANCIA;
                                    const tieneFavorReal = c.saldo < -1000; 
                                    const estaSaldado = !tieneDeudaReal && !tieneFavorReal; 

                                    let estadoTexto = `$ ${formatDinero(c.saldo)}`;
                                    let colorTexto = '#000';
                                    let colorFila = '#fff';

                                    if (tieneDeudaReal) {
                                        colorTexto = '#dc2626';
                                        colorFila = '#fef2f2';
                                    } else if (tieneFavorReal) {
                                        estadoTexto = `$ ${formatDinero(Math.abs(c.saldo))} (A Favor)`;
                                        colorTexto = '#2563eb';
                                        colorFila = '#eff6ff';
                                    } else if (estaSaldado) {
                                        colorTexto = '#10b981';
                                        colorFila = '#f0fdf4';
                                    }

                                    return (
                                        <tr key={c.id} style={{ backgroundColor: colorFila }}>
                                            <td style={{ ...s.td, textAlign: 'left', fontWeight: 'bold' }}>{c.nombre} {c.apellido}</td>
                                            <td style={s.td}>$ {formatDinero(c.totalPresupuestos)}</td>
                                            <td style={s.td}>$ {formatDinero(c.totalPagado)}</td>
                                            <td style={s.td}>$ {formatDinero(c.totalDescuentos)}</td>
                                            <td style={{ ...s.td, color: '#059669' }}>$ {formatDinero(c.totalComisiones)}</td>
                                            <td style={{ ...s.td, fontWeight: 'bold', color: colorTexto, fontSize: '0.80rem' }}>
                                                {estaSaldado ? '✅ Saldado' : estadoTexto}
                                            </td>
                                            <td style={{ ...s.td, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        style={s.btnSec}
                                                        onClick={() => abrirHistorialCliente(c)}
                                                        title="Ver ficha histórica y movimientos de cuenta corriente"
                                                    >
                                                        👁️
                                                    </button>
                                                    {tieneDeudaReal && (
                                                        <button
                                                            style={s.btnPr}
                                                            onClick={() => handleCompensarCliente(c)}
                                                            title="Compensar saldo: genera un ajuste automático para saldar la cuenta"
                                                        >
                                                            🤝
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL CRONOLÓGICO DE CUENTA CORRIENTE */}
            {modalAbierto && itemSeleccionado && (
                <div style={s.overlay}>
                    <div style={s.modal}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>📋 Ficha del Cliente</h3>
                            <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setModalAbierto(false)}>×</button>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #2563eb' }}>
                            <p style={{
                                margin: 0,
                                color: itemSeleccionado.saldo > MARGEN_TOLERANCIA ? '#b91c1c' : (itemSeleccionado.saldo < -1000 ? '#2563eb' : '#16a34a'),
                                fontWeight: 'bold'
                            }}>
                                Saldo Actual de la Cuenta: {
                                    itemSeleccionado.saldo > MARGEN_TOLERANCIA
                                        ? `$ ${formatDinero(itemSeleccionado.saldo)} (En Deuda)`
                                        : (itemSeleccionado.saldo < -1000
                                            ? `$ ${formatDinero(Math.abs(itemSeleccionado.saldo))} (A Favor)`
                                            : '✅ Cuenta Saldada')
                                }
                            </p>
                        </div>

                        <h4>🕒 Movimientos históricos</h4>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Fecha</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Comprobante</th>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Detalle</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>Importe del Doc.</th>
                                        <th style={{ padding: '10px', textAlign: 'right', borderLeft: '2px solid #e2e8f0' }}>Saldo Acumulado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {construirLineaTiempo(itemSeleccionado.id).map((item, index) => {
                                        let colorImporte = item.esComision ? '#1443aa' : (item.importe_doc > 0 ? '#b91c1c' : '#16a34a');
                                        let prefijoSigno = item.esComision ? '' : (item.importe_doc > 0 ? '+' : '-');
                                        let colorSaldo = item.saldo_acumulado > 0.05 ? '#b91c1c' : (item.saldo_acumulado < -0.05 ? '#2563eb' : '#16a34a');

                                        return (
                                            <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: item.esComision ? '#f0fdf4' : '#fff' }}>
                                                <td style={{ padding: '10px' }}>{new Date(item.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                                
                                                {/* 🌟 AQUÍ ESTÁ EL ENLACE CLICKABLE PARA ABRIR EL VISOR */}
                                                <td style={{ padding: '10px', fontWeight: 'bold', color: item.color }}>
                                                    <span 
                                                        style={{ cursor: 'pointer', textDecoration: 'underline', color: '#2563eb' }} 
                                                        onClick={() => handleVerDocumento(item)} 
                                                        title="Haga clic para ver el detalle de este documento"
                                                    >
                                                        {item.tipo}
                                                    </span>
                                                </td>
                                                
                                                <td style={{ padding: '10px' }}>
                                                    <span 
                                                        style={{ cursor: 'pointer', color: '#2563eb' }} 
                                                        onClick={() => handleVerDocumento(item)} 
                                                        title="Haga clic para ver el detalle de este documento"
                                                    >
                                                        {item.detalle}
                                                    </span> 
                                                    {item.mas && <small style={{ color: '#64748b', display: 'block' }}>{item.mas}</small>}
                                                </td>

                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: colorImporte }}>
                                                    {prefijoSigno} $ {formatDinero(Math.abs(item.importe_doc))}
                                                </td>

                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', borderLeft: '2px solid #e2e8f0', color: item.esComision ? '#94a3b8' : colorSaldo }}>
                                                    {item.esComision ? '-' : `$ ${formatDinero(Math.abs(item.saldo_acumulado))} ${item.saldo_acumulado < -0.05 ? '(A Favor)' : ''}`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {construirLineaTiempo(itemSeleccionado.id).length === 0 && (
                                        <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No se registran transacciones históricas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <button style={{ ...s.btnSec, width: '100%', padding: '12px' }} onClick={() => setModalAbierto(false)}>Cerrar Ficha</button>
                    </div>
                </div>
            )}

            {/* 🌟 NUEVO: SUB-MODAL VISOR DE DOCUMENTOS */}
            {visorDoc && (
                <div style={{ ...s.overlay, zIndex: 1100 }}>
                    <div style={{ ...s.modal, maxWidth: '600px', background: '#f8fafc' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>
                                {visorDoc.tipoDoc === 'presupuesto' ? `📄 Presupuesto N° ${visorDoc.docOriginal.id}` : 
                                 visorDoc.tipoDoc === 'recibo' ? `🧾 Recibo N° ${visorDoc.docOriginal.id}` : 
                                 `💸 Comisión N° ${visorDoc.docOriginal.id}`}
                            </h3>
                            <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setVisorDoc(null)}>×</button>
                        </div>

                        {cargandoDoc ? (
                            <p style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Cargando detalles del documento...</p>
                        ) : (
                            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: '0.95rem' }}>
                                
                                {/* VISTA DE RECIBO */}
                                {visorDoc.tipoDoc === 'recibo' && (
                                    <div>
                                        <p style={{ marginBottom: '8px' }}><strong>Fecha:</strong> {new Date(visorDoc.docOriginal.fecha_recibo).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</p>
                                        <p style={{ marginBottom: '8px' }}><strong>Importe:</strong> $ {formatDinero(visorDoc.docOriginal.importe)}</p>
                                        <p style={{ marginBottom: '8px' }}><strong>Forma de Pago:</strong> {visorDoc.docOriginal.forma_pago}</p>
                                        <p style={{ marginBottom: '8px' }}><strong>Descuento Aplicado:</strong> $ {formatDinero(visorDoc.docOriginal.descuento || 0)}</p>
                                        <p style={{ marginBottom: '8px' }}><strong>Presupuesto Asociado:</strong> {visorDoc.docOriginal.id_presupuesto ? `N° ${visorDoc.docOriginal.id_presupuesto}` : 'S/N'}</p>
                                        <hr style={{ borderColor: '#f1f5f9', margin: '15px 0' }}/>
                                        <p style={{ margin: 0 }}><strong>Notas:</strong> {visorDoc.docOriginal.nota || 'Sin observaciones.'}</p>
                                    </div>
                                )}

                                {/* VISTA DE COMISION */}
                                {visorDoc.tipoDoc === 'comision' && (
                                    <div>
                                        <p style={{ marginBottom: '8px' }}><strong>Fecha:</strong> {new Date(visorDoc.docOriginal.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</p>
                                        <p style={{ marginBottom: '8px' }}><strong>Importe Entregado:</strong> $ {formatDinero(visorDoc.docOriginal.importe)}</p>
                                        <p style={{ marginBottom: '8px' }}><strong>Medio de Pago:</strong> {visorDoc.docOriginal.forma_pago}</p>
                                        <p style={{ marginBottom: '8px' }}><strong>Presupuesto Asociado:</strong> {visorDoc.docOriginal.id_presupuesto ? `N° ${visorDoc.docOriginal.id_presupuesto}` : 'S/N'}</p>
                                        <hr style={{ borderColor: '#f1f5f9', margin: '15px 0' }}/>
                                        <p style={{ margin: 0 }}><strong>Notas:</strong> {visorDoc.docOriginal.nota || 'Sin observaciones.'}</p>
                                    </div>
                                )}

                                {/* VISTA DE PRESUPUESTO */}
                                {visorDoc.tipoDoc === 'presupuesto' && (
                                    <div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                            <p style={{ margin: 0 }}><strong>Fecha:</strong> {new Date(visorDoc.docOriginal.fecha_presupuesto).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</p>
                                            <p style={{ margin: 0 }}><strong>Estado:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{visorDoc.docOriginal.estado}</span></p>
                                        </div>

                                        {visorDoc.itemsMO?.length > 0 && (
                                            <div style={{ marginTop: '15px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                                                <strong style={{ color: '#0369a1' }}>⚙️ Servicios (Mano de Obra)</strong>
                                                <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '0.9rem' }}>
                                                    {visorDoc.itemsMO.map(mo => (
                                                        <li key={mo.id} style={{ marginBottom: '4px' }}>
                                                            {mo.cantidad}x {mo.bd_mo?.servicio || mo.descripcion_servicio} 
                                                            <span style={{ float: 'right', fontWeight: 'bold' }}>$ {formatDinero(mo.precio_total)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {visorDoc.itemsProd?.length > 0 && (
                                            <div style={{ marginTop: '15px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                                                <strong style={{ color: '#b91c1c' }}>📦 Repuestos Cotizados</strong>
                                                <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '0.9rem' }}>
                                                    {visorDoc.itemsProd.map(p => (
                                                        <li key={p.id} style={{ marginBottom: '4px' }}>
                                                            {p.cantidad}x {p.producto_texto_libre} 
                                                            <span style={{ float: 'right', fontWeight: 'bold' }}>$ {formatDinero(p.precio_total)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        <hr style={{ borderColor: '#cbd5e1', margin: '20px 0 10px 0' }}/>
                                        <div style={{ textAlign: 'right', fontSize: '1.2rem', color: '#1e293b' }}>
                                            <strong>TOTAL FINAL:</strong> <span style={{ color: '#dc2626', fontWeight: '900' }}>$ {formatDinero(visorDoc.docOriginal.total_presupuesto_con_iva)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <button style={{ ...s.btnSec, width: '100%' }} onClick={() => setVisorDoc(null)}>Ocultar Documento</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reporte_Saldos;