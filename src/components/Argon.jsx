import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Argon() {
    const [recargas, setRecargas] = useState([]);
    const [usosArgon, setUsosArgon] = useState([]);
    const [vista, setVista] = useState('listado');
    const [pestañaActiva, setPestañaActiva] = useState('usos');
    const [cargando, setCargando] = useState(true);

    const [formData, setFormData] = useState({
        id: null,
        fecha: new Date().toISOString().split('T')[0],
        proveedor: '',
        costo: '',
        nota: ''
    });

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#1e293b' },
        th: { padding: '12px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' },
        td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.95rem' },
        btnPr: { background: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
        tabActiva: { padding: '10px 20px', background: '#e0f2fe', color: '#0369a1', borderBottom: '3px solid #0284c7', fontWeight: 'bold', cursor: 'pointer' },
        tabInactiva: { padding: '10px 20px', background: 'transparent', color: '#64748b', borderBottom: '3px solid transparent', cursor: 'pointer' },
        resumenBox: { padding: '20px', borderRadius: '12px', color: '#fff', textAlign: 'center', flex: 1, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
    };

    const formatDinero = (valor) => {
        return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor || 0));
    };

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const resRecargas = await supabase.from('bd_recargas_argon').select('*').order('fecha', { ascending: false });
            
            const [resMO, resTrabs, resClis, resNoms] = await Promise.all([
                supabase.from('bd_trabajos_mo').select('*').eq('item_servicio', 3001), 
                supabase.from('bd_trabajos').select('*'),
                supabase.from('bd_clientes').select('*'),
                supabase.from('bd_nomenclador').select('*')
            ]);

            const listaRecargas = resRecargas.data || [];
            const listaMO = resMO.data || [];
            const listaTrabs = resTrabs.data || [];
            const listaClis = resClis.data || [];
            const listaNoms = resNoms.data || [];

            const historialUsos = listaMO.map(mo => {
                const trabajo = listaTrabs.find(t => t.id === mo.id_trabajo);
                const cliente = trabajo ? listaClis.find(c => c.id === trabajo.id_cliente) : null;
                const nomenclador = trabajo ? listaNoms.find(n => n.id === trabajo.id_nomenclador) : null;

                return {
                    id_mo: mo.id,
                    id_trabajo: mo.id_trabajo,
                    fecha: trabajo?.fecha_inicio || mo.created_at, 
                    observacion: mo.observacion || 'Sin detalles',
                    cliente_nombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Desconocido',
                    motor: nomenclador ? nomenclador.descripcion : 'Sin especificar'
                };
            }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            setRecargas(listaRecargas);
            setUsosArgon(historialUsos);
        } catch (error) {
            console.error("Error cargando datos de Argón", error);
        }
        setCargando(false);
    };

