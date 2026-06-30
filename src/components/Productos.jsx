import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Productos() {
  const [productosDB, setProductosDB] = useState([]);
  const [productos, setProductos] = useState([]);

  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [vista, setVista] = useState('listado');
  const [form, setForm] = useState({});
  const [mostrarSelectorTipo, setMostrarSelectorTipo] = useState(false);

  // ESTILOS AVANZADOS PARA CORREGIR EL ANCHO DE LA TABLA Y DAR COHERENCIA VISUAL
  const s = {
    card: { background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1250px', margin: '0 auto', overflowX: 'auto' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px' },
    inputBusqueda: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '350px', fontSize: '1rem' },
    btnPrincipal: { background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    btnSecundario: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' },

    // Mejoras de ancho y distribución en la tabla
    tabla: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', tableLayout: 'fixed', fontSize: '0.95rem' }, 
    th: { background: '#f1f5f9', padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 'bold', color: '#1e293b' },
    tr: { borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' },
    td: { padding: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, 
    acciones: { display: 'flex', gap: '14px', alignItems: 'center' },

    formFila: { display: 'flex', alignItems: 'center', marginBottom: '15px' },
    formLabel: { width: '180px', fontWeight: 'bold', color: '#334155', fontSize: '1rem' },
    formInput: { flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' },
    modalTipo: { background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' },
    destaqueTipo: { background: '#fee2e2', color: '#b91c1c', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold', display: 'inline-block', marginBottom: '20px', border: '1px solid #fca5a5' },
    badgeStock: { fontSize: '1.2rem', padding: '10px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold', display: 'inline-block', marginBottom: '20px' }
  };

  useEffect(() => {
    fetchProductos();
    fetchTipos();
    fetchMarcas();
  }, []);

  useEffect(() => {
    // 1. Filtramos primero por el TIPO de producto seleccionado
    let filtradosPorTipo = productosDB;
    if (filtroTipo !== 'TODOS') {
      filtradosPorTipo = productosDB.filter(p => p.id_tipo_producto == filtroTipo);
    }

    // 2. Si no hay búsqueda de texto, devolvemos los filtrados por tipo
    if (!busqueda) {
      setProductos(filtradosPorTipo);
    } else {
      // 3. Si hay búsqueda, cruzamos el texto PERO sobre los ya filtrados por tipo
      const termino = busqueda.toLowerCase();
      const filtradosFinales = filtradosPorTipo.filter(p =>
        (p.codigo || '').toLowerCase().includes(termino) ||
        (p.modelo_auto || '').toLowerCase().includes(termino) ||
        (p.descripcion || '').toLowerCase().includes(termino) ||
        (p.codigo_fabricante || '').toLowerCase().includes(termino) || // Busca por código fábrica
        (p.medida || '').toLowerCase().includes(termino) ||
        (p.bd_marcas?.nombre || '').toLowerCase().includes(termino) ||
        (p.bd_tipos_producto?.nombre || '').toLowerCase().includes(termino)
      );
      setProductos(filtradosFinales);
    }
  }, [busqueda, filtroTipo, productosDB]);

  // PAGINACIÓN INTELIGENTE DE FONDO
  const fetchProductos = async () => {
    let todosLosProductos = [];
    let rangoInicio = 0;
    const cantidadPorPagina = 1000;
    let seguirBuscando = true;

    while (seguirBuscando) {
      const { data } = await supabase
        .from('bd_productos')
        .select('*, bd_tipos_producto(*), bd_marcas(*)')
        .order('id', { ascending: false })
        .range(rangoInicio, rangoInicio + cantidadPorPagina - 1);

      if (data && data.length > 0) {
        todosLosProductos = [...todosLosProductos, ...data];
        rangoInicio += cantidadPorPagina;
      }

      if (!data || data.length < cantidadPorPagina) {
        seguirBuscando = false;
      }
    }
    setProductosDB(todosLosProductos);
  };

  const fetchTipos = async () => { const { data } = await supabase.from('bd_tipos_producto').select('*'); setTipos(data || []); };
  const fetchMarcas = async () => { const { data } = await supabase.from('bd_marcas').select('*'); setMarcas(data || []); };

  const iniciarNuevoProducto = (idTipo) => {
    if (!idTipo) return;
    const tipo = tipos.find(t => t.id == idTipo);
    if (tipo) {
      setForm({
        id_tipo_producto: idTipo,
        codigo: `${tipo.prefijo}${tipo.ultimo_numero + 1}`,
        descripcion: '', modelo_auto: '', codigo_fabricante: '', medida: '', id_marca: '', stock_actual: 0
      });
      setMostrarSelectorTipo(false);
      setVista('formulario');
    }
  };

const guardarProducto = async () => {
    const { bd_tipos_producto, bd_marcas, ...datosAGuardar } = form;

    if (datosAGuardar.id) {
      await supabase.from('bd_productos').update(datosAGuardar).eq('id', datosAGuardar.id);
    } else {
      await supabase.from('bd_productos').insert([datosAGuardar]);
      const tipo = tipos.find(t => t.id == datosAGuardar.id_tipo_producto);
      if (tipo) {
        await supabase.from('bd_tipos_producto').update({ ultimo_numero: tipo.ultimo_numero + 1 }).eq('id', tipo.id);
      }
    }
    
    // 🌟 AQUÍ ESTÁ EL CAMBIO CLAVE 🌟
    setForm({}); // <--- Vaciamos por completo el objeto del formulario para que no quede "sucio"
    setFiltroTipo('TODOS'); // Opcional: resetea el filtro si querés ver todo el catálogo fresco
    
    setVista('listado');
    fetchProductos();
    fetchTipos(); // <--- Volvemos a traer los tipos para tener el 'ultimo_numero' actualizado al instante
  };

  const eliminarProducto = async (p) => {
    const { data: movs } = await supabase.from('bd_movimientos').select('id').eq('id_producto', p.id).limit(1);
    const { data: trabs } = await supabase.from('bd_trabajos_p').select('id').eq('id_producto', p.id).limit(1);
    const { data: presu } = await supabase.from('bd_presupuestos_p').select('id').eq('id_producto', p.id).limit(1);

    if ((movs?.length || 0) + (trabs?.length || 0) + (presu?.length || 0) > 0) {
      return alert("⚠️ ACCIÓN DENEGADA: Este producto no se puede eliminar porque ya tiene movimientos, trabajos o presupuestos asociados.");
    }

    if (confirm(`¿Estás seguro de eliminar el producto ${p.codigo}?`)) {
      await supabase.from('bd_productos').delete().eq('id', p.id);
      fetchProductos();
    }
  };

  const abrirFicha = async (p) => {
    setForm(p);
    const { data } = await supabase
      .from('bd_movimientos')
      .select('*, bd_almacenes(nombre)')
      .eq('id_producto', p.id)
      .order('fecha', { ascending: false });

    setMovimientos(data || []);
    setVista('ficha');
  };

  const stockResultanteFicha = movimientos.reduce((acc, mov) => acc + (Number(mov.cantidad) || 0), 0);
  const nombreTipo = tipos.find(t => t.id == form.id_tipo_producto)?.nombre || form.bd_tipos_producto?.nombre;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {vista === 'listado' && (
        <div style={s.card}>
          <h2>📦 Gestión de Repuestos y Productos</h2>

          <div style={s.topBar}>
            {/* SELECTOR DE TIPO */}
            <select 
              value={filtroTipo} 
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ ...s.inputBusqueda, width: '200px', background: '#f8fafc', fontWeight: 'bold' }}
            >
              <option value="TODOS">🏷️ Todos los Tipos</option>
              {tipos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="🔍 Buscar por código, marca, modelo, cód. fábrica..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={s.inputBusqueda}
            />

            {/* BOTÓN NUEVO CORREGIDO: Resetea el formulario por completo */}
            <div style={{ marginLeft: 'auto' }}>
                <button 
                  style={s.btnPrincipal} 
                  onClick={() => {
                    setForm({}); // <--- SOLUCIÓN: Limpia el objeto viejo para que no arrastre IDs sucios
                    setMostrarSelectorTipo(!mostrarSelectorTipo);
                  }}
                >
                  {mostrarSelectorTipo ? '❌ Cancelar' : '➕ Nuevo Producto'}
                </button>
            </div>
          </div>

          {mostrarSelectorTipo && (
            <div style={s.modalTipo}>
              <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Seleccione el Tipo de Repuesto:</label>
              <select onChange={(e) => iniciarNuevoProducto(e.target.value)} style={{ padding: '8px', borderRadius: '6px' }} defaultValue="">
                <option value="">-- Elegir Tipo --</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          )}

          {/* TABLA PRINCIPAL CORREGIDA Y ACTUALIZADA */}
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: '10%' }}>Código</th>
                <th style={{ ...s.th, width: '18%' }}>Categoría</th>
                <th style={{ ...s.th, width: '18%' }}>Modelo</th>
                <th style={{ ...s.th, width: '14%' }}>Marca</th>
                <th style={{ ...s.th, width: '16%' }}>Cód. Fab</th> {/* 🌟 NUEVA COLUMNA */}
                <th style={{ ...s.th, width: '10%' }}>Medida</th>
                <th style={{ ...s.th, width: '6%', textAlign: 'center' }}>Stock</th>
                <th style={{ ...s.th, width: '12%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>No se encontraron repuestos.</td></tr>
              ) : (
                productos.map(p => (
                  <tr key={p.id} style={s.tr} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fdf2f2'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={s.td} title={p.codigo}>{p.codigo}</td>
                    <td style={s.td} title={p.bd_tipos_producto?.nombre}>{p.bd_tipos_producto?.nombre || '-'}</td>
                    <td style={s.td} title={p.modelo_auto}>{p.modelo_auto || '-'}</td>
                    <td style={s.td} title={p.bd_marcas?.nombre}>{p.bd_marcas?.nombre || '-'}</td>
                    <td style={s.td} title={p.codigo_fabricante}>{p.codigo_fabricante || '-'}</td> {/* 🌟 MUESTRA CÓDIGO FÁBRICA */}
                    <td style={s.td} title={p.medida}>{p.medida || '-'}</td>

                    <td style={{ ...s.td, textAlign: 'center', fontWeight: 'bold', color: (p.stock_actual || 0) > 0 ? '#16a34a' : '#dc2626' }}>
                      {p.stock_actual || 0}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={s.acciones}>
                        <span title="Ver Ficha" onClick={() => abrirFicha(p)} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>👁️</span>
                        <span title="Editar" onClick={() => { setForm(p); setVista('formulario'); }} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>✏️</span>
                        <span title="Eliminar" onClick={() => eliminarProducto(p)} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {(vista === 'formulario' || vista === 'ficha') && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{vista === 'formulario' ? (form.id ? '✏️ Editar Producto' : '✨ Nuevo Producto') : '👁️ Ficha Técnica'}</h3>
            <div style={s.destaqueTipo}>🏷️ Tipo: {nombreTipo || 'No asignado'}</div>
          </div>
          <hr style={{ borderColor: '#e2e8f0', marginBottom: '20px' }} />

          {vista === 'ficha' && (
            <div style={{ ...s.badgeStock, background: stockResultanteFicha > 0 ? '#16a34a' : (stockResultanteFicha < 0 ? '#dc2626' : '#64748b') }}>
              📦 Stock Resultante (Historial): {stockResultanteFicha}
            </div>
          )}

          <div style={s.formFila}>
            <label style={s.formLabel}>Código:</label>
            <input disabled value={form.codigo || ''} style={{ ...s.formInput, background: '#f1f5f9' }} />
          </div>

          <div style={s.formFila}>
            <label style={s.formLabel}>Modelo Auto:</label>
            <input disabled={vista === 'ficha'} value={form.modelo_auto || ''} onChange={e => setForm({ ...form, modelo_auto: e.target.value })} style={s.formInput} />
          </div>

          <div style={s.formFila}>
            <label style={s.formLabel}>Cód. Fabricante:</label>
            <input disabled={vista === 'ficha'} value={form.codigo_fabricante || ''} onChange={e => setForm({ ...form, codigo_fabricante: e.target.value })} style={s.formInput} />
          </div>

          <div style={s.formFila}>
            <label style={s.formLabel}>Medida:</label>
            <input disabled={vista === 'ficha'} value={form.medida || ''} onChange={e => setForm({ ...form, medida: e.target.value })} style={s.formInput} />
          </div>

          <div style={s.formFila}>
            <label style={s.formLabel}>Marca:</label>
            <select disabled={vista === 'ficha'} value={form.id_marca || ''} onChange={e => setForm({ ...form, id_marca: e.target.value })} style={s.formInput}>
              <option value="">-- Seleccione Marca --</option>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          <div style={s.formFila}>
            <label style={s.formLabel}>Descripción / Notas:</label>
            <input disabled={vista === 'ficha'} value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} style={s.formInput} placeholder="Información adicional..." />
          </div>

          {vista === 'ficha' && (
            <div style={{ marginTop: '30px' }}>
              <h4>📊 Historial de Movimientos</h4>
              <table style={{ ...s.tabla, tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={s.th}>Fecha</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Cantidad</th>
                    <th style={s.th}>Comentario</th>
                    <th style={s.th}>Almacén</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No hay movimientos registrados.</td></tr>
                  ) : (
                    movimientos.map(m => (
                      <tr key={m.id} style={s.tr}>
                        <td style={{ padding: '12px' }}>{new Date(m.fecha).toLocaleDateString()}</td>
                        <td style={{ padding: '12px' }}>{m.tipo_movimiento || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: m.cantidad < 0 ? '#dc2626' : '#16a34a' }}>{m.cantidad}</td>
                        <td style={{ padding: '12px' }}>{m.comentario || '-'}</td>
                        <td style={{ padding: '12px' }}>{m.bd_almacenes?.nombre || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
            {vista === 'formulario' && <button style={s.btnPrincipal} onClick={guardarProducto}>💾 Guardar Cambios</button>}
            <button style={s.btnSecundario} onClick={() => setVista('listado')}>🔙 Volver al Listado</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Productos;