import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Recibos() {
    const [recibos, setRecibos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [presupuestos, setPresupuestos] = useState([]);
    const [vista, setVista] = useState('listado');
    const [busqueda, setBusqueda] = useState('');
    const [busquedaPresu, setBusquedaPresu] = useState('');
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    const [formData, setFormData] = useState({
        id: null,
        id_presupuesto: '',
        id_cliente: '',
        fecha_recibo: new Date().toISOString().split('T')[0],
        importe: '',
        forma_pago: 'Efectivo',
        nota: '',
        descuento: 0
    });

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#1e293b' },
        th: { padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' },
        td: { padding: '12px', borderBottom: '1px solid #f1f5f9' },
        btnPr: { background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }
    };

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [recs, clis, presus] = await Promise.all([
            supabase.from('bd_recibos').select('*, bd_clientes(*)').order('id', { ascending: false }),
            supabase.from('bd_clientes').select('*').order('nombre'),
            // Traemos todos los presupuestos para que los recibos viejos puedan buscar sus montos históricos
            supabase.from('bd_presupuestos').select('*, bd_clientes(*)').order('id', { ascending: false })
        ]);
        setRecibos(recs.data || []);
        setClientes(clis.data || []);
        setPresupuestos(presus.data || []);
    };

    const handleSeleccionarPresupuesto = (p) => {
        setFormData(prev => ({ ...prev, id_presupuesto: p.id, id_cliente: p.id_cliente }));
        setBusquedaPresu(`N° ${p.id} - ${p.bd_clientes?.nombre} ${p.bd_clientes?.apellido}`);
        setMostrarSugerencias(false);
    };

    const handleGuardar = async () => {
        if (!formData.id_cliente || !formData.importe) return alert("⚠️ Por favor, complete el Importe y seleccione un Presupuesto.");
        const dataToSave = { ...formData };
        if (dataToSave.id) delete dataToSave.id;

        // Formateo seguro para base de datos
        if (!dataToSave.id_presupuesto) dataToSave.id_presupuesto = null;
        dataToSave.descuento = dataToSave.descuento ? Number(dataToSave.descuento) : 0;

        if (formData.id) {
            await supabase.from('bd_recibos').update(dataToSave).eq('id', formData.id);
        } else {
            await supabase.from('bd_recibos').insert([dataToSave]);
        }
        setVista('listado');
        cargarDatos();
    };

    const getNombreCliente = (id) => {
        const c = clientes.find(cli => String(cli.id) === String(id));
        return c ? `${c.nombre} ${c.apellido}` : '';
    };

    const getMontoPresupuesto = (id) => {
        const p = presupuestos.find(pres => String(pres.id) === String(id));
        return p ? Number(p.total_presupuesto_con_iva).toFixed(2) : '0.00';
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={s.card}>
                {vista === 'listado' ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>🧾 Recibos</h2>
                            <input placeholder="🔍 Buscar por N° Recibo o Cliente..." style={{...s.input, width: '320px'}} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                            <button style={s.btnPr} onClick={() => { 
                                setFormData({id: null, id_presupuesto: '', id_cliente: '', fecha_recibo: new Date().toISOString().split('T')[0], importe: '', forma_pago: 'Efectivo', nota: '', descuento: 0}); 
                                setBusquedaPresu('');
                                setMostrarSugerencias(false);
                                setVista('crear'); 
                            }}>+ Nuevo Recibo</button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={s.th}>Nro Recibo</th><th style={s.th}>Fecha</th><th style={s.th}>Cliente</th><th style={s.th}>Importe</th><th style={s.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recibos.filter(r => String(r.id).includes(busqueda) || `${r.bd_clientes?.nombre} ${r.bd_clientes?.apellido}`.toLowerCase().includes(busqueda.toLowerCase())).map(r => (
                                    <tr key={r.id}>
                                        <td style={s.td}>#{r.id}</td>
                                        <td style={s.td}>{new Date(r.fecha_recibo).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                        <td style={s.td}>{r.bd_clientes?.nombre} {r.bd_clientes?.apellido}</td>
                                        <td style={s.td}>${Number(r.importe).toFixed(2)}</td>
                                        <td style={s.td}>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '1.2rem' }}>
                                                <span style={{ cursor: 'pointer' }} title="Imprimir / Ver" onClick={() => alert("Impresión en desarrollo")}>👁️</span>
                                                <span style={{ cursor: 'pointer' }} title="Editar" onClick={() => { 
                                                    setFormData({
                                                        ...r,
                                                        importe: r.importe || '',
                                                        descuento: r.descuento || 0,
                                                        nota: r.nota || ''
                                                    }); 
                                                    const p = presupuestos.find(pres => pres.id === r.id_presupuesto);
                                                    setBusquedaPresu(p ? `N° ${p.id} - ${p.bd_clientes?.nombre} ${p.bd_clientes?.apellido}` : '');
                                                    setMostrarSugerencias(false);
                                                    setVista('editar'); 
                                                }}>✏️</span>
                                                <span style={{ cursor: 'pointer', color: '#dc2626' }} title="Eliminar" onClick={() => {
                                                    if(window.confirm(`⚠️ ¿Seguro que desea eliminar el Recibo N° ${r.id}? Esta acción no se puede deshacer.`)) {
                                                        supabase.from('bd_recibos').delete().eq('id', r.id).then(cargarDatos);
                                                    }
                                                }}>🗑️</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            <h2 style={{ margin: 0 }}>{formData.id ? `✏️ Editar Recibo #${formData.id}` : '✨ Creación de Recibo'}</h2>
                            <button style={s.btnSec} onClick={() => setVista('listado')}>← Cancelar y Volver</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            
                            {/* BUSCADOR INTELIGENTE CON DESVINCULADOR (Solución Punto 1 y 6) */}
                            <div>
                                <label style={s.label}>Presupuesto Aprobado</label>
                                {formData.id_presupuesto ? (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input style={{ ...s.input, background: '#f8fafc', fontWeight: 'bold', border: '1px solid #cbd5e1' }} value={busquedaPresu} disabled />
                                        {!formData.id && (
                                            <button 
                                                type="button" 
                                                style={{ ...s.btnPr, background: '#475569', whiteSpace: 'nowrap' }} 
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, id_presupuesto: '', id_cliente: '' }));
                                                    setBusquedaPresu('');
                                                }}
                                            >
                                                ❌ Cambiar
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            style={s.input} 
                                            value={busquedaPresu || ''} 
                                            onFocus={() => setMostrarSugerencias(true)}
                                            onChange={e => { setBusquedaPresu(e.target.value); setMostrarSugerencias(true); }} 
                                            placeholder="Buscar por Nro o Apellido del cliente..." 
                                        />
                                        {mostrarSugerencias && busquedaPresu && (
                                            <ul style={{ position: 'absolute', width: '100%', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 10, listStyle: 'none', padding: 0, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                {presupuestos
                                                    .filter(p => p.estado === 'APROBADO') // Solo permitimos elegir aprobados para recibos nuevos
                                                    .filter(p => String(p.id).includes(busquedaPresu) || `${p.bd_clientes?.nombre} ${p.bd_clientes?.apellido}`.toLowerCase().includes(busquedaPresu.toLowerCase()))
                                                    .map(p => (
                                                        <li key={p.id} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} 
                                                            onClick={() => handleSeleccionarPresupuesto(p)}>
                                                            N° {p.id} - {p.bd_clientes?.nombre} {p.bd_clientes?.apellido}
                                                        </li>
                                                    ))
                                                }
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* CLIENTE AUTOCOMPLETADO (Deshabilitado seguro) */}
                            <div>
                                <label style={s.label}>Cliente</label>
                                <input style={{...s.input, background: '#f1f5f9'}} value={getNombreCliente(formData.id_cliente) || ''} placeholder="Se autocompleta al elegir el presupuesto..." disabled />
                            </div>

                            {/* IMPORTE PAGADO */}
                            <div>
                                <label style={s.label}>Importe Pagado ($) *</label>
                                <input type="number" style={s.input} value={formData.importe ?? ''} onChange={e => setFormData({...formData, importe: e.target.value})} placeholder="0.00" />
                            </div>

                            {/* FORMA DE PAGO */}
                            <div>
                                <label style={s.label}>Forma de Pago *</label>
                                <select style={s.input} value={formData.forma_pago || 'Efectivo'} onChange={e => setFormData({...formData, forma_pago: e.target.value})}>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>

                            {/* FECHA DEL RECIBO */}
                            <div>
                                <label style={s.label}>Fecha del Recibo</label>
                                <input type="date" style={s.input} value={formData.fecha_recibo || ''} onChange={e => setFormData({...formData, fecha_recibo: e.target.value})} />
                            </div>

                            {/* CAMPO CONDICIONAL DE DESCUENTO HISTÓRICO (Solo lectura de salida si > 0) */}
                            {formData.id && Number(formData.descuento) > 0 && (
                                <div>
                                    <label style={s.label}>Descuento / Ajuste Aplicado ($) [Histórico]</label>
                                    <input 
                                        type="number" 
                                        style={{ ...s.input, background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', fontWeight: 'bold' }} 
                                        value={formData.descuento ?? 0} 
                                        disabled 
                                    />
                                </div>
                            )}

                            {/* NOTA / OBSERVACIONES */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={s.label}>Nota / Observaciones extras (Opcional)</label>
                                <textarea 
                                    style={{ ...s.input, height: '60px', resize: 'vertical' }} 
                                    value={formData.nota || ''} 
                                    onChange={e => setFormData({ ...formData, nota: e.target.value })} 
                                    placeholder="Detalles sobre el pago, banco del cheque, nro de transferencia, etc..."
                                />
                            </div>
                        </div>

{/* TEXTO INFORMATIVO DINÁMICO */}
<div style={{ marginTop: '25px', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
    <p style={{ margin: 0, fontStyle: 'italic', color: '#334155', fontSize: '1.05rem', lineHeight: '1.5' }}>
        El día <b>{formData.fecha_recibo ? new Date(formData.fecha_recibo).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '...'}</b> recibo de <b>{getNombreCliente(formData.id_cliente) || '...'}</b> el importe de <b>${formData.importe || '0'}</b> mediante <b>{formData.forma_pago || '...'}</b> en concepto de pago del Presupuesto N° {formData.id_presupuesto || '...'}.
        
        {formData.id_presupuesto && (
            <span style={{ display: 'block', marginTop: '10px', color: '#0f172a' }}>
                💰 <b>Total del presupuesto asociado de manera informativa: ${getMontoPresupuesto(formData.id_presupuesto)}</b>
            </span>
        )}

        {Number(formData.descuento) !== 0 && (
            <span style={{ display: 'block', marginTop: '5px', color: '#b45309', fontWeight: 'bold' }}>
                ⚠️ Nota de Historial: En este recibo se aplicaron descuentos por un valor de ${Math.abs(Number(formData.descuento)).toFixed(2)}.
            </span>
        )}
    </p>
</div>
                        
                        {/* BOTONERA INFERIOR */}
                        <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                            <button style={{ ...s.btnSec, flex: 1, padding: '15px' }} onClick={() => setVista('listado')}>
                                ← Cancelar y Salir sin Grabar
                            </button>
                            <button style={{ ...s.btnPr, flex: 2, padding: '15px', fontSize: '1.1rem' }} onClick={handleGuardar}>
                                💾 Guardar Recibo
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Recibos;