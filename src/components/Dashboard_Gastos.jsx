import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboad_Gastos() {
    const [gastos, setGastos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Filtros Propios del Dashboard
    const [añoFiltro, setAñoFiltro] = useState(new Date().getFullYear().toString());
    const [mesFiltro, setMesFiltro] = useState('TODOS');
    const [catFiltroTendencia, setCatFiltroTendencia] = useState('Repuestos'); // Categoría para el gráfico de barras

    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const COLORS = ['#0284c7', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

    useEffect(() => {
        cargarGastosDashboard();
    }, []);

    const cargarGastosDashboard = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('bd_caja_gastos')
            .select('*')
            .order('fecha', { ascending: true }); // Ascendente para calcular bien las tendencias en el tiempo

        if (error) {
            console.error("Error cargando gastos en dashboard:", error);
        } else {
            setGastos(data || []);
        }
        setCargando(false);
    };

    // 1. LÓGICA DE FILTRADO INTERNA
    const filtrarGastos = (lista) => {
        return lista.filter(item => {
            if (!item.fecha) return false;
            const fecha = new Date(item.fecha);
            const añoCoincide = (añoFiltro === 'TODOS' || fecha.getFullYear().toString() === añoFiltro);
            const mesCoincide = (mesFiltro === 'TODOS' || (fecha.getMonth() + 1).toString() === mesFiltro);
            return añoCoincide && mesCoincide;
        });
    };

    const gastosFiltrados = filtrarGastos(gastos);

    // 2. PROCESAMIENTO: DATOS PARA EL GRÁFICO DE TORTA (Categorías del año/mes seleccionado)
    const agruparPorCategoria = () => {
        const grupos = gastosFiltrados.reduce((acc, g) => {
            const cat = g.categoria || 'Otros';
            acc[cat] = (acc[cat] || 0) + Number(g.importe || 0);
            return acc;
        }, {});

        return Object.keys(grupos).map(key => ({
            name: key,
            value: Math.round(grupos[key])
        }));
    };

    const datosTorta = agruparPorCategoria();

    // 3. PROCESAMIENTO: TENDENCIA ÚLTIMOS 3 MESES (Para una categoría específica, sin importar el mesFiltro principal)
    const generarDatosTendencia = () => {
        // Obtenemos los últimos 3 meses reales del calendario para comparar hacia atrás
        const hoy = new Date();
        const mesesAComparar = [];
        for (let i = 2; i >= 0; i--) {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            mesesAComparar.push({
                año: d.getFullYear(),
                mes: d.getMonth() + 1,
                nombre: `${nombresMeses[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
            });
        }

        // Filtramos TODOS los gastos de la categoría elegida
        const gastosCat = gastos.filter(g => (g.categoria || 'Otros') === catFiltroTendencia);

        // Sumamos lo gastado en cada uno de esos 3 meses
        return mesesAComparar.map(m => {
            const totalMes = gastosCat
                .filter(g => {
                    const f = new Date(g.fecha);
                    return f.getFullYear() === m.año && (f.getMonth() + 1) === m.mes;
                })
                .reduce((sum, g) => sum + Number(g.importe || 0), 0);

            return {
                mes: m.nombre,
                Importe: Math.round(totalMes)
            };
        });
    };

    const datosTendencia = generarDatosTendencia();

    // Obtener lista de categorías únicas para el selector de tendencia
    const categoriasUnicas = [...new Set(gastos.map(g => g.categoria || 'Otros'))];

    // Obtener años únicos para los botones pill
    const añosDisponibles = [...new Set([
        ...gastos.map(g => {
            return g.fecha ? new Date(g.fecha).getFullYear().toString() : new Date().getFullYear().toString();
        }),
        new Date().getFullYear().toString()
    ])].sort().reverse();

    if (cargando) return <p style={{ padding: '20px' }}>📊 Cargando estadísticas de gastos...</p>;

    return (
        <div style={{ padding: '10px', boxSizing: 'border-box' }}>
            
            {/* SECCIÓN DE FILTROS INTERNOS DEL DASHBOARD */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                
                
                {/* Selector de Año */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => setAñoFiltro('TODOS')}
                        style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem',
                        background: añoFiltro === 'TODOS' ? '#0284c7' : '#e2e8f0', color: añoFiltro === 'TODOS' ? 'white' : '#64748b' }}>TODOS</button>
                    {añosDisponibles.map(anio => (
                        <button key={anio} onClick={() => setAñoFiltro(anio)}
                            style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem',
                            background: añoFiltro === anio ? '#0284c7' : '#e2e8f0', color: añoFiltro === anio ? 'white' : '#64748b' }}>{anio}</button>
                    ))}
                </div>

                {/* Selector de Mes */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <button onClick={() => setMesFiltro('TODOS')}
                        style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                        background: mesFiltro === 'TODOS' ? '#0369a1' : '#e2e8f0', color: mesFiltro === 'TODOS' ? 'white' : '#64748b' }}>TODOS LOS MESES</button>
                    {nombresMeses.map((mes, index) => (
                        <button key={mes} onClick={() => setMesFiltro((index + 1).toString())}
                            style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                            background: mesFiltro === (index + 1).toString() ? '#0369a1' : '#e2e8f0', color: mesFiltro === (index + 1).toString() ? 'white' : '#64748b' }}>{mes}</button>
                    ))}
                </div>
            </div>

            {/* CONTENEDOR DE GRÁFICOS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* GRÁFICO 1: TORTA - GASTOS POR CATEGORÍA */}
                <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#1e293b' }}>Repartición de Gastos</h3>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Monto total acumulado según los filtros activos</p>
                    <div style={{ height: '300px', width: '100%' }}>
                        {datosTorta.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '100px' }}>No hay gastos registrados en este período.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={datosTorta} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                                        {datosTorta.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`$ ${new Intl.NumberFormat('es-AR').format(value)}`, 'Total']} />
                                    <Legend verticalAlign="bottom" iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* GRÁFICO 2: BARRAS - TENDENCIA DE UNA CATEGORÍA */}
                <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Tendencia Reciente (3 Meses)</h3>
                        <select 
                            value={catFiltroTendencia} 
                            onChange={e => setCatFiltroTendencia(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                            {categoriasUnicas.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>Comparativa de gasto mensual para la categoría seleccionada</p>
                    
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={datosTendencia} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip formatter={(value) => [`$ ${new Intl.NumberFormat('es-AR').format(value)}`, 'Gastado']} />
                                <Bar dataKey="Importe" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Dashboad_Gastos;