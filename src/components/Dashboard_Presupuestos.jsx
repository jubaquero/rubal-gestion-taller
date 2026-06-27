import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

function Dashboard_Presupuestos() {
    const [anio, setAnio] = useState(new Date().getFullYear());
    const [cargando, setCargando] = useState(false);
    const [kpis, setKpis] = useState({ totalFacturado: 0, totalMO: 0, totalBonif: 0, cantidad: 0 });
    const [dataTorta, setDataTorta] = useState([]);
    const [rankingClientes, setRankingClientes] = useState([]);

    const COLORS = ['#16a34a', '#eab308', '#dc2626'];

    useEffect(() => {
        cargarDatos(anio);
    }, [anio]);

    const cargarDatos = async (anioSel) => {
        setCargando(true);

        // 1. Traer solo los APROBADOS para los KPIs financieros
        const { data: aprobados } = await supabase
            .from('bd_presupuestos')
            .select(`
                id, total_presupuesto_con_iva, subtotal_con_iva, 
                descuento_porcentaje, descuento_porcentaje_mo, 
                bd_clientes(nombre, apellido)
            `)
            .eq('estado', 'APROBADO')
            .gte('fecha_presupuesto', `${anioSel}-01-01`)
            .lte('fecha_presupuesto', `${anioSel}-12-31`);

        // 2. Traer TODAS las manos de obra de esos presupuestos aprobados
        const idsAprobados = aprobados?.map(p => p.id) || [];
        let totalMO = 0;
        let bonifMO = 0;

        if (idsAprobados.length > 0) {
            const { data: itemsMO } = await supabase
                .from('bd_presupuestos_mo')
                .select('precio_total, id_presupuesto')
                .in('id_presupuesto', idsAprobados);

            // Sumamos todo
            totalMO = itemsMO?.reduce((sum, item) => sum + item.precio_total, 0) || 0;

            // Calculamos bonificación MO (basado en el % de cada presupuesto padre)
            bonifMO = aprobados.reduce((sum, p) => {
                const moDelPresupuesto = itemsMO?.filter(i => i.id_presupuesto === p.id).reduce((s, i) => s + i.precio_total, 0) || 0;
                return sum + (moDelPresupuesto * (p.descuento_porcentaje_mo || 0) / 100);
            }, 0);
        }

        // 3. Totales generales para KPIs
        const totalFacturado = aprobados?.reduce((sum, p) => sum + (p.total_presupuesto_con_iva || 0), 0) || 0;
        const bonifGen = aprobados?.reduce((sum, p) => sum + ((p.subtotal_con_iva || 0) * (p.descuento_porcentaje || 0) / 100), 0) || 0;

        setKpis({ totalFacturado, totalMO, totalBonif: bonifMO + bonifGen, cantidad: aprobados?.length || 0 });

        // 4. Datos para Torta (Todos los presupuestos del año, sin filtro APROBADO)
        const { data: todos } = await supabase
            .from('bd_presupuestos')
            .select('estado')
            .gte('fecha_presupuesto', `${anioSel}-01-01`)
            .lte('fecha_presupuesto', `${anioSel}-12-31`);

        const conteo = todos?.reduce((acc, p) => {
            acc[p.estado] = (acc[p.estado] || 0) + 1;
            return acc;
        }, {});
        setDataTorta([
            { name: 'Aprobados', value: conteo['APROBADO'] || 0 },
            { name: 'Pendientes', value: conteo['PENDIENTE'] || 0 },
            { name: 'Rechazados', value: conteo['RECHAZADO'] || 0 },
        ]);

        // 5. Ranking Clientes
        const ranking = aprobados?.reduce((acc, p) => {
            const nombre = `${p.bd_clientes?.nombre || ''} ${p.bd_clientes?.apellido || ''}`.trim();
            if (nombre) acc[nombre] = (acc[nombre] || 0) + 1;
            return acc;
        }, {});
        setRankingClientes(Object.entries(ranking || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5));

        setCargando(false);
    };

    const cardStyle = (color) => ({
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderLeft: `6px solid ${color}`, // ESTA ES LA BANDA DE COLOR
        marginBottom: '20px'
    });
    const valStyle = { fontSize: '1.4rem', fontWeight: '800', margin: '5px 0 0 0', color: '#1e293b' };

    return (
        <div style={{ padding: '25px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#fff', padding: '20px', borderRadius: '12px' }}>
                <h2 style={{ margin: 0 }}>📊 Presupuestos {anio}</h2>
                <select value={anio} onChange={(e) => setAnio(e.target.value)} style={{ padding: '10px', borderRadius: '8px', fontSize: '1.1rem' }}>
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>

                <div style={cardStyle('#000000')}> {/* Verde */}
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '1rem' }}>Total $ (Aprobados)</h4>
                        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>${kpis.totalFacturado.toLocaleString()}</p>
                    </div>
                </div>

                <div style={cardStyle('#d8bc3e')}> {/* Azul */}
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '1rem' }}>Total Mano de Obra</h4>
                        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>${kpis.totalMO.toLocaleString()}</p>
                    </div>
                </div>

                <div style={cardStyle('#ea0808')}> {/* Amarillo */}
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '1rem' }}>Bonificaciones</h4>
                        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>-${kpis.totalBonif.toLocaleString()}</p>
                    </div>
                </div>

                <div style={cardStyle('#6bb838')}> {/* Gris */}
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '1rem' }}>Aprobados</h4>
                        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>{kpis.cantidad} </p>
                    </div>
                </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
                    <h3>Estados ({anio})</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart><Pie data={dataTorta} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{dataTorta.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
                    {/* Top 5 Clientes Moderno */}
                    <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>🏆 Top 5 Clientes ({anio})</h3>

                        {rankingClientes.length > 0 ? (
                            rankingClientes.map((c, i) => {
                                // Calculamos un porcentaje para la barrita (relativo al 1ro del ranking)
                                const porcentaje = (c.count / rankingClientes[0].count) * 100;

                                return (
                                    <div key={i} style={{ marginBottom: '18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '600', color: '#334155' }}>
                                                <span style={{ marginRight: '10px', color: '#94a3b8' }}>{`0${i + 1}`.slice(-2)}</span>
                                                {c.name}
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{c.count} aprobados</span>
                                        </div>
                                        {/* Barra de progreso de ranking */}
                                        <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                background: `linear-gradient(90deg, #3b82f6 ${porcentaje}%, #e2e8f0 ${porcentaje}%)`,
                                                height: '100%',
                                                borderRadius: '4px',
                                                transition: 'width 0.5s ease-out'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No hay presupuestos aprobados registrados.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard_Presupuestos;