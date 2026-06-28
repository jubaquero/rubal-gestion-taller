import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import logoRubal from '../assets/logo_rubal.png';

function Comisiones() {
    const [comisiones, setComisiones] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [presupuestos, setPresupuestos] = useState([]);
    const [vista, setVista] = useState('listado');
    const [busqueda, setBusqueda] = useState('');
    const [busquedaPresu, setBusquedaPresu] = useState('');
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    const [formData, setFormData] = useState({
        id: null, id_presupuesto: '', id_cliente: '',
        fecha: new Date().toISOString().split('T')[0],
        importe: '', forma_pago: 'Efectivo', nota: ''
    });

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#1e293b' },
        th: { padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' },
        td: { padding: '12px', borderBottom: '1px solid #f1f5f9' },
        btnPr: { background: '#059669', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }
    };

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        const [coms, clis, presus] = await Promise.all([
            supabase.from('bd_comisiones').select('*, bd_clientes(*)').order('id', { ascending: false }),
            supabase.from('bd_clientes').select('*').order('nombre'),
            supabase.from('bd_presupuestos').select('*, bd_clientes(*)').order('id', { ascending: false })
        ]);
        setComisiones(coms.data || []);
        setClientes(clis.data || []);
        setPresupuestos(presus.data || []);
    };

    const handleSeleccionarPresupuesto = (p) => {
        setFormData(prev => ({ ...prev, id_presupuesto: p.id, id_cliente: p.id_cliente }));
        setBusquedaPresu(`N° ${p.id} - ${p.bd_clientes?.nombre || ''} ${p.bd_clientes?.apellido || ''}`);
        setMostrarSugerencias(false);
    };

