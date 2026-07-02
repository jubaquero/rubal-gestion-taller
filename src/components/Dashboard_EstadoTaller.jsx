import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

function Dashboard_EstadoTaller() {
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [cargando, setCargando] = useState(false);
    const [stats, setStats] = useState({ pendientes: 0, terminados: 0, promedioDias: 0 });
    const [dataEstados, setDataEstados] = useState([]);
    const [rankingServicios, setRankingServicios] = useState([]);
    const [rankingRepuestos, setRankingRepuestos] = useState([]);

    const COLORS = ['#f59e0b', '#16a34a']; // Amarillo para Pendiente, Verde para Terminado

    useEffect(() => {
        cargarDatos();
    }, [anio]);

    const cargarDatos = async () => {
        setCargando(true);
        const inicioAnio = `${anio}-01-01`;
        const finAnio = `${anio}-12-31`;

        // 1. Buscamos primero los IDs de los trabajos del año seleccionado
        const { data: trabajos } = await supabase
            .from('bd_trabajos')
            .select('id, estado, fecha_inicio, fecha_fin')
            .gte('fecha_inicio', inicioAnio)
            .lte('fecha_inicio', finAnio);

        const idsTrabajos = trabajos?.map(t => t.id) || [];

        // 2. KPIs y Estados
        const pendientes = trabajos?.filter(t => t.estado === 'PENDIENTE').length || 0;
        const terminados = trabajos?.filter(t => t.estado === 'TERMINADO').length || 0;

        const terminadosConFecha = trabajos?.filter(t => t.estado === 'TERMINADO' && t.fecha_fin && t.fecha_inicio);
        const totalDias = terminadosConFecha?.reduce((sum, t) => {
            const diff = new Date(t.fecha_fin) - new Date(t.fecha_inicio);
            return sum + (diff / (1000 * 60 * 60 * 24));
        }, 0) || 0;

        setStats({
            pendientes,
            terminados,
            promedioDias: terminadosConFecha?.length ? (totalDias / terminadosConFecha.length).toFixed(1) : 0
        });

        setDataEstados([
            { name: 'Pendientes', value: pendientes },
            { name: 'Terminados', value: terminados }
        ]);

        // 3. Ranking Servicios (filtrando por los IDs obtenidos)
        if (idsTrabajos.length > 0) {
            const { data: servs } = await supabase.from('bd_trabajos_mo')
                .select('bd_mo(servicio)')
                .in('id_trabajo', idsTrabajos); // Filtramos por IDs de trabajos del año

            const mapServs = servs?.reduce((acc, s) => {
                const nombre = s.bd_mo?.servicio || 'Otros';
                acc[nombre] = (acc[nombre] || 0) + 1;
                return acc;
            }, {});
            setRankingServicios(Object.entries(mapServs || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));


          // 4. Ranking Repuestos (filtrando por los IDs obtenidos y sumando cantidades)
if (idsTrabajos.length > 0) {
    const { data: prods } = await supabase
        .from('bd_trabajos_p')
        .select('cantidad, bd_productos(codigo, modelo_auto, bd_tipos_producto(nombre))')
        .in('id_trabajo', idsTrabajos);
        
    const mapProds = prods?.reduce((acc, p) => {
        const prod = p.bd_productos;
        const nombre = `${prod?.bd_tipos_producto?.nombre || 'Genérico'} - ${prod?.codigo || 'N/A'} (${prod?.modelo_auto || 'S/M'})`;
        
        // AQUÍ ESTÁ EL CAMBIO: sumamos la cantidad real (o 1 si es null)
        const cantidadUsada = p.cantidad || 1; 
        acc[nombre] = (acc[nombre] || 0) + cantidadUsada;
        
        return acc;
    }, {});
    
    setRankingRepuestos(
        Object.entries(mapProds || {})
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
    );
}
        } else {
            setRankingServicios([]);
            setRankingRepuestos([]);
        }

        setCargando(false);
    };

    const cardStyle = (color) => ({ display: 'flex', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: `6px solid ${color}`, marginBottom: '20px' });
    const valStyle = { fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', margin: 0 };

    return (
        <div style={{ padding: '25px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>🚥 Indicadores Año: {anio}</h2>

<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>Año:</span>
    <select value={anio} onChange={(e) => setAnio(e.target.value)} style={{ padding: '10px', borderRadius: '8px', fontSize: '1.1rem' }}>
        {[2023, 2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
    </select>
</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={cardStyle('#f59e0b')}><div><h4 style={{ margin: 0, color: '#64748b' }}>Pendientes</h4><p style={valStyle}>{stats.pendientes}</p></div></div>
                <div style={cardStyle('#16a34a')}><div><h4 style={{ margin: 0, color: '#64748b' }}>Terminados</h4><p style={valStyle}>{stats.terminados}</p></div></div>
                <div style={cardStyle('#3b82f6')}><div><h4 style={{ margin: 0, color: '#64748b' }}>Prom. Demora (Días)</h4><p style={valStyle}>{stats.promedioDias}</p></div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
                    <h3>Estado de los trabajos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart><Pie data={dataEstados} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label><Cell fill="#f59e0b" /><Cell fill="#16a34a" /></Pie><Tooltip /><Legend /></PieChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
                    <h3>Top 5 Servicios Más Frecuentes</h3>
                    {rankingServicios.map((s, i) => (
                        <div key={i} style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                                <span>{s.name}</span><span style={{ fontWeight: 'bold' }}>{s.count}</span>
                            </div>
                            <div style={{ background: '#eee', height: '6px', borderRadius: '3px' }}>
                                <div style={{ background: '#3b82f6', height: '100%', width: `${(s.count / (rankingServicios[0]?.count || 1)) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

<div style={{ 
    background: '#ffffff', 
    padding: '25px', 
    borderRadius: '16px', 
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9'
}}>
    <h3 style={{ marginTop: 0, marginBottom: '25px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
        ⚙️ Repuestos más utilizados
    </h3>
    
    {rankingRepuestos.length > 0 ? (
        rankingRepuestos.map((r, i) => {
            const porcentaje = (r.count / rankingRepuestos[0].count) * 100;
            return (
                <div key={i} style={{ marginBottom: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.95rem', color: '#475569', fontWeight: '500' }}>
                            <span style={{ 
                                display: 'inline-block', 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '6px', 
                                background: '#eff6ff', 
                                color: '#2563eb', 
                                textAlign: 'center', 
                                marginRight: '12px',
                                fontSize: '0.8rem',
                                lineHeight: '24px',
                                fontWeight: 'bold'
                            }}>
                                {i + 1}
                            </span>
                            {r.name}
                        </span>
                        <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>
                            {r.count} <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'normal' }}>unidades</span>
                        </span>
                    </div>
                    
                    {/* Barra de progreso moderna */}
                    <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                            background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)', 
                            height: '100%', 
                            width: `${porcentaje}%`,
                            borderRadius: '4px',
                            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} />
                    </div>
                </div>
            );
        })
    ) : (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No hay datos suficientes para mostrar.</p>
    )}
</div>
        </div>
    );
}

export default Dashboard_EstadoTaller;