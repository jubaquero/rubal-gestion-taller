import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Mano_de_Obra() {
    const [moList, setMoList] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroFactor, setFiltroFactor] = useState('todos'); // 'todos', 'normal', 'modificado'
    const [cargando, setCargando] = useState(true);
    const [codigoSugerido, setCodigoSugerio] = useState(0);

    // Estados para edición rápida del Factor
    const [editFactorId, setEditFactorId] = useState(null);
    const [editFactorValue, setEditFactorValue] = useState('');

    // Estado para controlar qué categorías se muestran (por defecto 1 a 4)
    const [columnasVisibles, setColumnasVisibles] = useState({
        1: true, 2: true, 3: true, 4: true, 5: false, 6: false, 7: false,
        8: false, 9: false, 10: false, 11: false, 12: false, 13: false
    });

    // Estados para el Modal de Creación
    const [mostrarModal, setMostrarModal] = useState(false);
    const initialForm = {
        codigo_mo: '', servicio: '', factor: 1.00,
        cat_1: '', cat_2: '', cat_3: '', cat_4: '', cat_5: '', cat_6: '', cat_7: '',
        cat_8: '', cat_9: '', cat_10: '', cat_11: '', cat_12: '', cat_13: ''
    };
    const [formData, setFormData] = useState(initialForm);

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        input: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        select: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontWeight: 'bold' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#1e293b' },
        th: { padding: '12px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap' },
        td: { padding: '12px 8px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', textAlign: 'center', whiteSpace: 'nowrap' },
        btnPr: { background: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modalContent: { background: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
        checkboxContainer: { display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }
    };

    const formatDinero = (num) => {
        return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(num || 0));
    };

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('bd_mo')
            .select('*')
            .order('codigo_mo', { ascending: true });

        if (error) {
            console.error("Error cargando MO:", error);
        } else {
            setMoList(data || []);
            // Calculamos el código más alto para la sugerencia (+1)
            if (data && data.length > 0) {
                const maxCodigo = Math.max(...data.map(mo => Number(mo.codigo_mo || 0)));
                setCodigoSugerio(maxCodigo + 1);
            } else {
                setCodigoSugerio(1001); // Por si la tabla estuviera vacía
            }
        }
        setCargando(false);
    };

    // --- LÓGICA DE FILTRADO AVANZADO (Buscador + Filtro de Factor) ---
    const listaFiltrada = moList.filter(mo => {
        // 1. Filtro por Busqueda (Código o Descripción)
        const cumpleBusqueda = String(mo.codigo_mo).includes(busqueda) || 
            (mo.servicio && mo.servicio.toLowerCase().includes(busqueda.toLowerCase()));
        
        // 2. Filtro por Estado del Factor
        const factorNum = Number(mo.factor ?? 1);
        let cumpleFactor = true;
        if (filtroFactor === 'normal') {
            cumpleFactor = factorNum === 1;
        } else if (filtroFactor === 'modificado') {
            cumpleFactor = factorNum !== 1;
        }

        return cumpleBusqueda && cumpleFactor;
    });

    // --- LÓGICA DE EDICIÓN DEL FACTOR ---
    const iniciarEdicionFactor = (mo) => {
        setEditFactorId(mo.codigo_mo);
        setEditFactorValue(mo.factor !== null ? mo.factor : 1.00);
    };

    const guardarFactor = async (codigo_mo) => {
        const nuevoFactor = Number(editFactorValue);
        const { error } = await supabase
            .from('bd_mo')
            .update({ factor: nuevoFactor })
            .eq('codigo_mo', codigo_mo);

        if (error) {
            alert('Error al actualizar el factor: ' + error.message);
        } else {
            setMoList(moList.map(mo => mo.codigo_mo === codigo_mo ? { ...mo, factor: nuevoFactor } : mo));
            setEditFactorId(null);
        }
    };

    // --- LÓGICA DE CREACIÓN ---
    const handleCrear = async () => {
        if (!formData.codigo_mo || !formData.servicio) {
            return alert("El Código y el Servicio son obligatorios.");
        }

        const dataToSave = {
            codigo_mo: Number(formData.codigo_mo),
            servicio: formData.servicio,
            factor: Number(formData.factor),
            cat_1: Number(formData.cat_1 || 0), cat_2: Number(formData.cat_2 || 0),
            cat_3: Number(formData.cat_3 || 0), cat_4: Number(formData.cat_4 || 0),
            cat_5: Number(formData.cat_5 || 0), cat_6: Number(formData.cat_6 || 0),
            cat_7: Number(formData.cat_7 || 0), cat_8: Number(formData.cat_8 || 0),
            cat_9: Number(formData.cat_9 || 0), cat_10: Number(formData.cat_10 || 0),
            cat_11: Number(formData.cat_11 || 0), cat_12: Number(formData.cat_12 || 0),
            cat_13: Number(formData.cat_13 || 0)
        };

        const { error } = await supabase.from('bd_mo').insert([dataToSave]);

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            alert("✅ Servicio creado correctamente.");
            setMostrarModal(false);
            setFormData(initialForm);
            cargarDatos();
        }
    };

    // Al abrir el modal, auto-completamos el formulario con el código sugerido
    const abrirModalCrear = () => {
        setFormData({ ...initialForm, codigo_mo: codigoSugerido });
        setMostrarModal(true);
    };

    const categoriasArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

    // Manejador para prender/apagar columnas de categorías
    const toggleColumna = (num) => {
        setColumnasVisibles(prev => ({ ...prev, [num]: !prev[num] }));
    };

    return (
        <div style={{ padding: '20px', maxWidth: '100%', boxSizing: 'border-box' }}>
            <div style={s.card}>
                
                {/* FILTROS Y CONTROLES SUPERIORES */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ margin: 0 }}>⚙️ Mano de Obra y Factores (modifica valor FACRA)</h2>
                    
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Buscador de texto */}
                        <input 
                            placeholder="🔍 Buscar por Código o Servicio..." 
                            style={{ ...s.input, width: '280px' }} 
                            value={busqueda} 
                            onChange={e => setBusqueda(e.target.value)} 
                        />
                        
                        {/* Selector de tipo de Factor (Mejora 3) */}
                        <select 
                            style={s.select} 
                            value={filtroFactor} 
                            onChange={e => setFiltroFactor(e.target.value)}
                        >
                            <option value="todos">📋 Mostrar Todos los Factores</option>
                            <option value="normal">✔️ Factor Normal (1.00)</option>
                            <option value="modificado">⚠️ Factor Cambiado (≠ 1.00)</option>
                        </select>
                    </div>

                    <button style={s.btnPr} onClick={abrirModalCrear}>
                        + Crear Mano de Obra
                    </button>
                </div>

                {/* SELECTOR DE COLUMNAS ACTIVAS (Mejora 1) */}
                <div style={{ marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>
                    Categorías Visibles (Tildá para mostrar más columnas):
                </div>
                <div style={s.checkboxContainer}>
                    {categoriasArray.map(n => (
                        <label key={n} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', cursor: 'pointer', background: columnasVisibles[n] ? '#e0f2fe' : '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <input 
                                type="checkbox" 
                                checked={columnasVisibles[n]} 
                                onChange={() => toggleColumna(n)}
                            />
                            Cat {n}
                        </label>
                    ))}
                </div>

                {/* TABLA PRINCIPAL */}
                {cargando ? (
                    <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando servicios...</p>
                ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{...s.th, textAlign: 'left', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 3, borderRight: '1px solid #cbd5e1'}}>Cód.</th>
                                    <th style={{...s.th, textAlign: 'left', position: 'sticky', left: '60px', background: '#f8fafc', zIndex: 3, borderRight: '2px solid #cbd5e1'}}>Servicio</th>
                                    
                                    {/* COLUMNA FACTOR: Ahora al principio (Mejora 2) */}
                                    <th style={{...s.th, background: '#fef3c7', color: '#b45309', fontWeight: 'bold', minWidth: '90px'}}>Factor</th>
                                    
                                    {/* Mapeamos las categorías que estén marcadas como visibles */}
                                    {categoriasArray.map(n => columnasVisibles[n] && (
                                        <th key={n} style={s.th}>Cat {n}</th>
                                    ))}
                                    
                                    <th style={s.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaFiltrada.map(mo => {
                                    const tieneFactorModificado = Number(mo.factor ?? 1) !== 1;
                                    return (
                                        <tr key={mo.codigo_mo} style={{ backgroundColor: tieneFactorModificado ? '#fffbeb' : '#fff' }}>
                                            <td style={{...s.td, textAlign: 'left', fontWeight: 'bold', position: 'sticky', left: 0, backgroundColor: tieneFactorModificado ? '#fef3c7' : '#fff', zIndex: 1, borderRight: '1px solid #cbd5e1'}}>{mo.codigo_mo}</td>
                                            <td style={{...s.td, textAlign: 'left', position: 'sticky', left: '60px', backgroundColor: tieneFactorModificado ? '#fffbeb' : '#fff', zIndex: 1, borderRight: '2px solid #cbd5e1', whiteSpace: 'normal', minWidth: '250px'}}>{mo.servicio}</td>
                                            
                                            {/* CELDA EDITABLE DEL FACTOR (AL PRINCIPIO) */}
                                            <td style={{...s.td, fontWeight: 'bold', backgroundColor: tieneFactorModificado ? '#fde68a' : '#f8fafc', color: tieneFactorModificado ? '#b45309' : '#000'}}>
                                                {editFactorId === mo.codigo_mo ? (
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        style={{ ...s.input, width: '75px', padding: '4px', textAlign: 'center' }}
                                                        value={editFactorValue}
                                                        onChange={e => setEditFactorValue(e.target.value)}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    mo.factor !== null ? Number(mo.factor).toFixed(2) : '1.00'
                                                )}
                                            </td>

                                            {/* Mapeamos los precios de las categorías si están visibles */}
                                            {categoriasArray.map(n => columnasVisibles[n] && (
                                                <td key={n} style={s.td}>$ {formatDinero(mo[`cat_${n}`])}</td>
                                            ))}

                                            {/* ACCIONES (Editar Factor Inline) */}
                                            <td style={s.td}>
                                                {editFactorId === mo.codigo_mo ? (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Guardar" onClick={() => guardarFactor(mo.codigo_mo)}>💾</span>
                                                        <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Cancelar" onClick={() => setEditFactorId(null)}>❌</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Editar Factor" onClick={() => iniciarEdicionFactor(mo)}>✏️</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {listaFiltrada.length === 0 && (
                                    <tr><td colSpan="17" style={{...s.td, textAlign: 'center', padding: '20px', color: '#64748b'}}>No se encontraron servicios con los filtros aplicados.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE CREACIÓN */}
            {mostrarModal && (
                <div style={s.modalOverlay}>
                    <div style={s.modalContent}>
                        <h2 style={{ marginTop: 0, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            ✨ Crear Nuevo Servicio
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={s.label}>Código *</label>
                                    <input type="number" style={s.input} value={formData.codigo_mo} onChange={e => setFormData({...formData, codigo_mo: e.target.value})} />
                                    <span style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '3px', fontStyle: 'italic' }}>
                                        *Sugerido: {codigoSugerido}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label style={s.label}>Descripción del Servicio *</label>
                                <input type="text" style={s.input} value={formData.servicio} onChange={e => setFormData({...formData, servicio: e.target.value})} />
                            </div>
                            <div>
                                <label style={s.label}>Factor Múltiplo</label>
                                <input type="number" step="0.01" style={s.input} value={formData.factor} onChange={e => setFormData({...formData, factor: e.target.value})} />
                            </div>
                        </div>

                        <h4 style={{ color: '#475569', marginBottom: '10px' }}>Precios por Categoría</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '25px' }}>
                            {categoriasArray.map(n => (
                                <div key={n}>
                                    <label style={s.label}>Cat {n} ($)</label>
                                    <input 
                                        type="number" 
                                        step="any" 
                                        style={s.input} 
                                        value={formData[`cat_${n}`]} 
                                        onChange={e => setFormData({...formData, [`cat_${n}`]: e.target.value})} 
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                            <button style={s.btnSec} onClick={() => setMostrarModal(false)}>Cancelar</button>
                            <button style={s.btnPr} onClick={handleCrear}>💾 Guardar Servicio</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Mano_de_Obra;