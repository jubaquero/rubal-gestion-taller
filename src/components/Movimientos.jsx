import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Movimientos() {
    const [tipos, setTipos] = useState([]);
    const [productosDB, setProductosDB] = useState([]);
    const [productos, setProductos] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);
    const [movimientosProducto, setMovimientosProducto] = useState([]);

    const [tipoSeleccionado, setTipoSeleccionado] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Modales de control
    const [modalOperacion, setModalOperacion] = useState(null); // { producto, operacion: 'ingreso' | 'egreso' }
    const [modalHistorial, setModalHistorial] = useState(null); // { producto }
    const [modalEditarMov, setModalEditarMov] = useState(null); // { movimiento, cantidad, id_almacen, comentario }

    const [almacenesFiltradosEgreso, setAlmacenesFiltradosEgreso] = useState([]);
const [almacenesDelProducto, setAlmacenesDelProducto] = useState([]);

    // ESTILOS PREMIUM CONCORDANTES CON LA IDENTIDAD DE RUBAL
    const s = {
        card: { background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1350px', margin: '0 auto', overflowX: 'auto' },
        topBar: { display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
        select: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', minWidth: '250px', backgroundColor: '#fff' },
        inputBusqueda: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '320px', fontSize: '1rem' },

        tabla: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', tableLayout: 'fixed', fontSize: '0.95rem' },
        th: { background: '#f1f5f9', padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 'bold', color: '#1e293b' },
        tr: { borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' },
        td: { padding: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
        acciones: { display: 'flex', gap: '18px', alignItems: 'center', justifyContent: 'center' },

        // Capa de fondo oscuro para modales reales
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
        modalContenedor: { background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', width: '100%', maxWidth: '550px', position: 'relative' },
        modalAncho: { background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', width: '100%', maxWidth: '900px', position: 'relative', maxHeight: '85vh', overflowY: 'auto' },

        formFila: { display: 'flex', alignItems: 'center', marginBottom: '15px' },
        formLabel: { width: '140px', fontWeight: 'bold', color: '#334155', fontSize: '0.95rem' },
        formInput: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' },

        btnGrabar: { background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
        btnCancelar: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px', fontSize: '1rem' },

        alertaInfo: { background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px', color: '#475569' }
    };

    useEffect(() => {
        fetchTipos();
        fetchAlmacenes();
    }, []);

    useEffect(() => {
        if (tipoSeleccionado) {
            fetchProductos();
        } else {
            setProductosDB([]);
            setProductos([]);
        }
    }, [tipoSeleccionado]);

    // Filtro de búsqueda amplio en tiempo real
    useEffect(() => {
        if (!busqueda) {
            setProductos(productosDB);
        } else {
            const t = busqueda.toLowerCase();
            const filtrados = productosDB.filter(p =>
                (p.codigo || '').toLowerCase().includes(t) ||
                (p.modelo_auto || '').toLowerCase().includes(t) ||
                (p.descripcion || '').toLowerCase().includes(t) ||
                (p.codigo_fabricante || '').toLowerCase().includes(t) ||
                (p.medida || '').toLowerCase().includes(t) ||
                (p.bd_marcas?.nombre || '').toLowerCase().includes(t)
            );
            setProductos(filtrados);
        }
    }, [busqueda, productosDB]);

    const fetchTipos = async () => { const { data } = await supabase.from('bd_tipos_producto').select('*').order('nombre'); setTipos(data || []); };
    const fetchAlmacenes = async () => { const { data } = await supabase.from('bd_almacenes').select('*').order('nombre'); setAlmacenes(data || []); };

    const fetchProductos = async () => {
        const { data } = await supabase
            .from('bd_productos')
            .select('*, bd_marcas(nombre)')
            .eq('id_tipo_producto', tipoSeleccionado)
            //.order('codigo');
            .order('id');
        setProductosDB(data || []);
        setProductos(data || []);
    };

    const fetchMovimientosProducto = async (idProducto) => {
        const { data } = await supabase
            .from('bd_movimientos')
            .select('*, bd_almacenes(nombre)')
            .eq('id_producto', idProducto)
            .order('fecha', { ascending: false });
        setMovimientosProducto(data || []);
    };

    // REGISTRAR NUEVO MOVIMIENTO (INGRESO / EGRESO)
    // REGISTRAR NUEVO MOVIMIENTO (INGRESO / EGRESO)
    const handleCrearMovimiento = async (e) => {
        e.preventDefault();
        const cantForm = Number(e.target.cantidad.value);
        const idAlmacen = e.target.almacen.value;
        const comentario = e.target.comentario.value;

        // 🛑 VALIDACIÓN DE STOCK PARA EGRESOS
        if (modalOperacion.operacion === 'egreso') {
            const stockDisponible = modalOperacion.producto.stock_actual || 0;

            if (cantForm > stockDisponible) {
                return alert(`⚠️ ACCIÓN DENEGADA: Estás intentando extraer ${cantForm} unidades, pero solo hay ${stockDisponible} en stock. Por favor, verificá la cantidad.`);
            }
        }

        // Si la operación es un egreso, forzamos el valor matemático a negativo
        const cantidadFinal = modalOperacion.operacion === 'egreso' ? -Math.abs(cantForm) : Math.abs(cantForm);

        await supabase.from('bd_movimientos').insert([{
            id_producto: modalOperacion.producto.id,
            id_almacen: idAlmacen,
            cantidad: cantidadFinal,
            tipo_movimiento: modalOperacion.operacion === 'ingreso' ? 'Entrada' : 'Salida',
            fecha: new Date().toISOString(),
            comentario: comentario
        }]);

        setModalOperacion(null);
        fetchProductos(); // El trigger en DB reajustará automáticamente el stock_actual
    };

    // ABRIR EL HISTORIAL ESPECÍFICO DESDE LA ACCIÓN OJO
    const handleAbrirHistorial = async (p) => {
        setModalHistorial({ producto: p });
        await fetchMovimientosProducto(p.id);
    };

    // ELIMINAR UN MOVIMIENTO ERRÓNEO
    const handleEliminarMovimiento = async (mov) => {
        if (confirm("⚠️ ¿Estás seguro de eliminar este movimiento? El stock del repuesto se recalculará automáticamente.")) {
            await supabase.from('bd_movimientos').delete().eq('id', mov.id);
            await fetchMovimientosProducto(modalHistorial.producto.id);
            fetchProductos();
        }
    };


    // GUARDAR EDICIÓN DE UN MOVIMIENTO EXISTENTE
    const handleGuardarEdicionMovimiento = async (e) => {
        e.preventDefault();
        const cantForm = Number(modalEditarMov.cantidad);

        // Mantener consistencia del signo original del movimiento
        const cantidadFinal = modalEditarMov.movimiento.cantidad < 0 ? -Math.abs(cantForm) : Math.abs(cantForm);

        // 🛑 VALIDACIÓN DE STOCK PARA EDICIONES (Bloqueo de negativos)
        // Calculamos cuánto afecta este cambio al stock actual
        const diferencia = cantidadFinal - modalEditarMov.movimiento.cantidad;
        const stockActual = modalHistorial.producto.stock_actual || 0;
        const stockProyectado = stockActual + diferencia;

        if (stockProyectado < 0) {
            return alert(`⚠️ ACCIÓN DENEGADA: Estás intentando sacar más de lo que hay. Esta edición dejaría el stock en negativo (${stockProyectado}). Stock actual disponible: ${stockActual}.`);
        }

        // Si pasa la validación, actualizamos en la base de datos
        await supabase.from('bd_movimientos').update({
            cantidad: cantidadFinal,
            id_almacen: modalEditarMov.id_almacen,
            comentario: modalEditarMov.comentario
        }).eq('id', modalEditarMov.movimiento.id);

        setModalEditarMov(null);
        await fetchMovimientosProducto(modalHistorial.producto.id);
        fetchProductos(); // Refrescamos todo para que React muestre el nuevo stock
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <div style={s.card}>
                <h2>🔄 Historial de Movimientos</h2>

                {/* BARRA SUPERIOR DE SELECTOR Y BUSQUEDA */}
                <div style={s.topBar}>
                    <select
                        value={tipoSeleccionado}
                        onChange={(e) => setTipoSeleccionado(e.target.value)}
                        style={s.select}
                    >
                        <option value="">-- Seleccione Tipo de Producto (Obligatorio) --</option>
                        {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>

                    {tipoSeleccionado && (
                        <input
                            type="text"
                            placeholder="🔍 Filtrar por código, marca, modelo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={s.inputBusqueda}
                        />
                    )}
                </div>

                {/* TABLA DE PRODUCTOS FILTRADOS */}
                {tipoSeleccionado ? (
                    <table style={s.tabla}>
                        <thead>
                            <tr>
                                <th style={{ ...s.th, width: '10%' }}>Código</th>
                                <th style={{ ...s.th, width: '48%' }}>Modelo Auto</th>
                                <th style={{ ...s.th, width: '15%' }}>Marca</th>
                                <th style={{ ...s.th, width: '14%' }}>Cód. Fab</th>
                                <th style={{ ...s.th, width: '18%' }}>Medida</th>
                                <th style={{ ...s.th, width: '8%', textAlign: 'center' }}>Stock</th>
                                <th style={{ ...s.th, width: '16%', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No se encontraron productos para este criterio.</td></tr>
                            ) : (
                                productos.map(p => (
                                    <tr key={p.id} style={s.tr}>
                                        <td style={s.td} title={p.codigo}>{p.codigo}</td>
                                        <td style={s.td} title={p.modelo_auto}>{p.modelo_auto || '-'}</td>
                                        <td style={s.td} title={p.bd_marcas?.nombre}>{p.bd_marcas?.nombre || '-'}</td>
                                        <td style={s.td} title={p.codigo_fabricante}>{p.codigo_fabricante || '-'}</td>
                                        <td style={s.td} title={p.medida}>{p.medida || '-'}</td>
                                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 'bold', color: (p.stock_actual || 0) > 0 ? '#16a34a' : '#dc2626' }}>
                                            {p.stock_actual || 0}
                                        </td>

<td style={s.td}>
                      <div style={s.acciones}>
                        {/* BOTÓN INGRESO (➕) - AHORA TAMBIÉN BUSCA HISTORIAL */}
                        <span 
                          title="Ingreso Stock" 
                          onClick={async () => {
                            const { data } = await supabase
                              .from('bd_movimientos')
                              .select('id_almacen, bd_almacenes(nombre)')
                              .eq('id_producto', p.id);

                            const mapaAlmacenes = new Map();
                            (data || []).forEach(m => {
                              if (m.id_almacen && m.bd_almacenes) {
                                mapaAlmacenes.set(m.id_almacen, { id: m.id_almacen, nombre: m.bd_almacenes.nombre });
                              }
                            });
                            setAlmacenesDelProducto(Array.from(mapaAlmacenes.values()));
                            setModalOperacion({ producto: p, operacion: 'ingreso' });
                          }} 
                          style={{ cursor: 'pointer', fontSize: '1.0rem' }}
                        >➕</span>

                        {/* BOTÓN EGRESO (➖) */}
                        <span 
                          title="Egreso Stock" 
                          onClick={async () => {
                            const { data } = await supabase
                              .from('bd_movimientos')
                              .select('id_almacen, bd_almacenes(nombre)')
                              .eq('id_producto', p.id);

                            const mapaAlmacenes = new Map();
                            (data || []).forEach(m => {
                              if (m.id_almacen && m.bd_almacenes) {
                                mapaAlmacenes.set(m.id_almacen, { id: m.id_almacen, nombre: m.bd_almacenes.nombre });
                              }
                            });
                            setAlmacenesDelProducto(Array.from(mapaAlmacenes.values()));
                            setModalOperacion({ producto: p, operacion: 'egreso' });
                          }} 
                          style={{ cursor: 'pointer', fontSize: '1.0rem' }}
                        >➖</span>

                        <span title="Ver Movimientos / Auditar" onClick={() => handleAbrirHistorial(p)} style={{ cursor: 'pointer', fontSize: '1.0rem' }}>👁️</span>
                      </div>
                    </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        💡 Por favor, elija un tipo de repuesto arriba para desplegar el catálogo y realizar movimientos.
                    </div>
                )}
            </div>

            {/* MODAL MODERNO DE INGRESO / EGRESO */}
            {modalOperacion && (
                <div style={s.overlay}>
                    <div style={s.modalContenedor}>
                        <h3 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            {modalOperacion.operacion === 'ingreso' ? '➕ Registrar Entrada' : '➖ Registrar Salida'}
                        </h3>
                        <div style={s.alertaInfo}>
                            <strong>Código:</strong> {modalOperacion.producto.codigo} <br />
                            <strong>Modelo:</strong> {modalOperacion.producto.modelo_auto || 'No especificado'}
                        </div>
                        <form onSubmit={handleCrearMovimiento}>
                            <div style={s.formFila}>
                                <label style={s.formLabel}>Cantidad:</label>
                                <input name="cantidad" type="number" min="1" required style={s.formInput} />
                            </div>

                            {/* ACÁ ESTÁ EL SELECT MODIFICADO */}
<div style={s.formFila}>
                <label style={s.formLabel}>Almacén:</label>
                <select name="almacen" required style={s.formInput}>
                  <option value="">-- Seleccionar Depósito --</option>
                  
                  {modalOperacion.operacion === 'egreso' ? (
                    // ➖ CASO EGRESO: Solo donde ya hay/hubo stock
                    almacenesDelProducto.length === 0 ? (
                      <option disabled value="">⚠️ Este repuesto no registra stock en ningún almacén</option>
                    ) : (
                      almacenesDelProducto.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))
                    )
                  ) : (
                    // ➕ CASO INGRESO: Inteligente con prioritarios primero
                    <>
                      {/* 1. Almacenes frecuentes/históricos */}
                      {almacenesDelProducto.map(a => (
                        <option key={`frec-${a.id}`} value={a.id} style={{ fontWeight: 'bold', color: '#1e3a8a' }}>
                          ⭐ {a.nombre} (Habitual)
                        </option>
                      ))}
                      
                      {/* Línea divisoria si hay almacenes habituales y generales */}
                      {almacenesDelProducto.length > 0 && (
                        <option disabled>──────────────────────────────</option>
                      )}
                      
                      {/* 2. El resto de los almacenes del taller (excluyendo los que ya se mostraron arriba) */}
                      {almacenes
                        .filter(almacenGral => !almacenesDelProducto.some(h => h.id === almacenGral.id))
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} {a.hay_lugar ? '' : '(Lleno)'}
                          </option>
                        ))
                      }
                    </>
                  )}
                </select>
              </div>
                            {/* FIN DEL SELECT MODIFICADO */}

                            <div style={s.formFila}>
                                <label style={s.formLabel}>Comentario:</label>
                                <input name="comentario" placeholder="Ej. Factura Nro 421 / Retiro de motor" style={s.formInput} />
                            </div>
                            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" style={s.btnGrabar}>💾 Registrar</button>
                                <button type="button" style={s.btnCancelar} onClick={() => setModalOperacion(null)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETALLE DE MOVIMIENTOS E HISTORIAL (AUDITORÍA COMPLETA) */}
            {modalHistorial && (
                <div style={s.overlay}>
                    <div style={s.modalAncho}>
                        <h3 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            📊 Historial del Producto: {modalHistorial.producto.codigo}
                        </h3>


                        <table style={s.tabla}>
<thead>
                                <tr>
                                    {/* Le sacamos un poco a Fecha, Operación y Cantidad que son datos cortos */}
                                    <th style={{ ...s.th, width: '12%' }}>Fecha</th>
                                    <th style={{ ...s.th, width: '12%' }}>Operación</th>
                                    <th style={{ ...s.th, width: '10%' }}>Cantidad</th>
                                    
                                    {/* Le damos mucho más espacio al Almacén (pasó del 20% al 32%) */}
                                    <th style={{ ...s.th, width: '32%' }}>Almacén</th>
                                    
                                    <th style={{ ...s.th, width: '22%' }}>Comentario/Detalle</th>
                                    <th style={{ ...s.th, width: '12%', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movimientosProducto.length === 0 ? (
                                    <tr><td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No se registran movimientos históricos para este producto.</td></tr>
                                ) : (
                                    movimientosProducto.map(m => (
                                        <tr key={m.id} style={s.tr}>
                                            <td style={s.td}>{new Date(m.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</td>
                                            <td style={s.td}>{m.tipo_movimiento || (m.cantidad < 0 ? 'Salida' : 'Entrada')}</td>
                                            <td style={{ ...s.td, fontWeight: 'bold', color: m.cantidad < 0 ? '#dc2626' : '#16a34a' }}>
                                                {m.cantidad}
                                            </td>
                                            <td style={{ ...s.td, whiteSpace: 'normal' }}>{m.bd_almacenes?.nombre || 'Desconocido'}</td>
                                            <td style={s.td} title={m.comentario}>{m.comentario || '-'}</td>
                                            <td style={s.td}>
                                                <div style={s.acciones}>
                                                    <span title="Corregir Movimiento" onClick={() => setModalEditarMov({ movimiento: m, cantidad: Math.abs(m.cantidad), id_almacen: m.id_almacen, comentario: m.comentario || '' })} style={{ cursor: 'pointer' }}>✏️</span>
                                                    <span title="Eliminar por error" onClick={() => handleEliminarMovimiento(m)} style={{ cursor: 'pointer' }}>🗑️</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" style={s.btnCancelar} onClick={() => setModalHistorial(null)}>Cerrar Historial</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-MODAL: FORMULARIO DE EDICIÓN PARA UN MOVIMIENTO ESPECÍFICO */}
            {modalEditarMov && (
                <div style={{ ...s.overlay, zIndex: 1100 }}>
                    <div style={s.modalContenedor}>
                        <h3 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            ✏️ Corregir Registro de Movimiento
                        </h3>
                        <form onSubmit={handleGuardarEdicionMovimiento}>
                            <div style={s.formFila}>
                                <label style={s.formLabel}>Cantidad:</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={modalEditarMov.cantidad}
                                    onChange={e => setModalEditarMov({ ...modalEditarMov, cantidad: e.target.value })}
                                    style={s.formInput}
                                />
                            </div>
                            <div style={s.formFila}>
                                <label style={s.formLabel}>Almacén:</label>
                                <select
                                    value={modalEditarMov.id_almacen}
                                    onChange={e => setModalEditarMov({ ...modalEditarMov, id_almacen: e.target.value })}
                                    required
                                    style={s.formInput}
                                >
                                    {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                            </div>
                            <div style={s.formFila}>
                                <label style={s.formLabel}>Comentario:</label>
                                <input
                                    value={modalEditarMov.comentario}
                                    onChange={e => setModalEditarMov({ ...modalEditarMov, comentario: e.target.value })}
                                    style={s.formInput}
                                />
                            </div>
                            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" style={s.btnGrabar}>Actualizar</button>
                                <button type="button" style={s.btnCancelar} onClick={() => setModalEditarMov(null)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Movimientos;