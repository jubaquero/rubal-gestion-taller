import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Almacenes() {
    const [almacenes, setAlmacenes] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [vista, setVista] = useState('listado');
    const [form, setForm] = useState({});
    const [stockActual, setStockActual] = useState([]);

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' },
        // Barra superior compacta y alineada
        topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px' },
        input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px' },
        btnPrincipal: { background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
        btnSecundario: { background: '#64748b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px' },
        tabla: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
        th: { background: '#f1f5f9', padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontSize: '1rem' },
        td: { padding: '10px', borderBottom: '1px solid #eee', fontSize: '1rem' },
        formFila: { display: 'flex', alignItems: 'center', marginBottom: '10px' },
        formLabel: { width: '150px', fontWeight: 'bold', fontSize: '1rem' },
        formInput: { flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' },
        datosLectura: { background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' },
        acciones: {
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'center'
        }
    };

    useEffect(() => { fetchAlmacenes(); }, []);

    const fetchAlmacenes = async () => {
        const { data } = await supabase.from('bd_almacenes').select('*').order('nombre');
        setAlmacenes(data || []);
    };

    const cargarFicha = async (a) => {
        setForm(a);
        const { data } = await supabase
            .from('bd_movimientos')
            .select('cantidad, bd_productos(*, bd_tipos_producto(nombre), bd_marcas(nombre))')
            .eq('id_almacen', a.id);

        const resumen = (data || []).reduce((acc, mov) => {
            const p = mov.bd_productos;
            if (!p) return acc;
            if (!acc[p.id]) acc[p.id] = { ...p, total: 0 };
            acc[p.id].total += Number(mov.cantidad);
            return acc;
        }, {});

        setStockActual(Object.values(resumen).filter(p => p.total > 0));
        setVista('ficha');
    };

    const almacenesFiltrados = almacenes.filter(a =>
        a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (a.ubicacion || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    const eliminarAlmacen = async (a) => {
        // 1. Validamos que no tenga movimientos asociados (integridad referencial)
        const { data } = await supabase
            .from('bd_movimientos')
            .select('id')
            .eq('id_almacen', a.id)
            .limit(1);

        if (data && data.length > 0) {
            return alert("⚠️ ACCIÓN DENEGADA: Este almacén tiene movimientos asociados y no puede eliminarse.");
        }

        // 2. Si pasa la validación, confirmamos y borramos
        if (confirm(`¿Estás seguro de eliminar el almacén "${a.nombre}"?`)) {
            await supabase.from('bd_almacenes').delete().eq('id', a.id);
            fetchAlmacenes(); // Refrescamos el listado
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={s.card}>
                {vista === 'listado' && (
                    <>
                        <div style={s.topBar}>
                            <h2 style={{ margin: 0 }}>🏢 Almacenes</h2>
                            <input style={s.input} placeholder="🔍 Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                            <button style={s.btnPrincipal} onClick={() => { setForm({}); setVista('formulario'); }}>➕ Nuevo</button>
                        </div>
                        <table style={s.tabla}>
                            <thead>
                                <tr>
                                    <th style={s.th}>Nombre</th>
                                    <th style={s.th}>Ubicación</th>
                                    <th style={{ ...s.th, textAlign: 'center' }}>¿Hay Lugar?</th>
                                    <th style={{ ...s.th, textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {almacenesFiltrados.map(a => (
                                    <tr key={a.id}>
      <td style={s.td}>{a.nombre}</td>
      <td style={s.td}>{a.ubicacion}</td>
      <td style={{ ...s.td, textAlign: 'center' }}>{a.hay_lugar ? '✅' : '❌'}</td>
      <td style={{ ...s.td, textAlign: 'center' }}>
                                            <div style={s.acciones}>
                                                <span style={{ cursor: 'pointer' }} onClick={() => cargarFicha(a)} title="Ver Ficha">👁️</span>
                                                <span style={{ cursor: 'pointer' }} onClick={() => { setForm(a); setVista('formulario'); }} title="Editar">✏️</span>
                                                <span style={{ cursor: 'pointer' }} onClick={() => eliminarAlmacen(a)} title="Eliminar">🗑️</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {(vista === 'formulario' || vista === 'ficha') && (
                    <>
                        <h3>{vista === 'formulario' ? (form.id ? '✏️ Editar Almacén' : '✨ Nuevo Almacén') : `🗂️ Ficha del Almacén: ${form.nombre}`}</h3>

                        {/* Si es ficha, mostramos los datos del almacén en modo lectura */}
                        {vista === 'ficha' && (
                            <div style={s.datosLectura}>
                                <p><strong>Nombre:</strong> {form.nombre}</p>
                                <p><strong>Ubicación:</strong> {form.ubicacion}</p>
                                <p><strong>¿Tiene lugar?:</strong> {form.hay_lugar ? 'Sí' : 'No'}</p>
                            </div>
                        )}

                        {vista === 'formulario' ? (
                            <>
                                <div style={s.formFila}><label style={s.formLabel}>Nombre:</label><input style={s.formInput} value={form.nombre || ''} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
                                <div style={s.formFila}><label style={s.formLabel}>Ubicación:</label><input style={s.formInput} value={form.ubicacion || ''} onChange={e => setForm({ ...form, ubicacion: e.target.value })} /></div>
                                <div style={s.formFila}><label style={s.formLabel}>¿Hay lugar?:</label><input type="checkbox" checked={!!form.hay_lugar} onChange={e => setForm({ ...form, hay_lugar: e.target.checked })} /></div>
                                <button style={s.btnPrincipal} onClick={async () => { await supabase.from('bd_almacenes')[form.id ? 'update' : 'insert'](form)[form.id ? 'eq' : '']('id', form.id); setVista('listado'); fetchAlmacenes(); }}>💾 Guardar</button>
                            </>
                        ) : (
                            <>
<h4>📦 Productos actuales:</h4>
                <table style={s.tabla}>
                  <thead>
                    <tr>
                      <th style={s.th}>Código</th>
                      <th style={s.th}>Tipo</th>
                      <th style={s.th}>Modelo Auto</th>
                      <th style={s.th}>Marca</th>
                      <th style={s.th}>Medida</th>
                      <th style={s.th}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockActual.map(p => (
                      <tr key={p.id}>
                        <td style={s.td}>{p.codigo}</td>
                        <td style={s.td}>{p.bd_tipos_producto?.nombre || '-'}</td>
                        <td style={s.td}>{p.modelo_auto || '-'}</td>
                        <td style={s.td}>{p.bd_marcas?.nombre || '-'}</td>
                        <td style={s.td}>{p.medida || '-'}</td>
                        <td style={s.td}><b>{p.total}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                            </>
                        )}
                        <button style={s.btnSecundario} onClick={() => setVista('listado')}>🔙 Volver</button>
                    </>
                )}
            </div>
        </div>
    );
}

export default Almacenes;