const handleGuardar = async () => {
    if (!formData.fecha) return alert("⚠️ Ingrese al menos la fecha de recarga.");
    
    // 1. Creamos una copia para no modificar el estado original directamente
    const dataToSave = { ...formData, costo: formData.costo ? Number(formData.costo) : 0 };
    
    // 2. ELIMINAMOS el ID del objeto que vamos a enviar a la base de datos
    // Esto es vital porque la DB no permite actualizar una columna IDENTITY
    delete dataToSave.id; 

    if (formData.id) {
        // ACTUALIZACIÓN
        const { error } = await supabase
            .from('bd_recargas_argon')
            .update(dataToSave) // Acá dataToSave ya no tiene el ID
            .eq('id', formData.id); // Usamos el ID original solo para el filtro
            
        if (error) {
            console.error("Error al actualizar:", error);
            alert("Error al actualizar: " + error.message);
            return;
        }
    } else {
        // CREACIÓN
        const { error } = await supabase
            .from('bd_recargas_argon')
            .insert([dataToSave]);
            
        if (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar: " + error.message);
            return;
        }
    }
    
    setVista('listado');
    cargarDatos();
};

    // --- LÓGICA DE KPIs CORREGIDA Y PRECISA ---
    
    // 1. Trabajos con el tubo actual (Desde la última recarga hasta hoy)
    const ultimaRecarga = recargas.length > 0 ? recargas[0] : null;
    const trabajosDesdeUltimaRecarga = ultimaRecarga 
        ? usosArgon.filter(u => new Date(u.fecha) >= new Date(ultimaRecarga.fecha)).length 
        : usosArgon.length;

    // 2. Rendimiento Promedio Histórico (Solo midiendo tubos terminados/ciclos completados)
    let promedioPorTubo = 0;
    
    if (recargas.length > 1) {
        // Si hay al menos 2 recargas, ordenamos del más viejo al más nuevo para armar los "sándwiches"
        const recargasCronologicas = [...recargas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        let sumRendimientos = 0;
        let ciclosCompletos = 0;

        for (let i = 0; i < recargasCronologicas.length - 1; i++) {
            const fechaInicioCiclo = new Date(recargasCronologicas[i].fecha);
            const fechaFinCiclo = new Date(recargasCronologicas[i + 1].fecha);

            // Contamos los trabajos que se hicieron con ese tubo en particular
            const usosEnEseTubo = usosArgon.filter(u => {
                const fechaUso = new Date(u.fecha);
                return fechaUso >= fechaInicioCiclo && fechaUso < fechaFinCiclo;
            }).length;

            sumRendimientos += usosEnEseTubo;
            ciclosCompletos++;
        }
        
        promedioPorTubo = Math.round(sumRendimientos / ciclosCompletos);
    } else {
        // Si tienen una sola recarga en la historia, su promedio actual es lo que llevan gastado hasta hoy
        promedioPorTubo = trabajosDesdeUltimaRecarga;
    }

    return (
        <div style={{ padding: '20px', width: '96%', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', width: '100%' }}>
                <div style={{ ...s.resumenBox, background: '#0284c7' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.9 }}>
                        Última Recarga de Tubo
                    </h3>
                    <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>
                        {ultimaRecarga ? new Date(ultimaRecarga.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Sin registros'}
                    </p>
                </div>
                <div style={{ ...s.resumenBox, background: trabajosDesdeUltimaRecarga > promedioPorTubo ? '#ef4444' : '#10b981' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.9 }}>
                        Trabajos con tubo actual
                    </h3>
                    <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 'bold' }}>
                        {trabajosDesdeUltimaRecarga} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>rellenados</span>
                    </p>
                </div>
                <div style={{ ...s.resumenBox, background: '#64748b' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.9 }}>
                        Rendimiento Promedio Histórico
                    </h3>
                    <p style={{ margin: 0, fontSize: '2.2rem', fontWeight: 'bold' }}>
                        {promedioPorTubo} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>por tubo completado</span>
                    </p>
                </div>
            </div>

            <div style={s.card}>
                {vista === 'listado' ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={pestañaActiva === 'usos' ? s.tabActiva : s.tabInactiva} onClick={() => setPestañaActiva('usos')}>
                                    🔧 Consumo de Argón (Trabajos)
                                </div>
                                <div style={pestañaActiva === 'recargas' ? s.tabActiva : s.tabInactiva} onClick={() => setPestañaActiva('recargas')}>
                                    🛢️ Historial de Recargas
                                </div>
                            </div>
                            <button style={s.btnPr} onClick={() => { 
                                setFormData({ id: null, fecha: new Date().toISOString().split('T')[0], proveedor: '', costo: '', nota: '' }); 
                                setVista('crear'); 
                            }}>
                                + Registrar Recarga
                            </button>
                        </div>

                        {cargando ? (
                            <p>Cargando datos de stock...</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                {pestañaActiva === 'usos' && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                                <th style={s.th}>Fecha Trabajo</th>
                                                <th style={s.th}>N° Trab</th>
                                                <th style={s.th}>Cliente</th>
                                                <th style={s.th}>Motor / Trabajo</th>
                                                <th style={s.th}>Observación (Consumo)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usosArgon.map((u, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={s.td}>{new Date(u.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                                    <td style={{...s.td, fontWeight: 'bold'}}>#{u.id_trabajo}</td>
                                                    <td style={s.td}>{u.cliente_nombre}</td>
                                                    <td style={s.td}>{u.motor}</td>
                                                    <td style={{...s.td, color: '#475569'}}><i>{u.observacion}</i></td>
                                                </tr>
                                            ))}
                                            {usosArgon.length === 0 && <tr><td colSpan="5" style={{...s.td, textAlign:'center'}}>No hay trabajos registrados con soldadura.</td></tr>}
                                        </tbody>
                                    </table>
                                )}

                                {pestañaActiva === 'recargas' && (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                                <th style={s.th}>Fecha de Recarga</th>
                                                <th style={s.th}>Proveedor</th>
                                                <th style={s.th}>Costo</th>
                                                <th style={s.th}>Nota</th>
                                                <th style={{...s.th, textAlign: 'center'}}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recargas.map(r => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{...s.td, fontWeight: 'bold'}}>{new Date(r.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                                    <td style={s.td}>{r.proveedor || '-'}</td>
                                                    <td style={{...s.td, color: '#b91c1c', fontWeight: 'bold'}}>$ {formatDinero(r.costo)}</td>
                                                    <td style={s.td}>{r.nota || '-'}</td>
                                                    <td style={{...s.td, textAlign: 'center'}}>
                                                        <span style={{ cursor: 'pointer', marginRight: '15px' }} onClick={() => { setFormData(r); setVista('crear'); }}>✏️</span>
                                                        <span style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => { if(window.confirm('¿Eliminar recarga?')) supabase.from('bd_recargas_argon').delete().eq('id', r.id).then(cargarDatos); }}>🗑️</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {recargas.length === 0 && <tr><td colSpan="5" style={{...s.td, textAlign:'center'}}>No hay recargas registradas.</td></tr>}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            <h2 style={{ margin: 0 }}>{formData.id ? `✏️ Editar Recarga de Argón` : '🛢️ Nueva Recarga de Argón'}</h2>
                            <button style={s.btnSec} onClick={() => setVista('listado')}>← Volver al Stock</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={s.label}>Fecha de Recarga / Cambio de Tubo *</label>
                                <input type="date" style={s.input} value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
                            </div>
                            <div>
                                <label style={s.label}>Costo ($)</label>
                                <input type="number" style={s.input} value={formData.costo} onChange={e => setFormData({...formData, costo: e.target.value})} placeholder="Ej: 45000" />
                            </div>
                            <div>
                                <label style={s.label}>Proveedor (Opcional)</label>
                                <input type="text" style={s.input} value={formData.proveedor || ''} onChange={e => setFormData({...formData, proveedor: e.target.value})}  />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={s.label}>Nota / Observación</label>
                                <textarea style={{ ...s.input, height: '60px' }} value={formData.nota || ''} onChange={e => setFormData({...formData, nota: e.target.value})}  />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button style={{ ...s.btnPr, flex: 2, padding: '15px' }} onClick={handleGuardar}>💾 Guardar Registro</button>
                            <button style={{ ...s.btnSec, flex: 1, padding: '15px' }} onClick={() => setVista('listado')}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Argon;