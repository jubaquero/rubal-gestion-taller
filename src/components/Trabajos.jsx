import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import logoRubal from '../assets/logo_rubal.png';
function Trabajos() {
  const [trabajos, setTrabajos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [nomencladores, setNomencladores] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [vista, setVista] = useState('listado');
  const [cargando, setCargando] = useState(true);
  const [filtroAño, setFiltroAño] = useState('TODOS');

  // Estados Edición y Visualización
  const [trabajoActivo, setTrabajoActivo] = useState(null);
  const [itemsMO, setItemsMO] = useState([]);
  const [itemsProductos, setItemsProductos] = useState([]);
  const [observacionesEdicion, setObservacionesEdicion] = useState('');

  // Estados para Búsqueda en Vivo de Mano de Obra (Servicios)
  const [busquedaMO, setBusquedaMO] = useState('');
  const [moSugeridas, setMoSugeridas] = useState([]);
  const [moSeleccionada, setMoSeleccionada] = useState('');
  const [cantMO, setCantMO] = useState(1);

  // Estados para Búsqueda en Vivo de Productos
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosSugeridos, setProductosSugeridos] = useState([]);
  const [prodSeleccionadoObjeto, setProdSeleccionadoObjeto] = useState(null);
  const [cantProd, setCantProd] = useState(1);

  // Modal de Ficha (Ojito)
  const [modalFichaVisible, setModalFichaVisible] = useState(false);
  const [trabajoFicha, setTrabajoFicha] = useState(null);

  // Formulario Nuevo
  const [idCliente, setIdCliente] = useState('');
  const [tipoMotor, setTipoMotor] = useState('');
  const [idNomenclador, setIdNomenclador] = useState('');
  const [observacionesTrabajo, setObservacionesTrabajo] = useState('');

  // Cliente
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);

  // Estados para Edición (Lapicitos)
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [itemAEditar, setItemAEditar] = useState(null); // <--- ESTE ES EL QUE FALTA
  const [tipoEdicion, setTipoEdicion] = useState('');
  const [nuevaCant, setNuevaCant] = useState(1);
  const [nuevaObs, setNuevaObs] = useState('');

  // Cuando preparas la edición (ej: en prepararEdicionMO)
  const prepararEdicionMO = (item) => {
    setItemAEditar(item);
    setTipoEdicion('MO');
    setNuevaCant(item.cantidad || 0); // Si es null, que sea 0
    setNuevaObs(item.observacion || ""); // <--- AQUÍ ESTÁ LA CLAVE: || ""
    setModalEdicionVisible(true);
  };

  const prepararEdicionProd = (item) => {
    setItemAEditar(item);
    setTipoEdicion('PRODUCTO');
    setNuevaCant(item.cantidad);
    setModalEdicionVisible(true);
  };

  // Nuevos estados para la vinculación
  const [busquedaPresu, setBusquedaPresu] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [presupuestosDisponibles, setPresupuestosDisponibles] = useState([]);
  // Estados para el buscador predictivo de Nomenclador
  const [busquedaMotor, setBusquedaMotor] = useState('');
  const [mostrarSugerenciasMotor, setMostrarSugerenciasMotor] = useState(false);

  const RenderBuscadorNomenclador = (setFn, valorActual) => (
    <div style={{ position: 'relative' }}>
      <input
        style={s.input}
        placeholder="🔎 Escriba algunos caracteres del modelo.."
        value={busquedaMotor}
        onChange={e => {
          const valor = e.target.value;
          setBusquedaMotor(valor);

          // CAMBIO AQUÍ: Solo mostramos sugerencias si el valor tiene contenido
          if (valor.length > 0) {
            setMostrarSugerenciasMotor(true);
          } else {
            setMostrarSugerenciasMotor(false);
          }
        }}
      />
      {mostrarSugerenciasMotor && (
        <ul style={{ position: 'absolute', background: '#fff', border: '1px solid #ccc', width: '100%', zIndex: 10, maxHeight: '200px', overflowY: 'auto', listStyle: 'none', padding: 0 }}>
          {nomencladores.filter(n => n.descripcion.toLowerCase().includes(busquedaMotor.toLowerCase())).map(n => (
            <li key={n.id} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }} onClick={() => {
              setFn(n.id); // Guardamos el ID en el estado (idNomenclador o trabajoActivo.id_nomenclador)
              setBusquedaMotor(n.descripcion);
              setMostrarSugerenciasMotor(false);
            }}>
              {n.descripcion} ({n.tipo})
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const RenderBuscadorCliente = (idActual, setIdFn, onSelectExtra) => (
    <div style={{ position: 'relative' }}>
      <input
        style={s.input}
        placeholder="🔎 Escriba nombre o apellido..."
        value={busquedaCliente}
        onChange={e => {
          const valor = e.target.value;
          setBusquedaCliente(valor);

          if (valor.length > 0) {
            setMostrarSugerenciasCliente(true);
            setIdFn(''); // Borramos el ID si está escribiendo para forzar que elija de la lista
          } else {
            setMostrarSugerenciasCliente(false);
          }
        }}
        onFocus={() => {
          if (busquedaCliente.length > 0) setMostrarSugerenciasCliente(true);
        }}
      />
      {mostrarSugerenciasCliente && (
        <ul style={{
          position: 'absolute', background: '#fff', border: '1px solid #cbd5e1',
          width: '100%', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
          listStyle: 'none', padding: 0, marginTop: '4px', borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          {clientes
            .filter(c => {
              const nombreCompleto = `${c.nombre} ${c.apellido}`.toLowerCase();
              return nombreCompleto.includes(busquedaCliente.toLowerCase());
            })
            .map(c => (
              <li
                key={c.id}
                style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                onMouseOut={(e) => e.target.style.background = '#fff'}
                onClick={() => {
                  setIdFn(c.id); // Guardamos el ID
                  setBusquedaCliente(`${c.nombre} ${c.apellido} ${c.es_empresa ? '(Emp)' : ''}`); // Rellenamos el input
                  setMostrarSugerenciasCliente(false); // Cerramos lista
                  if (onSelectExtra) onSelectExtra(c.id); // Disparamos la búsqueda de presupuestos
                }}
              >
                <b>{c.nombre} {c.apellido}</b> <span style={{ color: '#64748b' }}>{c.es_empresa ? '(Emp)' : ''}</span>
              </li>
            ))}
          {clientes.filter(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(busquedaCliente.toLowerCase())).length === 0 && (
            <li style={{ padding: '10px', color: '#94a3b8', fontStyle: 'italic' }}>No se encontraron clientes...</li>
          )}
        </ul>
      )}
    </div>
  );

  const obtenerPresupuestosCliente = async (id_cliente) => {
    if (!id_cliente) return;

    // 🌟 CAMBIO AQUÍ: Agregamos el join con bd_nomenclador(*)
    const { data } = await supabase
      .from('bd_presupuestos')
      .select('*, bd_nomenclador(*)')
      .eq('id_cliente', id_cliente)
      .in('estado', ['APROBADO', 'PENDIENTE'])
      .order('id', { ascending: false });

    const { data: trabajosOcupados } = await supabase
      .from('bd_trabajos')
      .select('id_presupuesto')
      .not('id_presupuesto', 'is', null);

    const idsOcupados = trabajosOcupados.map(t => t.id_presupuesto);

    setPresupuestosDisponibles((data || []).filter(p => !idsOcupados.includes(p.id)));
  };

  const s = {
    // Ahora quitamos el maxWidth para que se estire
    card: { background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '95%', margin: '0 auto 20px auto' },
    pill: (activo) => ({ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activo ? '#dc2626' : '#e2e8f0', color: activo ? '#fff' : '#475569', fontWeight: 'bold', transition: '0.2s' }),
    inputModerno: { padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '350px', outline: 'none', fontSize: '0.95rem' },
    input: { padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box' },
    th: { background: '#f8fafc', padding: '14px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.8rem' },
    td: { padding: '14px 12px', fontSize: '0.95rem', borderBottom: '1px solid #f1f5f9' },
    btnPr: { background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
    btnOk: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    lbl: { fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#1e293b' }
  };

  useEffect(() => { cargarDatos(); }, []);

  // Buscador predictivo en Vivo para MANO DE OBRA
  useEffect(() => {
    const buscarMO = async () => {
      if (busquedaMO.length < 2) {
        setMoSugeridas([]);
        return;
      }
      const { data } = await supabase
        .from('bd_mo')
        .select('*')
        .ilike('servicio', `%${busquedaMO}%`)
        .limit(50);
      setMoSugeridas(data || []);
    };
    const timeoutId = setTimeout(buscarMO, 300);
    return () => clearTimeout(timeoutId);
  }, [busquedaMO]);

  // Buscador predictivo en Vivo para PRODUCTOS
  // Buscador predictivo en Vivo para PRODUCTOS
  useEffect(() => {
    const buscarProd = async () => {
      if (busquedaProducto.length < 2) {
        setProductosSugeridos([]);
        return;
      }
      // Usamos el join para traer marcas y tipos
      const { data } = await supabase
        .from('bd_productos')
        .select('*, bd_tipos_producto(nombre), bd_marcas(nombre)')
        .or(`codigo.ilike.%${busquedaProducto}%,descripcion.ilike.%${busquedaProducto}%,modelo_auto.ilike.%${busquedaProducto}%`)
        .limit(50);
      setProductosSugeridos(data || []);
    };
    const timeoutId = setTimeout(buscarProd, 300);
    return () => clearTimeout(timeoutId);
  }, [busquedaProducto]);

  const cargarDatos = async () => {
    setCargando(true);
    // Ya no cargamos los miles de productos y servicios de golpe. Todo en vivo.
    const [t, c, n] = await Promise.all([
      supabase.from('bd_trabajos').select('*, bd_clientes(*), bd_nomenclador(*)').order('id', { ascending: false }),
      supabase.from('bd_clientes').select('*').order('nombre'),
      supabase.from('bd_nomenclador').select('*')
    ]);
    setTrabajos(t.data || []); setClientes(c.data || []); setNomencladores(n.data || []);
    setCargando(false);
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const filtrarTrabajos = trabajos.filter(t => {
    const coincideEstado = filtroEstado === 'TODOS' || (filtroEstado === 'PENDIENTE' && t.estado !== 'TERMINADO') || (filtroEstado === 'TERMINADO' && t.estado === 'TERMINADO');

    // Nueva lógica de año
    const añoTrabajo = t.fecha_inicio ? new Date(t.fecha_inicio).getFullYear().toString() : '';
    const coincideAño = filtroAño === 'TODOS' || añoTrabajo === filtroAño;

    const term = busqueda.toLowerCase();
    const strId = t.id.toString();
    const strCliente = `${t.bd_clientes?.nombre || ''} ${t.bd_clientes?.apellido || ''}`.toLowerCase();
    const strServicio = (t.bd_nomenclador?.descripcion || '').toLowerCase();

    return coincideEstado && coincideAño && (strId.includes(term) || strCliente.includes(term) || strServicio.includes(term));
  });

  const handleCrearTrabajo = async (e) => {
    e.preventDefault();
    if (!idCliente || !idNomenclador) return alert("Por favor seleccione Cliente y Motor.");
    const { error } = await supabase.from('bd_trabajos').insert([{
      id_cliente: idCliente,
      id_nomenclador: idNomenclador,
      estado: 'PENDIENTE',
      fecha_inicio: new Date().toISOString().split('T')[0],
      observaciones_trabajo: observacionesTrabajo
    }]);
    if (error) alert("Error: " + error.message);
    else {
      setIdCliente(''); setTipoMotor(''); setIdNomenclador(''); setObservacionesTrabajo('');
      setVista('listado'); cargarDatos();
    }
  };

  const cargarEdicion = async (t) => {
    setTrabajoActivo(t);
    setBusquedaMotor(t.bd_nomenclador?.descripcion || '');
    setObservacionesEdicion(t.observaciones_trabajo || '');
    setMostrarSugerencias(false); // Cerramos cualquier lista abierta por seguridad

    // 🌟 AQUÍ ESTÁ LA CLAVE PARA EL TRABAJO QUE SÍ TIENE PRESUPUESTO VINCULADO:
    if (t.id_presupuesto) {
      setBusquedaPresu(`N° ${t.id_presupuesto}`);
    } else {
      setBusquedaPresu(''); // 🌟 SI NO TIENE, LO LIMPIAMOS PARA QUE NO QUEDE EL ANTERIOR
    }

    // DISPARO AUTOMÁTICO: Cargamos los presupuestos del cliente apenas abrimos la edición
    await obtenerPresupuestosCliente(t.id_cliente);

    const [mo, pr] = await Promise.all([
      supabase.from('bd_trabajos_mo').select('*, bd_mo:item_servicio(*)').eq('id_trabajo', t.id),
      supabase.from('bd_trabajos_p').select('*, bd_productos(*, bd_tipos_producto(nombre), bd_marcas(nombre))').eq('id_trabajo', t.id)
    ]);

    setItemsMO(mo.data || []);
    setItemsProductos(pr.data || []);
    setVista('editar');
  };

  // AGREGAR MANO DE OBRA CON CANTIDAD
  const handleAgregarMO = async () => {
    console.log("Valores actuales -> Seleccionada:", moSeleccionada, "Cantidad:", cantMO);

    if (!moSeleccionada || cantMO < 1) {
      alert("Selecciona un servicio y una cantidad válida");
      return;
    }

    const mo = moSugeridas.find(m => String(m.codigo_mo) === String(moSeleccionada));

    // Si no encuentra la MO en las sugeridas, busquemos en la lista completa o forzamos el id
    // Esto pasa si el usuario seleccionó pero el estado moSugeridas cambió
    if (!mo) {
      alert("No se encontró el servicio seleccionado. Por favor, buscalo de nuevo.");
      return;
    }

    const linea = itemsMO.length + 1;
    const { error } = await supabase.from('bd_trabajos_mo').insert([{
      id_trabajo: trabajoActivo.id,
      item_servicio: mo.codigo_mo, // Verifica que esta columna sea la correcta en tu tabla
      cantidad: cantMO,
      linea: linea
    }]);

    if (error) {
      console.error("Error Supabase:", error);
      alert("Error al insertar: " + error.message);
    } else {
      setMoSeleccionada('');
      setCantMO(1);
      setBusquedaMO('');
      setMoSugeridas([]);
      cargarEdicion(trabajoActivo);
    }
  };
  const quitarMO = async (idItem) => {
    await supabase.from('bd_trabajos_mo').delete().eq('id', idItem);
    cargarEdicion(trabajoActivo);
  };

  const handleAgregarProducto = async () => {
    if (!prodSeleccionadoObjeto || cantProd < 1) {
      alert("Selecciona un producto y una cantidad válida");
      return;
    }

    const p = prodSeleccionadoObjeto; // Usamos el objeto que ya guardamos
    const linea = itemsProductos.length + 1;

    const { error } = await supabase.from('bd_trabajos_p').insert([{
      id_trabajo: trabajoActivo.id,
      id_producto: p.id,
      cantidad: cantProd,
      linea: linea
    }]);

    if (error) {
      alert("Error al insertar producto: " + error.message);
    } else {
      setProdSeleccionadoObjeto(null); // Limpiamos
      setCantProd(1);
      setBusquedaProducto('');
      cargarEdicion(trabajoActivo);
    }
  };

  const quitarProducto = async (idItem) => {
    await supabase.from('bd_trabajos_p').delete().eq('id', idItem);
    cargarEdicion(trabajoActivo);
  };

  const guardarCambiosTextoYEstado = async (nuevoEstado = null) => {
    const estadoFinal = nuevoEstado || trabajoActivo.estado;
    const { error } = await supabase
      .from('bd_trabajos')
      .update({
        observaciones_trabajo: observacionesEdicion,
        estado: estadoFinal,
        id_presupuesto: trabajoActivo.id_presupuesto,
        id_cliente: trabajoActivo.id_cliente,       // 🌟 IMPORTANTE: Guardar el nuevo cliente
        id_nomenclador: trabajoActivo.id_nomenclador // 🌟 IMPORTANTE: Guardar el nuevo motor
      })
      .eq('id', trabajoActivo.id);

    if (error) alert("Error al guardar: " + error.message);
    else {
      alert("✅ Cambios guardados correctamente.");
      cargarDatos();
      setVista('listado');
    }
  };

  const abrirFicha = async (t) => {
    // Volvemos a consultar el trabajo para traer bd_presupuestos bien fresco
    const { data: trabajoCompleto } = await supabase
      .from('bd_trabajos')
      .select('*, bd_clientes(*), bd_nomenclador(*), bd_presupuestos(*)')
      .eq('id', t.id)
      .single();

    setTrabajoFicha(trabajoCompleto || t);

    const [mo, pr] = await Promise.all([
      supabase.from('bd_trabajos_mo').select('*, bd_mo:item_servicio(*)').eq('id_trabajo', t.id),
      supabase.from('bd_trabajos_p').select('*, bd_productos(*, bd_tipos_producto(nombre), bd_marcas(nombre))').eq('id_trabajo', t.id)
    ]);
    setItemsMO(mo.data || []);
    setItemsProductos(pr.data || []);
    setModalFichaVisible(true);
  };

  const eliminarTrabajo = async (t) => {
    if (!confirm(`¿Estás seguro de eliminar la OT #${t.id} definitivamente?`)) return;
    const { data: mo } = await supabase.from('bd_trabajos_mo').select('id').eq('id_trabajo', t.id).limit(1);
    const { data: p } = await supabase.from('bd_trabajos_p').select('id').eq('id_trabajo', t.id).limit(1);
    if ((mo?.length > 0) || (p?.length > 0) || t.estado === 'TERMINADO') {
      alert("⚠️ Acción Denegada: La orden ya posee registros o está finalizada.");
      return;
    }
    await supabase.from('bd_trabajos').delete().eq('id', t.id);
    cargarDatos();
  };

  const tiposMotoresUnicos = [...new Set(nomencladores.map(n => n.tipo))];
  const nomencladoresFiltrados = nomencladores.filter(n => n.tipo === tipoMotor);

  const guardarEdicion = async () => {
    const tabla = tipoEdicion === 'MO' ? 'bd_trabajos_mo' : 'bd_trabajos_p';
    const datosUpdate = tipoEdicion === 'MO'
      ? { cantidad: nuevaCant, observacion: nuevaObs }
      : { cantidad: nuevaCant };

    const { error } = await supabase.from(tabla).update(datosUpdate).eq('id', itemAEditar.id);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setModalEdicionVisible(false);
      cargarEdicion(trabajoActivo); // Recarga la tabla para ver el cambio
    }
  };

  const marcarComoTerminado = async () => {
    // 1. Validar si tiene presupuesto
    if (!trabajoActivo.id_presupuesto) {
      if (!confirm("⚠️ ¡Atención! Este trabajo no tiene un presupuesto vinculado. ¿Desea terminarlo de todos modos?")) {
        return;
      }
    }

    // 2. Si pasa la validación (o aceptó el riesgo), cambiamos estado
    const { error } = await supabase
      .from('bd_trabajos')
      .update({ estado: 'TERMINADO', fecha_fin: new Date().toISOString().split('T')[0] })
      .eq('id', trabajoActivo.id);

    if (!error) {
      alert("✅ Trabajo finalizado con éxito.");
      setVista('listado');
      cargarDatos();
    }
  };

  const imprimirFicha = () => {
    const contenido = document.querySelector('.modal-print-card').innerHTML;
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=1000');

    ventanaImpresion.document.write(`
    <html>
      <head>
        <title>Orden de Trabajo</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: sans-serif; color: #000; }
          
          /* ESTO OCULTA LOS BOTONES AL IMPRIMIR */
          .no-print { display: none !important; }
          
          /* Estilos para que el contenido se vea grande y bien distribuido */
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border-bottom: 1px solid #ccc; padding: 10px; text-align: left; }
          img { width: 120px; }
          h2 { color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
          
          /* Asegura que la ficha ocupe todo el ancho de la hoja A4 */
          .modal-print-card { width: 100% !important; max-width: 100% !important; }
        </style>
      </head>
      <body>
        <div class="modal-print-card">
          ${contenido}
        </div>
        <script>
          // Esperamos a que la imagen cargue antes de imprimir
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
    ventanaImpresion.document.close();
  };

  // Extrae años únicos de la fecha_inicio y los ordena
  const añosDisponibles = [...new Set(trabajos.map(t =>
    t.fecha_inicio ? new Date(t.fecha_inicio).getFullYear().toString() : null
  ))].filter(Boolean).sort().reverse();

  return (
    <div style={{ padding: '20px' }}>
      {/* AÑADE ESTE BLOQUE CSS AQUÍ */}
      <style>{`
  @media print {
    /* 1. Ocultar absolutamente todo el cuerpo de la página */
    body > *:not(.modal-print-container) { 
      display: none !important; 
    }

    /* 2. Asegurar que nuestro modal sea el único elemento visible y ocupe el papel */
    .modal-print-container {
      display: block !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      background: white !important;
      overflow: visible !important;
    }

    /* 3. Ajustar la tarjeta para que se imprima limpiamente */
    .modal-print-card {
      box-shadow: none !important;
      border: none !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 20px !important;
      background: white !important;
      color: black !important;
    }

    /* 4. Esconder los botones de la interfaz durante la impresión */
    .no-print { display: none !important; }

    /* 5. Asegurar que el logo se imprima (forzar colores) */
    img {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`}</style>

      <div style={s.card}>

        {/* --- VISTA 1: LISTADO --- */}
        {vista === 'listado' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>⚙️ Trabajos</h2>
              <input type="text" style={s.inputModerno} placeholder="🔍 Buscar Nro, Cliente o Servicio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              {/* Botón Nuevo en Listado */}
              <button style={s.btnPr} onClick={() => {
                setIdCliente('');
                setBusquedaCliente('');
                setTipoMotor('');
                setIdNomenclador('');
                setBusquedaMotor(''); // <--- LIMPIA EL CAMPO DEL BUSCADOR
                setObservacionesTrabajo('');
                setVista('nuevo');
              }}>+ Nuevo Trabajo</button>
            </div>

<div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontWeight: 'bold', alignSelf: 'center', marginRight: '5px' }}>Estado:</span>
              {['TODOS', 'PENDIENTE', 'TERMINADO'].map(op => <button key={op} style={s.pill(filtroEstado === op)} onClick={() => setFiltroEstado(op)}>{op}</button>)}
            </div>

{/* Separador visual */}
                            <div style={{ width: '1px', background: '#cbd5e1' }}></div>
                            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 'bold', alignSelf: 'center', marginRight: '5px' }}>Año:</span>
              <button style={s.pill(filtroAño === 'TODOS')} onClick={() => setFiltroAño('TODOS')}>TODOS</button>
              {añosDisponibles.map(anio => (
                <button
                  key={anio}
                  style={s.pill(filtroAño === anio)}
                  onClick={() => setFiltroAño(anio)}
                >
                  {anio}
                </button>
              ))}
            </div>
  </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...s.th, width: '6%' }}>Nro</th>
                  <th style={{ ...s.th, width: '26%' }}>Cliente</th>
                  <th style={{ ...s.th, width: '24%' }}>Modelo Motor/Tapa</th>
                  <th style={{ ...s.th, width: '12%' }}>F. Inicio</th>
                  <th style={{ ...s.th, width: '12%' }}>F. Fin</th>
                  <th style={{ ...s.th, width: '10%' }}>Estado</th>
                  <th style={{ ...s.th, width: '10%', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrarTrabajos.map(t => (
                  <tr key={t.id}>
                    <td style={{ ...s.td, fontWeight: 'bold' }}>#{t.id}</td>
                    <td style={s.td}>{t.bd_clientes?.nombre} {t.bd_clientes?.apellido}</td>
                    <td style={s.td}>{t.bd_nomenclador?.descripcion}</td>
                    <td style={s.td}>{formatearFecha(t.fecha_inicio)}</td>
                    <td style={s.td}>{t.fecha_fin ? formatearFecha(t.fecha_fin) : <span style={{ color: '#94a3b8' }}></span>}</td>
                    <td style={s.td}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', backgroundColor: t.estado === 'TERMINADO' ? '#dcfce7' : '#f1f5f9', color: t.estado === 'TERMINADO' ? '#16a34a' : '#ec5628' }}>{t.estado}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <span style={{ cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => abrirFicha(t)} title="Ver Ficha">👁️</span>
                        <span style={{ cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => cargarEdicion(t)} title="Editar Consumos">✏️</span>
                        <span style={{ cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => eliminarTrabajo(t)} title="Eliminar Orden">🗑️</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* --- VISTA 2: NUEVA ORDEN --- */}
        {vista === 'nuevo' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>✨ Creación de Orden de Trabajo</h2>
            <form onSubmit={handleCrearTrabajo} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={s.lbl}>1. Cliente *</label>
                  {RenderBuscadorCliente(idCliente, setIdCliente, obtenerPresupuestosCliente)}
                </div>
                <div>
                  <label style={s.lbl}>2. Tipo *</label>
                  <select style={s.input} value={tipoMotor} onChange={(e) => { setTipoMotor(e.target.value); setIdNomenclador(''); }} required>
                    <option value=""></option>
                    {tiposMotoresUnicos.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={s.lbl}>3. Motor/Tapa *</label>
                  {RenderBuscadorNomenclador(setIdNomenclador, idNomenclador)}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={s.lbl}>Observaciones</label>
                  <textarea style={{ ...s.input, height: '100px', resize: 'vertical' }} value={observacionesTrabajo} onChange={(e) => setObservacionesTrabajo(e.target.value)} placeholder="Estado inicial de la tapa, faltantes al ingresar..."></textarea>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" style={s.btnSec} onClick={() => setVista('listado')}>Cancelar</button>
                <button type="submit" style={s.btnOk}>💾 Crear Trabajo</button>
              </div>
            </form>
          </div>
        )}
        {/* --- VISTA 3: EDICIÓN VIVA --- */}
        {vista === 'editar' && trabajoActivo && (
          <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 20px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
              <div style={{ width: '100%', maxWidth: '600px' }}>
                <h2 style={{ margin: 0 }}>🛠️ Trabajo #{trabajoActivo.id}</h2>

                {/* ESTADO */}
                <span style={{
                  display: 'inline-block', margin: '5px 0', padding: '4px 12px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 'bold',
                  backgroundColor: trabajoActivo.estado === 'TERMINADO' ? '#dcfce7' : '#f1f5f9',
                  color: trabajoActivo.estado === 'TERMINADO' ? '#16a34a' : '#475569'
                }}>
                  Estado: {trabajoActivo.estado}
                </span>

                {/* SELECT EDITABLE DE CLIENTE */}
                <div style={{ marginTop: '10px' }}>
                  <label style={{ ...s.lbl, fontSize: '0.8rem' }}>Cliente:</label>
                  <select
                    style={s.input}
                    value={trabajoActivo.id_cliente}
                    onChange={(e) => {
                      const nuevoId = e.target.value;
                      const clienteSel = clientes.find(c => c.id == nuevoId);
                      setTrabajoActivo({ ...trabajoActivo, id_cliente: nuevoId, bd_clientes: clienteSel });
                      obtenerPresupuestosCliente(nuevoId);
                    }}
                  >
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                  </select>
                </div>


              </div>

              <button style={{ ...s.btnSec, marginTop: '5px' }} onClick={() => {
                setVista('listado');
                setBusquedaPresu('');
                setMostrarSugerencias(false);
                setMostrarSugerenciasMotor(false);
              }}>
                ← Volver al Listado
              </button>
            </div>


            {/* VINCULACIÓN DE PRESUPUESTO */}
            <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '8px', border: '1px solid #fcd34d', marginBottom: '25px' }}>
              <label style={s.lbl}>🏷️ Presupuesto Vinculado</label>

              {trabajoActivo.id_presupuesto ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <p style={{ margin: 0 }}>Presupuesto N° <b>{trabajoActivo.id_presupuesto}</b></p>
                  <button type="button" style={s.btnSec} onClick={() => {
                    setTrabajoActivo({ ...trabajoActivo, id_presupuesto: null });
                    setBusquedaPresu('');
                  }}>Quitar</button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                      style={s.input}
                      placeholder="Escriba N° Presupuesto..."
                      value={busquedaPresu}
                      onFocus={() => setMostrarSugerencias(true)} // 🌟 ESTO ABRE LA LISTA AL HACER CLIC
                      onChange={e => {
                        setBusquedaPresu(e.target.value);
                        setMostrarSugerencias(true);
                      }}
                    />
                    {mostrarSugerencias && (
                      <button type="button" style={s.btnSec} onClick={() => setMostrarSugerencias(false)}>X</button>
                    )}
                  </div>

                  {mostrarSugerencias && (
                    <ul style={{
                      position: 'absolute',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      width: '100%',
                      zIndex: 10,
                      listStyle: 'none',
                      padding: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}>
                      {presupuestosDisponibles.length === 0 ? (
                        <li style={{ padding: '10px', color: '#999' }}>No hay presupuestos disponibles para este cliente.</li>
                      ) : (
                        presupuestosDisponibles
                          .filter(p => String(p.id).includes(busquedaPresu))
                          .map(p => {
                            // Generamos la etiqueta descriptiva: "Nro - Fecha - Descripción Motor"
                            const motorDesc = p.bd_nomenclador?.descripcion || 'Sin especificar';
                            const textoCompleto = `N° ${p.id} - ${formatearFecha(p.fecha_presupuesto)} - ${motorDesc}`;

                            return (
                              <li
                                key={p.id}
                                style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}
                                onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.target.style.background = '#fff'}
                                onClick={() => {
                                  setTrabajoActivo({ ...trabajoActivo, id_presupuesto: p.id });
                                  setBusquedaPresu(textoCompleto); // 🌟 Ahora guarda el texto completo y detallado en el input
                                  setMostrarSugerencias(false);
                                }}>
                                {/* 🌟 RENDERIZADO EN LA LISTA DESPLEGABLE */}
                                <b>N° {p.id}</b> ({formatearFecha(p.fecha_presupuesto)}) — <span style={{ color: '#475569', fontWeight: '500' }}>{motorDesc}</span>
                              </li>
                            );
                          })
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={s.lbl}>Cambiar Servicio/Motor:</label>
              {RenderBuscadorNomenclador(
                (id) => setTrabajoActivo({ ...trabajoActivo, id_nomenclador: id }),
                trabajoActivo.id_nomenclador
              )}
            </div>

            {/* OBSERVACIONES */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
              <label style={{ ...s.lbl, fontSize: '1.05rem', color: '#000000' }}>📝 Observaciones</label>
              <textarea
                style={{ ...s.input, height: '100px', resize: 'vertical', marginTop: '8px' }}
                value={observacionesEdicion}
                onChange={e => setObservacionesEdicion(e.target.value)}
              />
            </div>
            {/* ESTRUCTURA DE BLOQUES (UNO DEBAJO DEL OTRO) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
              {/* MANO DE OBRA */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ marginTop: 0 }}>⚙️ Mano de Obra</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', position: 'relative' }}>
                  <input type="text" style={s.input} placeholder="🔎 Buscar servicio..." value={busquedaMO} onChange={e => setBusquedaMO(e.target.value)} />
                  <input type="number" min="1" style={{ ...s.input, width: '80px' }} value={cantMO} onChange={e => setCantMO(Number(e.target.value))} />
                  <button style={s.btnPr} onClick={handleAgregarMO}>+</button>
                  {moSugeridas.length > 0 && (
                    <ul style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', listStyle: 'none', padding: 0, margin: '5px 0', zIndex: 10, width: '100%' }}>
                      {moSugeridas.map(m => (
                        <li
                          key={m.codigo_mo}
                          style={{ padding: '8px', cursor: 'pointer' }}
                          onClick={() => {
                            setMoSeleccionada(m.codigo_mo); // <-- Asegurate de que esto sea el ID correcto
                            setBusquedaMO(m.servicio);      // Esto muestra el nombre en el input
                            setMoSugeridas([]);             // Esto cierra la lista
                          }}
                        >
                          {m.servicio}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* TABLA MANO DE OBRA (Sin línea, con espacio extra) */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr><th style={s.th}>Servicio</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Cant</th>
                      <th style={s.th}>Observación</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {itemsMO
                      .slice() // Creamos una copia para no alterar el original
                      .sort((a, b) => Number(a.linea || 0) - Number(b.linea || 0)) // Ordenamos numéricamente
                      .map(i => (
                        <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={s.td}>{i.bd_mo?.servicio}</td>
                          <td style={{ ...s.td, textAlign: 'center' }}>{i.cantidad || 1}</td>
                          <td style={s.td}>{i.observacion || '-'}</td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <span style={{ cursor: 'pointer', marginRight: '10px' }} onClick={() => prepararEdicionMO(i)}>✏️</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => quitarMO(i.id)}>🗑️</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ marginTop: 0 }}>📦 Repuestos Utilizados</h3>
                {/* BUSCADOR */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', position: 'relative' }}>
                  <input
                    type="text"
                    style={s.input}
                    placeholder="🔎 Buscar repuesto..."
                    value={busquedaProducto}
                    onChange={e => {
                      setBusquedaProducto(e.target.value);
                      if (e.target.value.length < 2) setProductosSugeridos([]);
                    }}
                  />
                  <input type="number" min="1" style={{ ...s.input, width: '80px' }} value={cantProd} onChange={e => setCantProd(Number(e.target.value))} />
                  <button style={s.btnPr} onClick={handleAgregarProducto}>+</button>
                  {/* LISTA DE SUGERENCIAS */}
                  {productosSugeridos.length > 0 && (
                    <ul style={{
                      position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #cbd5e1',
                      borderRadius: '8px', listStyle: 'none', padding: '5px 0', margin: '5px 0 0 0',
                      zIndex: 9999, width: '100%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                      maxHeight: '300px', overflowY: 'auto'
                    }}>
                      {productosSugeridos.map(p => (
                        <li
                          key={p.id}
                          style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}
                          onClick={() => {
                            setProdSeleccionadoObjeto(p); // GUARDAMOS EL OBJETO COMPLETO
                            setBusquedaProducto(`${p.bd_tipos_producto?.nombre || ''} - ${p.modelo_auto || ''}`);
                            // NO LIMPIAMOS LA LISTA AQUÍ para permitir que el botón + la encuentre
                          }}
                        >
                          <div style={{ fontWeight: 'bold' }}>
                            {String(p.bd_tipos_producto?.nombre || 'N/A').toUpperCase()} - {p.modelo_auto} - [ {p.bd_marcas?.nombre || 'Sin Marca'} ]
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            Código: {p.codigo} ( {p.codigo_fabricante || 'S/C'} )
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={s.th}>Código</th>
                      <th style={s.th}>Tipo</th>
                      <th style={s.th}>Marca</th>
                      <th style={s.th}>Modelo</th>
                      <th style={s.th}>Medida</th>
                      <th style={s.th}>Cód. Fab</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Cant</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsProductos
                      .slice()
                      .sort((a, b) => Number(a.linea || 0) - Number(b.linea || 0))
                      .map(i => (
                        <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ ...s.td, fontWeight: 'bold' }}>{i.bd_productos?.codigo}</td>
                          <td style={s.td}>{i.bd_productos?.bd_tipos_producto?.nombre}</td>
                          <td style={s.td}>{i.bd_productos?.bd_marcas?.nombre}</td>
                          <td style={s.td}>{i.bd_productos?.modelo_auto}</td>
                          <td style={s.td}>{i.bd_productos?.medida || '-'}</td>
                          <td style={s.td}>{i.bd_productos?.codigo_fabricante}</td>
                          <td style={{ ...s.td, textAlign: 'center' }}>{i.cantidad || 1}</td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <span style={{ cursor: 'pointer', marginRight: '10px' }} onClick={() => prepararEdicionProd(i)}>✏️</span>
                            <span style={{ cursor: 'pointer' }} onClick={() => quitarProducto(i.id)}>🗑️</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTONERA AL PIE DEL FORMULARIO */}
            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              {/* PUNTO 1: Ocultar botón si ya está terminado */}
              {trabajoActivo.estado !== 'TERMINADO' && (
                <button style={{ ...s.btnOk, background: '#0891b2' }} onClick={marcarComoTerminado}>✅ Terminar Trabajo</button>
              )}
              <button style={{ ...s.btnOk, marginLeft: 'auto' }} onClick={() => guardarCambiosTextoYEstado(null)}>💾 Guardar Cambios</button>
            </div>

          </div>
        )}
      </div>

      {/* --- MODAL FICHA (COMPLETO Y VERTICAL) --- */}
      {modalFichaVisible && trabajoFicha && (
        <div className="modal-print-container" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          zIndex: 9999, overflowY: 'auto', padding: '10px'
        }}>


          <div className="modal-print-card" style={{
            background: '#fff', padding: '40px', borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            width: '100%', maxWidth: '800px', minHeight: '1000px'
          }}>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dc2626', paddingBottom: '15px', marginBottom: '20px' }}>
              <img src={logoRubal} alt="Logo" style={{ width: '100px' }} />
              <h2 style={{ color: '#dc2626', margin: 0 }}>TRABAJO N° {trabajoFicha.id}</h2>
            </div>

            {/* INFO CLIENTE (Grid restaurado para no perder info) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px', fontSize: '0.95rem', background: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
              <div>
                <p style={{ margin: '5px 0' }}><b>Cliente:</b> {trabajoFicha.bd_clientes?.nombre} {trabajoFicha.bd_clientes?.apellido}</p>
                <p style={{ margin: '5px 0' }}><b>Teléfono:</b> {trabajoFicha.bd_clientes?.telefono || '-'}</p>
              </div>
              <div>
                <p style={{ margin: '5px 0' }}><b>Servicio:</b> {trabajoFicha.bd_nomenclador?.descripcion}</p>
                <p style={{ margin: '5px 0' }}><b>Fechas:</b> {formatearFecha(trabajoFicha.fecha_inicio)} al {trabajoFicha.fecha_fin ? formatearFecha(trabajoFicha.fecha_fin) : 'Pendiente'}</p>
                {/* NUEVO CAMPO: PRESUPUESTO VINCULADO */}
                <p style={{ margin: '5px 0' }}>
                  <b>Presupuesto:</b> {trabajoFicha.id_presupuesto ? (
                    <span style={{ fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                      N° {trabajoFicha.id_presupuesto} ({trabajoFicha.bd_presupuestos?.estado || 'Asignado'})
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin presupuesto vinculado</span>
                  )}
                </p>
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>📝 Observaciones</h4>
              <div style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', background: '#fafafa', minHeight: '60px' }}>
                {trabajoFicha.observaciones_trabajo || 'Sin anotaciones registradas.'}
              </div>
            </div>

            {/* MANO DE OBRA */}
            <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>⚙️ Mano de Obra</h4>
            <ul style={{ margin: '0 0 25px 0', paddingLeft: '20px', fontSize: '0.95rem' }}>
              {itemsMO.length > 0 ? itemsMO.map(i => <li key={i.id}>{i.cantidad || 1} x {i.bd_mo?.servicio}</li>) : <li style={{ color: '#94a3b8' }}>Sin tareas.</li>}
            </ul>

            {/* REPUESTOS (Tabla completa restaurada) */}
            <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>📦 Detalle de Repuestos</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Cód</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Marca</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Modelo</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Medida</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Cant</th>
                </tr>
              </thead>
              <tbody>
                {itemsProductos.map(i => (
                  <tr key={i.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{i.bd_productos?.codigo}</td>
                    <td style={{ padding: '10px' }}>{i.bd_productos?.bd_tipos_producto?.nombre || '-'}</td>
                    <td style={{ padding: '10px' }}>{i.bd_productos?.bd_marcas?.nombre || '-'}</td>
                    <td style={{ padding: '10px' }}>{i.bd_productos?.modelo_auto || '-'}</td>
                    <td style={{ padding: '10px' }}>{i.bd_productos?.medida || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{i.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* BOTONES */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '40px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
              <button style={s.btnSec} onClick={() => setModalFichaVisible(false)}>Cerrar</button>
              <button style={s.btnOk} onClick={imprimirFicha}>
                🖨️ Imprimir / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDICIÓN DE CANTIDAD --- */}
      {modalEdicionVisible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Editar {tipoEdicion === 'MO' ? 'Servicio' : 'Repuesto'}</h3>

            <label style={s.lbl}>Nueva Cantidad:</label>
            <input type="number" style={s.input} value={nuevaCant} onChange={e => setNuevaCant(Number(e.target.value))} />

            {tipoEdicion === 'MO' && (
              <>
                <label style={{ ...s.lbl, marginTop: '15px' }}>Observación:</label>
                <input
                  type="text"
                  style={s.input}
                  value={nuevaObs || ""}
                  onChange={e => setNuevaObs(e.target.value)}
                />
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button style={s.btnSec} onClick={() => setModalEdicionVisible(false)}>Cancelar</button>
              <button style={s.btnOk} onClick={guardarEdicion}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Trabajos;