const handleGuardar = async () => {
        if (!formData.id_cliente || !formData.importe) return alert("⚠️ Por favor, complete el Importe y seleccione un Presupuesto.");
        
        // Hacemos una copia de los datos del formulario
        const dataToSave = { ...formData, nota: formData.nota || '' };
        
        // Limpiamos los campos que NO van en la base de datos
        if (dataToSave.id) delete dataToSave.id;
        if (dataToSave.bd_clientes) delete dataToSave.bd_clientes; // <-- ¡Esta es la solución mágica!

        if (formData.id) {
            // Actualizar
            const { error } = await supabase.from('bd_comisiones').update(dataToSave).eq('id', formData.id);
            if (error) {
                console.error("Error de Supabase:", error);
                alert("Hubo un error al guardar: " + error.message);
                return;
            }
        } else {
            // Crear nuevo
            const { error } = await supabase.from('bd_comisiones').insert([dataToSave]);
            if (error) {
                console.error("Error de Supabase:", error);
                alert("Hubo un error al guardar: " + error.message);
                return;
            }
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

    const imprimirComision = (c) => {
        const nombreCliente = `${c.bd_clientes?.nombre || ''} ${c.bd_clientes?.apellido || ''}`;
        const fechaFormat = new Date(c.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' });
        const tituloArchivo = `Comisión N° ${c.id} - ${nombreCliente} - ${fechaFormat.replace(/\//g, '-')}.pdf`;
        
        const ventana = window.open('', '_blank');
        ventana.document.write(`
            <html>
                <head>
                    <title>${tituloArchivo}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; background-color: #ffffff !important; }
                        .recibo-container { border: 2px solid #333; padding: 40px; max-width: 600px; margin: auto; border-radius: 8px; background-color: #ffffff; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 30px; }
                        .texto-principal { font-size: 1.1rem; line-height: 1.8; text-align: justify; }
                    </style>
                </head>
                <body>
                    <div class="recibo-container">
                        <div class="header">
                            <img src="${logoRubal}" style="width: 100px;" alt="Logo" />
                            <h2 style="margin: 0; color: #059669;">COMISIÓN N° ${c.id}</h2>
                        </div>
                        <div class="texto-principal">
                            <p>El día <b>${fechaFormat}</b> entregué a <b>${nombreCliente}</b> el importe de <b>$${Number(c.importe).toFixed(2)}</b> pesos mediante <b>${c.forma_pago}</b> en concepto de comisión del Presupuesto N° <b>${c.id_presupuesto || 'S/N'}</b>.</p>
                            ${c.nota ? `<p style="font-size: 0.9rem; color: #555; margin-top: 20px;"><i>Observaciones: ${c.nota}</i></p>` : ''}
                        </div>
                    </div>
                    <script>
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    </script>
                </body>
            </html>
        `);
        ventana.document.close();
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={s.card}>
                {vista === 'listado' ? (
                    <>
                        <div style={{ display: 'flex', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0 }}>💰 Comisiones</h2>
                            <input placeholder="🔍 Buscar por N° Comisión, Cliente o Presupuesto..." style={{ ...s.input, width: '400px' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                            <button style={s.btnPr} onClick={() => { 
                                setFormData({ id: null, id_presupuesto: '', id_cliente: '', fecha: new Date().toISOString().split('T')[0], importe: '', forma_pago: 'Efectivo', nota: '' }); 
                                setBusquedaPresu(''); 
                                setMostrarSugerencias(false);
                                setVista('crear'); 
                            }}>+ Nueva Comisión</button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={s.th}>Nro</th><th style={s.th}>Fecha</th><th style={s.th}>Cliente</th><th style={s.th}>Presupuesto</th><th style={s.th}>Pago</th><th style={s.th}>Importe</th><th style={s.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comisiones.filter(c => String(c.id).includes(busqueda) || String(c.id_presupuesto).includes(busqueda) || `${c.bd_clientes?.nombre} ${c.bd_clientes?.apellido}`.toLowerCase().includes(busqueda.toLowerCase())).map(c => (
                                    <tr key={c.id}>
                                        <td style={s.td}>#{c.id}</td>
                                        <td style={s.td}>{new Date(c.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                        <td style={s.td}>{c.bd_clientes?.nombre} {c.bd_clientes?.apellido}</td>
                                        <td style={s.td}>#{c.id_presupuesto || 'S/N'}</td>
                                        <td style={s.td}>{c.forma_pago}</td>
                                        <td style={s.td}>${Number(c.importe).toFixed(2)}</td>
                                        <td style={s.td}>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '1.2rem' }}>
                                                <span style={{ cursor: 'pointer' }} title="Imprimir" onClick={() => imprimirComision(c)}>🖨️</span>
                                                <span style={{ cursor: 'pointer' }} title="Editar" onClick={() => { 
                                                    setFormData({ ...c, nota: c.nota || '' }); 
                                                    setBusquedaPresu(c.id_presupuesto ? `N° ${c.id_presupuesto}` : ''); 
                                                    setMostrarSugerencias(false);
                                                    setVista('editar'); 
                                                }}>✏️</span>
                                                <span style={{ cursor: 'pointer', color: '#dc2626' }} title="Eliminar" onClick={() => { 
                                                    if(window.confirm(`⚠️ ¿Seguro que desea eliminar de forma permanente la Comisión N° ${c.id}? Esta acción no se puede deshacer.`)) {
                                                        supabase.from('bd_comisiones').delete().eq('id', c.id).then(cargarDatos); 
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
                            <h2 style={{ margin: 0 }}>{formData.id ? `✏️ Editar Comisión #${formData.id}` : '✨ Creación de Comisión'}</h2>
                            <button style={s.btnSec} onClick={() => setVista('listado')}>← Cancelar y Volver</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={s.label}>Buscar Presupuesto</label>
                                <input style={s.input} value={busquedaPresu} onFocus={() => setMostrarSugerencias(true)} onChange={e => {setBusquedaPresu(e.target.value); setMostrarSugerencias(true)}} placeholder="Buscar por N° o Nombre/Apellido..." />
                                {mostrarSugerencias && busquedaPresu && (
                                    <ul style={{ position: 'absolute', background: '#fff', border: '1px solid #cbd5e1', width: '100%', zIndex: 10, listStyle: 'none', padding: 0, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                        {presupuestos
                                            .filter(p => String(p.id).includes(busquedaPresu) || `${p.bd_clientes?.nombre} ${p.bd_clientes?.apellido}`.toLowerCase().includes(busquedaPresu.toLowerCase()))
                                            .map(p => (
                                                <li key={p.id} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => handleSeleccionarPresupuesto(p)}>
                                                    N° {p.id} - {p.bd_clientes?.nombre} {p.bd_clientes?.apellido}
                                                </li>
                                            ))
                                        }
                                    </ul>
                                )}
                            </div>
                            <div>
                                <label style={s.label}>Cliente</label>
                                <input style={{ ...s.input, background: '#f1f5f9' }} value={getNombreCliente(formData.id_cliente) || ''} placeholder="Se autocompleta al elegir presupuesto..." disabled />
                            </div>
                            <div>
                                <label style={s.label}>Importe Comisión ($) *</label>
                                <input type="number" style={s.input} value={formData.importe} onChange={e => setFormData({...formData, importe: e.target.value})} placeholder="0.00" />
                            </div>
                            <div>
                                <label style={s.label}>Forma de Pago *</label>
                                <select style={s.input} value={formData.forma_pago} onChange={e => setFormData({...formData, forma_pago: e.target.value})}>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label style={s.label}>Fecha de Comisión *</label>
                                <input type="date" style={s.input} value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
                            </div>
                            
                            {/* RECUADRO INFORMATIVO DEL TOTAL DEL PRESUPUESTO */}
                            {formData.id_presupuesto && (
                                <div>
                                    <label style={{ ...s.label, color: '#047857' }}>Total del Presupuesto Original (Info)</label>
                                    <input style={{ ...s.input, background: '#f0fdf4', border: '1px dashed #059669', color: '#047857', fontWeight: 'bold' }} value={`$${getMontoPresupuesto(formData.id_presupuesto)}`} disabled />
                                </div>
                            )}

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={s.label}>Nota / Observaciones (Opcional)</label>
                                <textarea style={{ ...s.input, height: '60px', resize: 'vertical' }} value={formData.nota || ''} onChange={e => setFormData({...formData, nota: e.target.value})} placeholder="Detalles extra sobre la comisión..." />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                            <button style={{ ...s.btnPr, flex: 2, padding: '15px', fontSize: '1.1rem' }} onClick={handleGuardar}>💾 Guardar Comisión</button>
                            <button style={{ ...s.btnSec, flex: 1, padding: '15px' }} onClick={() => setVista('listado')}>Cancelar y Salir</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Comisiones;