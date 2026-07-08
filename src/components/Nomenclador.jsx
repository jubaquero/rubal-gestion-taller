import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Nomenclador() {
    const [nomencladores, setNomencladores] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('TODOS');
    const [cargando, setCargando] = useState(true);

    // Estados para el Modal de Creación
    const [mostrarModal, setMostrarModal] = useState(false);
    const initialForm = { tipo: 'MOTOR', descripcion: '', categoria_mo: 1 };
    const [formData, setFormData] = useState(initialForm);

    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
        input: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        select: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', outline: 'none', background: '#fff', cursor: 'pointer' },
        label: { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#1e293b' },
        th: { padding: '12px 15px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '2px solid #cbd5e1' },
        td: { padding: '12px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#334155' },
        btnPr: { background: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
        pillActiva: { background: '#0ea5e9', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #0ea5e9', transition: '0.2s' },
        pillInactiva: { background: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', border: '1px solid #cbd5e1', transition: '0.2s' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modalContent: { background: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }
    };

    // Tipos de motores/tapas fijos
    const tiposExistentes = ['TAPA CILINDRO', 'MOTOR ASIATICO', 'MOTOR', 'TAPA CILINDRO ASIATICA', 'POLEAS'];

    useEffect(() => { cargarDatos(); }, []);

    // FUNCIÓN PAGINADORA (Para traer los 1209+ registros salteando el límite de Supabase)
    const obtenerTodosLosRegistros = async (tabla) => {
        let todos = [];
        let inicio = 0;
        const cant = 1000;
        let hayMas = true;
        
        while (hayMas) {
            const { data, error } = await supabase
                .from(tabla)
                .select('*')
                .range(inicio, inicio + cant - 1)
                .order('id', { ascending: false }); // Los más nuevos arriba
            
            if (error) {
                console.error(`Error trayendo datos de ${tabla}:`, error);
                break;
            }
            if (data && data.length > 0) {
                todos = [...todos, ...data];
                inicio += cant;
                if (data.length < cant) hayMas = false; // Si trajo menos de 1000, ya no hay más
            } else {
                hayMas = false;
            }
        }
        return todos;
    };

    const cargarDatos = async () => {
        setCargando(true);
        const data = await obtenerTodosLosRegistros('bd_nomenclador');
        setNomencladores(data || []);
        setCargando(false);
    };

    // --- LÓGICA DE FILTRADO COMBINADO ---
    const listaFiltrada = nomencladores.filter(n => {
        // 1. Filtro por Tipo (Pill)
        const cumpleTipo = filtroTipo === 'TODOS' || n.tipo === filtroTipo;
        
        // 2. Filtro por Búsqueda de texto (ID o Descripción)
        const cumpleBusqueda = String(n.id).includes(busqueda) || 
            (n.descripcion && n.descripcion.toLowerCase().includes(busqueda.toLowerCase()));

        return cumpleTipo && cumpleBusqueda;
    });

    // --- CREACIÓN ---
    const handleCrear = async () => {
        if (!formData.descripcion || !formData.tipo || !formData.categoria_mo) {
            return alert("Por favor, complete todos los campos.");
        }

        // Armamos el paquete a guardar (SIN EL ID, porque Supabase lo genera solo de forma incremental)
        const dataToSave = {
            tipo: formData.tipo,
            descripcion: formData.descripcion.toUpperCase(), // Lo pasamos a mayúscula por prolijidad
            categoria_mo: Number(formData.categoria_mo)
        };

        const { error } = await supabase.from('bd_nomenclador').insert([dataToSave]);

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            alert("✅ Registro creado correctamente.");
            setMostrarModal(false);
            setFormData(initialForm);
            cargarDatos(); // Recargamos para ver el nuevo registro con su ID generado
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
            <div style={s.card}>
                
                {/* CABECERA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 style={{ margin: 0 }}>🗃️ Nomenclador de Motores y Tapas</h2>
                    
                    <input 
                        placeholder="🔍 Buscar por ID o Descripción..." 
                        style={{ ...s.input, width: '320px' }} 
                        value={busqueda} 
                        onChange={e => setBusqueda(e.target.value)} 
                    />

                    <button style={s.btnPr} onClick={() => setMostrarModal(true)}>
                        + Nuevo Registro
                    </button>
                </div>

                {/* FILTROS PILLS (Pastillas) */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', marginRight: '10px', alignSelf: 'center' }}>Filtro por Tipo:</span>
                    
                    <button 
                        style={filtroTipo === 'TODOS' ? s.pillActiva : s.pillInactiva} 
                        onClick={() => setFiltroTipo('TODOS')}
                    >
                        Todos
                    </button>

                    {tiposExistentes.map(tipo => (
                        <button 
                            key={tipo}
                            style={filtroTipo === tipo ? s.pillActiva : s.pillInactiva} 
                            onClick={() => setFiltroTipo(tipo)}
                        >
                            {tipo}
                        </button>
                    ))}
                </div>

                {/* TABLA DE RESULTADOS */}
                {cargando ? (
                    <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando miles de registros, espere por favor...</p>
                ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '65vh' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{...s.th, width: '80px'}}>ID</th>
                                    <th style={{...s.th, width: '220px'}}>Tipo</th>
                                    <th style={s.th}>Descripción del Motor / Tapa</th>
                                    <th style={{...s.th, textAlign: 'center', width: '150px'}}>Categoría MO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaFiltrada.map(n => (
                                    <tr key={n.id} style={{ '&:hover': { background: '#f1f5f9' } }}>
                                        <td style={{...s.td, fontWeight: 'bold', color: '#0f172a'}}>#{n.id}</td>
                                        <td style={{...s.td, fontSize: '0.85rem', color: '#64748b'}}>{n.tipo}</td>
                                        <td style={{...s.td, fontWeight: 'bold'}}>{n.descripcion}</td>
                                        <td style={{...s.td, textAlign: 'center'}}>
                                            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                                                Cat {n.categoria_mo}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {listaFiltrada.length === 0 && (
                                    <tr><td colSpan="4" style={{...s.td, textAlign: 'center', padding: '30px', color: '#64748b'}}>No se encontraron registros.</td></tr>
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
                        <h2 style={{ marginTop: 0, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '25px' }}>
                            ✨ Nuevo Motor / Tapa
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                            <div>
                                <label style={s.label}>Tipo de Componente *</label>
                                <select 
                                    style={s.select} 
                                    value={formData.tipo} 
                                    onChange={e => setFormData({...formData, tipo: e.target.value})}
                                >
                                    {tiposExistentes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={s.label}>Descripción / Modelo *</label>
                                <input 
                                    type="text" 
                                    style={s.input} 
                                    value={formData.descripcion} 
                                    onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                                    placeholder="Ej: TOYOTA HILUX 2.8..."
                                />
                            </div>

                            <div>
                                <label style={s.label}>Categoría de Mano de Obra (1 al 13) *</label>
                                <select 
                                    style={s.select} 
                                    value={formData.categoria_mo} 
                                    onChange={e => setFormData({...formData, categoria_mo: Number(e.target.value)})}
                                >
                                    {[1,2,3,4,5,6,7,8,9,10,11,12,13].map(n => (
                                        <option key={n} value={n}>Categoría {n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                                * El ID numérico se generará automáticamente.
                            </span>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={s.btnSec} onClick={() => setMostrarModal(false)}>Cancelar</button>
                                <button style={s.btnPr} onClick={handleCrear}>💾 Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Nomenclador;