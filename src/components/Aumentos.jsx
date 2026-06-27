import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Clientes.css';

function Aumentos() {
    const [porcentaje, setPorcentaje] = useState(2.0);
    const [cargando, setCargando] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [datosGrafico, setDatosGrafico] = useState([]);

    // Obtenemos mes y año actual para mostrar
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();

    useEffect(() => {
        fetchHistorial();
    }, []);

    // Efecto para actualizar el gráfico cada vez que cambia el historial
    useEffect(() => {
        generarDatosGrafico(historial);
    }, [historial]);

    const fetchHistorial = async () => {
        const { data, error } = await supabase
            .from('bd_aumentos')
            .select('*')
            .order('anio', { ascending: false })
            .order('mes', { ascending: false });

        if (error) console.error("Error al cargar historial:", error);
        else setHistorial(data || []);
    };

    const generarDatosGrafico = (datosHistorial) => {
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const datosAnioActual = datosHistorial.filter(h => Number(h.anio) === anioActual);

        const dataFormateada = mesesNombres.map((nombreMes, index) => {
            const numeroMes = index + 1;
            const aumentoDelMes = datosAnioActual.find(h => Number(h.mes) === numeroMes);
            return {
                mesNombre: nombreMes,
                porcentaje: aumentoDelMes ? parseFloat(aumentoDelMes.porcentaje_aumento) : 0
            };
        });

        setDatosGrafico(dataFormateada);
    };

    const aplicarAumento = async () => {
        if (porcentaje < 0) {
            alert("❌ El porcentaje no puede ser negativo.");
            return;
        }

        if (!confirm(`¿Confirmás aplicar un aumento del ${porcentaje}% para ${mesActual}/${anioActual}?`)) return;

        setCargando(true);
        try {
            // Validación doble en base de datos por las dudas
            const { data: existe } = await supabase
                .from('bd_aumentos')
                .select('id')
                .eq('mes', mesActual)
                .eq('anio', anioActual);

            if (existe?.length > 0) {
                alert("⚠️ Ya existe un aumento registrado para este mes.");
                setCargando(false);
                return;
            }

            const { data: registros, error: errorFetch } = await supabase.from('bd_mo').select('*');
            if (errorFetch) throw errorFetch;

            const factor = 1 + (porcentaje / 100);

            for (const reg of registros) {
                let nuevos = {};
                for (let i = 1; i <= 13; i++) {
                    if (reg[`cat_${i}`] !== null) {
                        nuevos[`cat_${i}`] = (reg[`cat_${i}`] * factor).toFixed(2);
                    }
                }

                const { error: errorUpdate } = await supabase.from('bd_mo').update(nuevos).eq('codigo_mo', reg.codigo_mo);
                if (errorUpdate) throw errorUpdate;
            }

            const { error: errorInsert } = await supabase.from('bd_aumentos').insert([{
                mes: mesActual,
                anio: anioActual,
                porcentaje_aumento: porcentaje
            }]);

            if (errorInsert) throw errorInsert;

            alert("✅ Aumento aplicado.");
            fetchHistorial(); 
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setCargando(false);
        }
    };

    // Verificamos si ya hay un aumento cargado en el historial para el mes y año en curso
    const aumentoAplicadoEsteMes = historial.find(h => Number(h.mes) === mesActual && Number(h.anio) === anioActual);

    return (
        <div className="modulo-clientes">
            <div className="seccion-contenedor">
                <h2>📈 Aplicar Aumento: {mesActual}/{anioActual}</h2>

                {/* --- LÓGICA VISUAL DE BLOQUEO --- */}
                {aumentoAplicadoEsteMes ? (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '15px', borderRadius: '8px', margin: '20px 0', fontWeight: 'bold' }}>
                        ⚠️ Ya aplicaste un aumento del {aumentoAplicadoEsteMes.porcentaje_aumento}% durante este mes. Por seguridad, no se pueden aplicar múltiples aumentos en el mismo período.
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', margin: '20px 0' }}>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            className="input-busqueda"
                            style={{ width: '100px' }}
                            value={porcentaje}
                            onChange={(e) => setPorcentaje(parseFloat(e.target.value))}
                        />
                        <button className="btn-nuevo-cliente" onClick={aplicarAumento} disabled={cargando}>
                            {cargando ? 'Procesando...' : 'Aplicar Aumento'}
                        </button>
                    </div>
                )}
                {/* -------------------------------- */}

                <h3 style={{ marginTop: '30px' }}>Evolución de Aumentos en {anioActual}</h3>
                <div style={{ width: '100%', height: '250px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                            <XAxis dataKey="mesNombre" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(tick) => `${tick}%`} />
                            <Tooltip 
                                formatter={(value) => [`${value}%`, 'Aumento']}
                                cursor={{ fill: '#e2e8f0' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="porcentaje" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <h3>Historial Completo</h3>
                <table className="tabla-moderna">
                    <thead>
                        <tr><th>Fecha</th><th>Período</th><th>Porcentaje</th></tr>
                    </thead>
                    <tbody>
                        {historial.map(h => (
                            <tr key={h.id}>
                                <td>{new Date(h.fecha_aplicacion).toLocaleDateString()}</td>
                                <td>{h.mes}/{h.anio}</td>
                                <td><span style={{fontWeight: 'bold', color: '#dc2626'}}>{h.porcentaje_aumento}%</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Aumentos;