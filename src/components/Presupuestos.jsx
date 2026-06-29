import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import logoRubal from '../assets/logo_rubal.png';

function Presupuestos() {
    // Datos principales
    const [presupuestos, setPresupuestos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [nomencladores, setNomencladores] = useState([]);

    // Modos de visualización y filtros
    const [vista, setVista] = useState('listado');
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [filtroAño, setFiltroAño] = useState('TODOS');
    const [cargando, setCargando] = useState(true);

    // Cabecera del Presupuesto
    const [presupuestoActivo, setPresupuestoActivo] = useState(null);
    const [idCliente, setIdCliente] = useState('');
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);
    const [idNomenclador, setIdNomenclador] = useState('');
    const [descTrabajo, setDescTrabajo] = useState('');
    const [descuento, setDescuento] = useState(0);

    // Estados dinámicos derivados de la selección del motor/nomenclador
    const [motorSeleccionado, setMotorSeleccionado] = useState(null);

    // Listas de Items en Memoria (se van agregando antes de impactar en Base de Datos)
    const [itemsMO, setItemsMO] = useState([]);
    const [itemsProductos, setItemsProductos] = useState([]);

    // Estados para Carga en Vivo / Buscador Inteligente de MANO DE OBRA
    const [busquedaMO, setBusquedaMO] = useState('');
    const [moSugeridas, setMoSugeridas] = useState([]);
    const [moSeleccionada, setMoSeleccionada] = useState(null);
    const [cantMO, setCantMO] = useState(1);
    const [factorMO, setFactorMO] = useState(1.00);

    // Estados para Carga de PRODUCTO (Texto Libre)
    const [prodTextoLibre, setProdTextoLibre] = useState('');
    const [cantProd, setCantProd] = useState(1);
    const [precioUnitarioProd, setPrecioUnitarioProd] = useState(0);
    const [tipoMotor, setTipoMotor] = useState('');
    // Estados para buscador de Motor/Tapa
    const [busquedaMotor, setBusquedaMotor] = useState('');
    const [motoresSugeridos, setMotoresSugeridos] = useState([]);

    // Nuevo estado para el descuento específico de Mano de Obra
    const [descuentoMO, setDescuentoMO] = useState(0);

    // Buscador Predictivo en Vivo para CLIENTES
    const RenderBuscadorCliente = (idActual, setIdFn) => (
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
                        setIdFn(''); // Borramos el ID para forzar que elija de la lista
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

    const limpiarFormulario = () => {
        setIdCliente('');
        setBusquedaCliente('');
        setTipoMotor('');
        setBusquedaMotor('');
        setIdNomenclador(null);
        setMotorSeleccionado(null);
        setDescTrabajo('');
        setDescuento(0);
        setDescuentoMO(0);
        setItemsMO([]);
        setItemsProductos([]);
        setPresupuestoActivo(null);
        setVista('nuevo');
    };

    const s = {
        card: { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '98%', margin: '0 auto 20px auto' },
        pill: (activo) => ({ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activo ? '#dc2626' : '#e2e8f0', color: activo ? '#fff' : '#475569', fontWeight: 'bold' }),
        inputModerno: { padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '350px', outline: 'none' },
        input: { padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', outline: 'none' },
        th: { background: '#f8fafc', padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' },
        td: { padding: '10px 8px', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', whiteSpace: 'nowrap' },
        btnPr: { background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
        btnOk: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
        btnSec: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
        lbl: { fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#1e293b', fontSize: '0.9rem' }
    };

    // Estados para controlar la edición de la Mano de Obra en la tabla
    const [idMOEditando, setIdMOEditando] = useState(null);
    const [cantMOEditando, setCantMOEditando] = useState(1);

    // Función para impactar el cambio de cantidad y recalcular el total de esa fila
    const handleGuardarEdicionMO = (id_temp) => {
        if (cantMOEditando < 1) return;
        setItemsMO(itemsMO.map(item => {
            if (item.id_temp === id_temp) {
                const nuevoTotal = Number((item.precio_unitario * cantMOEditando).toFixed(2));
                return { ...item, cantidad: cantMOEditando, precio_total: nuevoTotal };
            }
            return item;
        }));
        setIdMOEditando(null); // Cierra el modo edición
    };

    // Estados para controlar la edición de Productos/Repuestos en la tabla
    const [idProdEditando, setIdProdEditando] = useState(null);
    const [cantProdEditando, setCantProdEditando] = useState(1);
    const [precioProdEditando, setPrecioProdEditando] = useState(0);

    // Función para impactar la edición del producto y recalcular su total
    const handleGuardarEdicionProd = (id_temp) => {
        if (cantProdEditando < 1 || precioProdEditando < 0) return;

        setItemsProductos(itemsProductos.map(item => {
            if (item.id_temp === id_temp) {
                const nuevoTotal = Number((precioProdEditando * cantProdEditando).toFixed(2));
                return {
                    ...item,
                    cantidad: cantProdEditando,
                    precio_unitario: precioProdEditando,
                    precio_total: nuevoTotal
                };
            }
            return item;
        }));
        setIdProdEditando(null); // Cierra el modo edición
    };
    // --- FUNCIÓN PARA CARGAR EL MODO EDICIÓN CORREGIDA ---
    const abrirEdicion = async (p) => {
        setCargando(true);

        // 1. Buscamos la Mano de Obra y los Repuestos guardados
        const { data: mo } = await supabase.from('bd_presupuestos_mo').select('*, bd_mo(*)').eq('id_presupuesto', p.id).order('linea');
        const { data: prod } = await supabase.from('bd_presupuestos_p').select('*').eq('id_presupuesto', p.id).order('linea');

        // 2. Formateamos los ítems para la grilla temporal de React
        const moFormateada = (mo || []).map(m => ({
            ...m,
            id_temp: m.id,
            descripcion_servicio: m.bd_mo?.servicio || m.descripcion_servicio,
            factor: m.bd_mo?.factor || 1
        }));

        const prodFormateado = (prod || []).map(pr => ({
            ...pr,
            id_temp: pr.id
        }));

        // 3. Cargamos la Cabecera solucionando el problema del buscador predictivo de motor
        setIdCliente(p.id_cliente);
        setBusquedaCliente(`${p.bd_clientes?.nombre || ''} ${p.bd_clientes?.apellido || ''}`);
        setTipoMotor(p.bd_nomenclador?.tipo || '');
        setIdNomenclador(p.id_nomenclador);
        setMotorSeleccionado(p.bd_nomenclador);
        setBusquedaMotor(p.bd_nomenclador?.descripcion || ''); // <-- SOLUCIÓN: Cargamos el texto para que el buscador lo mantenga en pantalla
        setDescTrabajo(p.descripcion_trabajo || ''); // <-- Vincula la observación/descripción guardada

        setDescuento(p.descuento_porcentaje || 0);
        setDescuentoMO(p.descuento_porcentaje_mo || 0);

        // 4. Cargamos los detalles en memoria
        setItemsMO(moFormateada);
        setItemsProductos(prodFormateado);

        // 5. Cambiamos la vista a modo edición
        setPresupuestoActivo(p);
        setVista('editar');
        setCargando(false);
    };

    // --- NUEVA FUNCIÓN PARA ELIMINAR PRESUPUESTO EN CASCADA ---
    const handleEliminarPresupuesto = async (id) => {
        const confirmar = window.confirm(`⚠️ ¿Está seguro que desea eliminar por completo el Presupuesto N° ${id}? Esta acción no se puede deshacer.`);
        if (!confirmar) return;

        try {
            setCargando(true);
            // Por integridad de base de datos, primero borramos los hijos dependientes
            await supabase.from('bd_presupuestos_mo').delete().eq('id_presupuesto', id);
            await supabase.from('bd_presupuestos_p').delete().eq('id_presupuesto', id);

            // Finalmente eliminamos la cabecera del presupuesto
            const { error } = await supabase.from('bd_presupuestos').delete().eq('id', id);

            if (error) throw error;

            alert(`✅ Presupuesto N° ${id} eliminado correctamente.`);
            cargarDatos(); // Recarga el listado principal
        } catch (error) {
            console.error("Error al eliminar presupuesto:", error.message);
            alert("No se pudo eliminar el presupuesto: " + error.message);
        } finally {
            setCargando(false);
        }
    };

    const abrirVistaPrevia = async (p) => {
        setCargando(true);
        // 1. Buscamos la Mano de Obra cruzando con la tabla bd_mo para traer los nombres
        const { data: mo } = await supabase
            .from('bd_presupuestos_mo')
            .select('*, bd_mo(*)')
            .eq('id_presupuesto', p.id)
            .order('linea');

        // 2. Buscamos los Productos guardados
        const { data: prod } = await supabase
            .from('bd_presupuestos_p')
            .select('*')
            .eq('id_presupuesto', p.id)
            .order('linea');

        setItemsMO(mo || []);
        setItemsProductos(prod || []);
        setPresupuestoActivo(p);
        setVista('ver');
        setCargando(false);
    };

    const handleImprimir = () => {
        const p = presupuestoActivo;
        const nombreCliente = p.bd_clientes ? `${p.bd_clientes.nombre} ${p.bd_clientes.apellido}` : 'Cliente';
        const fechaArmada = p.fecha_presupuesto.split('-').reverse().join('-'); // Formato DD-MM-YYYY

        // Cambiamos el título de la página temporalmente para que el PDF tome este nombre
        const tituloOriginal = document.title;
        document.title = `Presupuesto N° ${p.id} - ${nombreCliente} - ${fechaArmada}`;

        window.print(); // Lanza el diálogo de impresión/PDF del navegador

        document.title = tituloOriginal; // Restauramos el título original
    };

    const calcularFechaVencimiento = (fechaStr) => {
        if (!fechaStr) return '';
        const partes = fechaStr.split('-');
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        d.setDate(d.getDate() + 1); // Sumamos 1 día
        return d.toLocaleDateString('es-AR');
    };

    useEffect(() => {
        // Si la vista es 'listado', recargamos todo
        if (vista === 'listado') {
            cargarDatos();
        }
        // Si la vista es 'nuevo', nos aseguramos de que esté limpio
        else if (vista === 'nuevo') {
            limpiarFormulario();
        }
    }, [vista]);

    // Buscador Predictivo en Vivo para MOTORES
    useEffect(() => {
        if (busquedaMotor.length < 2) {
            setMotoresSugeridos([]);
            return;
        }
        // Si ya seleccionó uno y el texto coincide, ocultamos la lista
        if (motorSeleccionado && busquedaMotor === motorSeleccionado.descripcion) {
            setMotoresSugeridos([]);
            return;
        }

        const term = busquedaMotor.toLowerCase();
        // Filtramos en memoria. Si eligió un "tipoMotor", filtramos por ese tipo también.
        const filtrados = nomencladores.filter(n =>
            (tipoMotor === '' || n.tipo === tipoMotor) &&
            n.descripcion.toLowerCase().includes(term)
        ).slice(0, 15); // Mostramos máximo 15 para no saturar la pantalla

        setMotoresSugeridos(filtrados);
    }, [busquedaMotor, nomencladores, tipoMotor, motorSeleccionado]);

    // Cuando el usuario hace clic en una sugerencia del motor
    const handleSeleccionarMotor = (motor) => {
        setIdNomenclador(motor.id);
        setMotorSeleccionado(motor);
        setBusquedaMotor(motor.descripcion); // Llenamos el input con el nombre completo
        setMotoresSugeridos([]); // Cerramos la lista
        setItemsMO([]); // Limpiamos la MO porque al cambiar el motor, cambia la categoría
    };

    // Buscador Predictivo en Vivo para MANO DE OBRA (Igual que en trabajos)
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
                .limit(10);
            setMoSugeridas(data || []);
        };
        const timeoutId = setTimeout(buscarMO, 300);
        return () => clearTimeout(timeoutId);
    }, [busquedaMO]);

    const cargarDatos = async () => {
        setCargando(true);
        const [bp, bc, bn] = await Promise.all([
            supabase.from('bd_presupuestos').select('*, bd_clientes(*), bd_nomenclador(*)').order('id', { ascending: false }),
            supabase.from('bd_clientes').select('*').order('nombre'),
            supabase.from('bd_nomenclador').select('*').order('descripcion')
        ]);
        if (bp.data) setPresupuestos(bp.data);
        if (bc.data) setClientes(bc.data);
        if (bn.data) setNomencladores(bn.data);
        setCargando(false);
    };

    // Manejo del cambio de Motor/Tapa para deducir categoría y tipo automáticamente
    const handleCambioNomenclador = (id) => {
        setIdNomenclador(id);
        const nom = nomencladores.find(n => String(n.id) === String(id));
        setMotorSeleccionado(nom || null);
        // Si cambia de motor, limpiamos las MOs agregadas porque cambiarían de precio según categoría
        setItemsMO([]);
    };

    // Lógica matemática para cálculo de Mano de Obra solicitado
    // Lógica matemática para cálculo de Mano de Obra
    const handleAgregarMO = () => {
        if (!motorSeleccionado) {
            alert("⚠️ Primero debe seleccionar un Motor / Tapa para conocer su categoría de liquidación.");
            return;
        }
        if (!moSeleccionada) {
            alert("⚠️ Seleccione un servicio válido del buscador inteligente.");
            return;
        }

        const cat = motorSeleccionado.categoria_mo;
        const campoPrecioCat = `cat_${cat}`;
        const precioBaseTabla = moSeleccionada[campoPrecioCat] || 0;

        // ACA ESTÁ EL CAMBIO: Extraemos el factor directo de bd_mo. Si es nulo, asumimos 1.
        const factorBD = moSeleccionada.factor !== undefined && moSeleccionada.factor !== null ? Number(moSeleccionada.factor) : 1;

        // Fórmula: precio_unitario = cat_x * factorBD
        const precioUnitarioCalculado = Number((precioBaseTabla * factorBD).toFixed(2));
        const precioTotalCalculado = Number((precioUnitarioCalculado * cantMO).toFixed(2));

        const nuevoItem = {
            id_temp: Date.now(),
            item_servicio: moSeleccionada.codigo_mo,
            descripcion_servicio: moSeleccionada.servicio,
            cantidad: cantMO,
            factor: factorBD, // Guardamos el factor real que se aplicó
            precio_unitario: precioUnitarioCalculado,
            precio_total: precioTotalCalculado
        };

        setItemsMO([...itemsMO, nuevoItem]);

        // Limpiamos los inputs (eliminamos la referencia al state de factor)
        setBusquedaMO('');
        setMoSeleccionada(null);
        setCantMO(1);
    };

    // Agregar Producto de Texto Libre solicitado
    const handleAgregarProductoLibre = () => {
        if (!prodTextoLibre.trim()) {
            alert("⚠️ Escriba una descripción para el producto.");
            return;
        }

        const precioTotalCalculado = Number((precioUnitarioProd * cantProd).toFixed(2));

        const nuevoItem = {
            id_temp: Date.now(),
            producto_texto_libre: prodTextoLibre,
            cantidad: cantProd,
            precio_unitario: precioUnitarioProd,
            precio_total: precioTotalCalculado
        };

        setItemsProductos([...itemsProductos, nuevoItem]);
        // Reset inputs de Productos
        setProdTextoLibre('');
        setCantProd(1);
        setPrecioUnitarioProd(0);
    };

    // Cálculos de Totales de la Ficha en vivo
    // --- CÁLCULOS MATEMÁTICOS DE LA FICHA EN VIVO ---
    const totalMO = itemsMO.reduce((acc, curr) => acc + curr.precio_total, 0);
    const totalProd = itemsProductos.reduce((acc, curr) => acc + curr.precio_total, 0);

    // 1. Matemática específica para la Mano de Obra
    const descuentoMOMonto = totalMO * (Number(descuentoMO) / 100);
    const totalMOFinal = totalMO - descuentoMOMonto;

    // 2. Matemática del Subtotal General (Ahora el subtotal real con IVA antes del desc. general es la MO ya afectada + Repuestos)
    const subtotal = totalMOFinal + totalProd;

    // 3. Matemática del Descuento General (Aplica sobre el remanente)
    const descuentoMonto = subtotal * (Number(descuento) / 100);
    const totalFinalConIva = subtotal - descuentoMonto;

    // Guardado Final en Supabase (Cabecera e items relacionados)
    const handleGuardarPresupuestoCompleto = async () => {
        if (!idCliente || !idNomenclador) {
            alert("⚠️ Por favor complete los campos obligatorios (*)");
            return;
        }

        let presuId = presupuestoActivo?.id; // Variable clave para saber el ID

        // 1. CABECERA (Lógica para NUEVO o EDICIÓN)
        if (vista === 'nuevo') {
            const { data: presuCreado, error: errCabecera } = await supabase
                .from('bd_presupuestos')
                .insert([{
                    id_cliente: idCliente,
                    id_nomenclador: idNomenclador,
                    descripcion_trabajo: descTrabajo,
                    subtotal_con_iva: subtotal,
                    total_mo_bruto: totalMO,
                    descuento_porcentaje: descuento,
                    descuento_porcentaje_mo: descuentoMO, // <-- Nuestro nuevo campo
                    total_presupuesto_con_iva: totalFinalConIva,
                    estado: 'PENDIENTE',
                    fecha_presupuesto: new Date().toISOString().split('T')[0]
                }])
                .select()
                .single();

            if (errCabecera) {
                alert("Error al guardar cabecera: " + errCabecera.message);
                return;
            }
            presuId = presuCreado.id; // Capturamos el ID del nuevo

        } else if (vista === 'editar') {
            const { error: errCabecera } = await supabase
                .from('bd_presupuestos')
                .update({
                    id_cliente: idCliente,
                    id_nomenclador: idNomenclador,
                    descripcion_trabajo: descTrabajo,
                    subtotal_con_iva: subtotal,
                    descuento_porcentaje: descuento,
                    descuento_porcentaje_mo: descuentoMO, // <-- Nuestro nuevo campo
                    total_mo_bruto: totalMO,
                    total_presupuesto_con_iva: totalFinalConIva
                })
                .eq('id', presuId);

            if (errCabecera) {
                alert("Error al actualizar cabecera: " + errCabecera.message);
                return;
            }

            // IMPORTANTE: Al editar, borramos los ítems viejos para reemplazar por los actuales de la pantalla
            await supabase.from('bd_presupuestos_mo').delete().eq('id_presupuesto', presuId);
            await supabase.from('bd_presupuestos_p').delete().eq('id_presupuesto', presuId);
        }

        // 2. Mapear e Insertar Manos de Obra
        if (itemsMO.length > 0) {
            const ganchosMO = itemsMO.map((item, index) => ({
                id_presupuesto: presuId, // Usamos presuId genérico
                linea: index + 1,
                item_servicio: item.item_servicio,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                precio_total: item.precio_total
            }));
            const { error: errMO } = await supabase.from('bd_presupuestos_mo').insert(ganchosMO);
            if (errMO) console.error("Error en items MO:", errMO.message);
        }

        // 3. Mapear e Insertar Productos de Texto Libre
        if (itemsProductos.length > 0) {
            const ganchosProd = itemsProductos.map((item, index) => ({
                id_presupuesto: presuId, // Usamos presuId genérico
                linea: index + 1,
                producto_texto_libre: item.producto_texto_libre,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                precio_total: item.precio_total
            }));
            const { error: errP } = await supabase.from('bd_presupuestos_p').insert(ganchosProd);
            if (errP) console.error("Error en items Productos:", errP.message);
        }

        alert(`✅ Presupuesto ${vista === 'nuevo' ? 'guardado' : 'actualizado'} con éxito.`);

        // 4. Limpieza de Formulario y retorno al listado
        setVista('listado');
        setPresupuestoActivo(null);
        setIdCliente('');
        setTipoMotor('');
        setBusquedaMotor('');
        setIdNomenclador('');
        setDescTrabajo('');
        setDescuento(0);
        setDescuentoMO(0);
        setMotorSeleccionado(null);
        setItemsMO([]);
        setItemsProductos([]);
        cargarDatos();
    };

    // Calculamos dinámicamente los años existentes en la base de datos
    const añosDisponibles = [...new Set([
        ...presupuestos.map(p => p.fecha_presupuesto ? new Date(p.fecha_presupuesto).getFullYear().toString() : ''),
        new Date().getFullYear().toString() // Por las dudas, siempre mostramos el año actual
    ])].filter(Boolean).sort().reverse();

    // Filtro maestro (Texto, Estado y Año)
    const filtrarPresupuestos = presupuestos.filter(p => {
        const coincideEstado = filtroEstado === 'TODOS' || p.estado === filtroEstado;
        const añoPresupuesto = p.fecha_presupuesto ? new Date(p.fecha_presupuesto).getFullYear().toString() : '';
        const coincideAño = filtroAño === 'TODOS' || añoPresupuesto === filtroAño;

        const term = busqueda.toLowerCase();
        const strCliente = `${p.bd_clientes?.nombre || ''} ${p.bd_clientes?.apellido || ''}`.toLowerCase();
        const strMotor = (p.bd_nomenclador?.descripcion || '').toLowerCase();

        return coincideEstado && coincideAño && (strCliente.includes(term) || strMotor.includes(term) || p.id.toString().includes(term));
    });

    const tiposMotoresUnicos = [...new Set(nomencladores.map(n => n.tipo))].filter(Boolean);
    const nomencladoresFiltrados = tipoMotor ? nomencladores.filter(n => n.tipo === tipoMotor) : [];

    const handleCopiarPresupuesto = async (p) => {
        const confirmar = window.confirm(`📋 ¿Desea crear un nuevo presupuesto basado en el N° ${p.id}?`);
        if (!confirmar) return;

        setCargando(true);

        try {
            // 1. Buscamos los hijos del presupuesto original de forma explícita
            const { data: mo, error: errMO } = await supabase
                .from('bd_presupuestos_mo')
                .select('*, bd_mo(*)')
                .eq('id_presupuesto', p.id);

            const { data: prod, error: errP } = await supabase
                .from('bd_presupuestos_p')
                .select('*')
                .eq('id_presupuesto', p.id);

            if (errMO) console.error("Error MO:", errMO);
            if (errP) console.error("Error Prod:", errP);

            console.log("Datos copiados - MO:", mo, "Productos:", prod);

            // 2. Formateamos los ítems (usamos Date.now() para asegurar IDs únicos)
            const itemsMOCopiados = (mo || []).map(m => ({
                id_temp: Date.now() + Math.random(),
                item_servicio: m.item_servicio,
                descripcion_servicio: m.bd_mo?.servicio || m.descripcion_servicio || 'Servicio',
                cantidad: m.cantidad,
                factor: m.factor || 1,
                precio_unitario: m.precio_unitario,
                precio_total: m.precio_total
            }));

            const itemsProdCopiados = (prod || []).map(pr => ({
                id_temp: Date.now() + Math.random(),
                producto_texto_libre: pr.producto_texto_libre,
                cantidad: pr.cantidad,
                precio_unitario: pr.precio_unitario,
                precio_total: pr.precio_total
            }));

            // 3. Seteamos los estados usando una única operación de actualización
            // Es vital limpiar primero para que el nuevo estado se aplique sobre un formulario vacío
            limpiarFormulario();

            // Damos un pequeño respiro para asegurar que el DOM esté limpio
            setTimeout(() => {
                setItemsMO(itemsMOCopiados);
                setItemsProductos(itemsProdCopiados);

                // Cargamos cabecera
                setIdCliente(p.id_cliente); // Aseguramos que se copie el ID
                setBusquedaCliente(`${p.bd_clientes?.nombre || ''} ${p.bd_clientes?.apellido || ''}`); // Llenamos el input visual
                setIdNomenclador(p.id_nomenclador);
                setMotorSeleccionado(p.bd_nomenclador);
                setBusquedaMotor(p.bd_nomenclador?.descripcion || '');
                setTipoMotor(p.bd_nomenclador?.tipo || '');
                setDescuento(p.descuento_porcentaje || 0);
                setDescuentoMO(p.descuento_porcentaje_mo || 0);
                setVista('nuevo');
                setCargando(false);
                console.log("Formulario cargado con:", { itemsMOCopiados, itemsProdCopiados });
            }, 100);

        } catch (error) {
            console.error("Error fatal en copia:", error);
            setCargando(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={s.card}>

                {/* --- VISTA LISTADO --- */}
                {vista === 'listado' && (
                    <>
                        {/* CABECERA Y BUSCADOR */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ margin: 0 }}>💰 Presupuestos</h2>
                                {/* CONTADOR DE RESULTADOS */}
                                <span style={{ background: '#33619c', color: '#fdfdfd', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    {filtrarPresupuestos.length} resultados
                                </span>
                            </div>
                            <input type="text" style={s.inputModerno} placeholder="🔍 Buscar cliente, motor o N°..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                            <button style={s.btnPr} onClick={limpiarFormulario}>
                                + Nuevo Presupuesto
                            </button>
                        </div>
                        {/* CONTENEDOR DE FILTROS PILL (AÑO Y ESTADO) */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>

                            {/* Filtros de Año */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Año:</span>
                                <button style={s.pill(filtroAño === 'TODOS')} onClick={() => setFiltroAño('TODOS')}>TODOS</button>
                                {añosDisponibles.map(anio => (
                                    <button key={anio} style={s.pill(filtroAño === anio)} onClick={() => setFiltroAño(anio)}>{anio}</button>
                                ))}
                            </div>

                            {/* Separador visual */}
                            <div style={{ width: '1px', background: '#cbd5e1' }}></div>

                            {/* Filtros de Estado */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Estado:</span>
                                {['TODOS', 'PENDIENTE', 'APROBADO', 'RECHAZADO'].map(op => (
                                    <button key={op} style={s.pill(filtroEstado === op)} onClick={() => setFiltroEstado(op)}>{op}</button>
                                ))}
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...s.th, width: '60px' }}>Nro</th>
                                    <th style={{ ...s.th, width: '180px' }}>Cliente</th>
                                    <th style={{ ...s.th, width: 'auto' }}>Modelo</th>
                                    <th style={{ ...s.th, width: '100px' }}>Fecha</th>
                                    <th style={{ ...s.th, width: '100px' }}>Estado</th>
                                    <th style={{ ...s.th, width: '100px', textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrarPresupuestos.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ ...s.td, fontWeight: 'bold' }}>#{p.id}</td>
                                        <td style={{ ...s.td, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.bd_clientes?.nombre} {p.bd_clientes?.apellido}</td>
                                        <td style={{ ...s.td, fontWeight: '500', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.bd_nomenclador?.descripcion}</td>
                                        <td style={s.td}>
                                            {p.fecha_presupuesto ? p.fecha_presupuesto.split('-').reverse().join('/') : '-'}
                                        </td>
                                        <td style={s.td}>
                                            <span style={{
                                                display: 'block', width: '80px', textAlign: 'center', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                backgroundColor: p.estado === 'APROBADO' ? '#dcfce7' : p.estado === 'RECHAZADO' ? '#fee2e2' : '#fef9c3',
                                                color: p.estado === 'APROBADO' ? '#166534' : p.estado === 'RECHAZADO' ? '#991b1b' : '#854d0e'
                                            }}>{p.estado}</span>
                                        </td>
                                        <td style={{ ...s.td, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '1.05rem' }}>
                                                <span style={{ cursor: 'pointer' }} title="Ver / Imprimir" onClick={() => abrirVistaPrevia(p)}>👁️</span>
                                                <span style={{ cursor: 'pointer' }} title="Editar" onClick={() => abrirEdicion(p)}>✏️</span>
                                                <span
                                                    style={{ cursor: 'pointer' }}
                                                    title="Copiar Presupuesto"
                                                    onClick={() => handleCopiarPresupuesto(p)}
                                                >
                                                    📋
                                                </span>
                                                <span style={{ cursor: 'pointer', color: '#dc2626' }} title="Eliminar Presupuesto" onClick={() => handleEliminarPresupuesto(p.id)}>🗑️</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* --- VISTA COMPLETA DE CARGA --- */}
                {(vista === 'nuevo' || vista === 'editar') && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            <h2 style={{ margin: 0 }}>{vista === 'nuevo' ? '✨ Creación de Presupuesto' : `✏️ Editar Presupuesto #${presupuestoActivo?.id}`}</h2>
                            <button style={s.btnSec} onClick={() => setVista('listado')}>← Cancelar y Volver</button>
                        </div>

                        {/* 1. SECCIÓN CABECERA */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>

                            {/* --- FILA 1: DATOS COMPLETOS DEL CLIENTE --- */}
                            <div>
                                <label style={s.lbl}>Cliente *</label>
                                {RenderBuscadorCliente(idCliente, setIdCliente)}
                            </div>

                            <div>
                                <label style={s.lbl}>Dirección</label>
                                <input
                                    type="text"
                                    style={{ ...s.input, background: '#f1f5f9' }}
                                    value={idCliente ? (clientes.find(c => String(c.id) === String(idCliente))?.direccion || '-') : '-'}
                                    disabled
                                />
                            </div>

                            <div>
                                <label style={s.lbl}>Localidad</label>
                                <input
                                    type="text"
                                    style={{ ...s.input, background: '#f1f5f9' }}
                                    value={idCliente ? (clientes.find(c => String(c.id) === String(idCliente))?.localidad || '-') : '-'}
                                    disabled
                                />
                            </div>

                            <div>
                                <label style={s.lbl}>Teléfono</label>
                                <input
                                    type="text"
                                    style={{ ...s.input, background: '#f1f5f9' }}
                                    value={idCliente ? (clientes.find(c => String(c.id) === String(idCliente))?.telefono || '-') : '-'}
                                    disabled
                                />
                            </div>

                            {/* --- FILA 2: DATOS DEL MOTOR / NOMENCLADOR --- */}
                            <div>
                                <label style={s.lbl}>Tipo Componente *</label>
                                <select style={s.input} value={tipoMotor} onChange={e => {
                                    setTipoMotor(e.target.value);
                                    setIdNomenclador('');
                                    setMotorSeleccionado(null);
                                    setItemsMO([]);
                                }}>
                                    <option value="">-- Seleccionar Tipo --</option>
                                    {tiposMotoresUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* El buscador de modelo ocupa 2 columnas completas para dar espacio al texto fierrero largo */}
                            <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                                <label style={s.lbl}>Motor / Tapa (Modelo) *</label>
                                <input
                                    type="text"
                                    style={s.input}
                                    placeholder="🔎 Escriba modelo para buscar..."
                                    value={busquedaMotor}
                                    onChange={e => {
                                        setBusquedaMotor(e.target.value);
                                        if (motorSeleccionado) {
                                            setMotorSeleccionado(null);
                                            setIdNomenclador('');
                                            setItemsMO([]);
                                        }
                                    }}
                                    disabled={!tipoMotor}
                                />

                                {/* LISTA DESPLEGABLE DE SUGERENCIAS */}
                                {motoresSugeridos.length > 0 && (
                                    <ul style={{
                                        position: 'absolute', top: '100%', left: 0, background: '#fff',
                                        border: '1px solid #cbd5e1', borderRadius: '6px', listStyle: 'none',
                                        padding: 0, margin: '4px 0 0 0', zIndex: 99, width: '100%',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto'
                                    }}>
                                        {motoresSugeridos.map(m => (
                                            <li
                                                key={m.id}
                                                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                                                onClick={() => handleSeleccionarMotor(m)}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                {m.descripcion}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div>
                                <label style={s.lbl}>Categoría del Motor</label>
                                <input
                                    type="text"
                                    style={{ ...s.input, background: '#e2e8f0', fontWeight: 'bold', color: '#dc2626' }}
                                    value={motorSeleccionado ? `Categoría ${motorSeleccionado.categoria_mo}` : '-'}
                                    disabled
                                />
                            </div>

                            {/* --- FILA 3: DESCRIPCIÓN / OBSERVACIONES GENERALES --- */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={s.lbl}>Descripción General del Trabajo / Observaciones</label>
                                <textarea
                                    style={{ ...s.input, height: '70px', resize: 'vertical' }}
                                    value={descTrabajo}
                                    onChange={e => setDescTrabajo(e.target.value)}
                                    placeholder="Detalle sobre las condiciones, especificaciones extras, fallas encontradas o requerimientos planteados por el cliente..."
                                />
                            </div>

                        </div>

                        {/* 2. CONTENEDOR DE BLOQUES OPERATIVOS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '25px', width: '100%' }}>

                            {/* BLOQUE MANOS DE OBRA */}
                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
                                <h3 style={{ marginTop: 0, color: '#dc2626', fontSize: '1.1rem' }}>⚙️ Mano de Obra</h3>

                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center', position: 'relative' }}>
                                    <div style={{ flex: 1 }}>
                                        <input type="text" style={s.input} placeholder="🔎 Escriba para buscar servicio ..." value={busquedaMO} onChange={e => setBusquedaMO(e.target.value)} />
                                        {moSugeridas.length > 0 && (
                                            <ul style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', listStyle: 'none', padding: 0, margin: '4px 0 0 0', zIndex: 99, width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                {moSugeridas.map(m => (
                                                    <li key={m.codigo_mo} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                                        onClick={() => { setMoSeleccionada(m); setBusquedaMO(m.servicio); setMoSugeridas([]); }}>
                                                        {m.servicio}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <input type="number" min="1" style={{ ...s.input, width: '80px' }} title="Cantidad" value={cantMO} onChange={e => setCantMO(Number(e.target.value))} />

                                    {/* CARTEL INFORMATIVO DEL FACTOR */}
                                    {moSeleccionada && (
                                        <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.9rem', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }} title="Este factor modifica el precio final del servicio.">
                                            Factor: {moSeleccionada.factor !== null ? moSeleccionada.factor : 1}
                                        </div>
                                    )}

                                    <button style={s.btnPr} onClick={handleAgregarMO}>+</button>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ background: '#cbd5e1' }}>
                                            <th style={{ padding: '10px 8px', textAlign: 'left' }}>Servicio</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '90px' }}>Cant</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>Factor</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right', width: '120px' }}>Unit.</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right', width: '120px' }}>Total</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsMO.map(item => (
                                            <tr key={item.id_temp} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 8px' }}>{item.descripcion_servicio}</td>

                                                {/* CELDA CANTIDAD DINÁMICA (Si está editando muestra un input chico) */}
                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                    {idMOEditando === item.id_temp ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            style={{ ...s.input, padding: '5px', width: '60px', textAlign: 'center' }}
                                                            value={cantMOEditando}
                                                            onChange={e => setCantMOEditando(Number(e.target.value))}
                                                        />
                                                    ) : (
                                                        item.clamp || item.cantidad
                                                    )}
                                                </td>

                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>{(item.factor || 1).toFixed(2)}</td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>${item.precio_unitario}</td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>${item.precio_total}</td>

                                                {/* ACCIONES DINÁMICAS (Lápiz/Tacho o Guardar/Cancelar) */}
                                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '1.1rem' }}>
                                                    {idMOEditando === item.id_temp ? (
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                            <span style={{ cursor: 'pointer' }} title="Guardar cantidad" onClick={() => handleGuardarEdicionMO(item.id_temp)}>💾</span>
                                                            <span style={{ cursor: 'pointer' }} title="Cancelar" onClick={() => setIdMOEditando(null)}>❌</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                                            <span style={{ cursor: 'pointer' }} title="Editar Cantidad" onClick={() => { setIdMOEditando(item.id_temp); setCantMOEditando(item.cantidad); }}>✏️</span>
                                                            <span style={{ cursor: 'pointer', color: 'red' }} title="Quitar" onClick={() => setItemsMO(itemsMO.filter(i => i.id_temp !== item.id_temp))}>🗑️</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {itemsMO.length === 0 && <tr><td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>No hay manos de obra agregadas.</td></tr>}
                                    </tbody>
                                </table>

                                {/* NUEVA SECCIÓN: TOTALES DE SERVICIOS CON DESCUENTO */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '15px' }}>

                                    {/* Input Editable del Descuento MO */}
                                    <div>
                                        <label style={{ ...s.lbl, marginBottom: '4px' }}>Descuento Mano de obra (%)</label>
                                        <input
                                            type="number"
                                            min="0" max="100"
                                            style={{ ...s.input, width: '140px' }}
                                            value={descuentoMO}
                                            onChange={e => setDescuentoMO(Number(e.target.value))}
                                        />
                                    </div>

                                    {/* Cuadro Resumen de la Mano de Obra */}
                                    <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'right' }}>
                                        <div>
                                            <span style={{ color: '#475569', fontSize: '0.95rem', marginRight: '15px' }}>Subtotal Servicios:</span>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>${totalMO.toFixed(2)}</span>
                                        </div>

                                        {/* Solo aparece si hay descuento MO cargado */}
                                        {descuentoMO > 0 && (
                                            <>
                                                <div style={{ color: '#b45309' }}>
                                                    <span style={{ fontSize: '0.9rem', marginRight: '15px' }}>Bonificación servicios ({descuentoMO}%):</span>
                                                    <span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>-${descuentoMOMonto.toFixed(2)}</span>
                                                </div>
                                                <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '5px', paddingTop: '5px' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1rem', marginRight: '15px' }}>Total Servicios:</span>
                                                    <span style={{ fontWeight: '900', color: '#dc2626', fontSize: '1.15rem' }}>${totalMOFinal.toFixed(2)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* BLOQUE PRODUCTOS / REPUESTOS LIBRES */}
                            {/* BLOQUE PRODUCTOS / REPUESTOS LIBRES */}
                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
                                <h3 style={{ marginTop: 0, color: '#dc2626', fontSize: '1.1rem' }}>📦 Repuestos</h3>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                    <input type="text" style={{ ...s.input, flex: 1 }} placeholder="Escriba la descripción del repuesto o pieza a solicitar..." value={prodTextoLibre} onChange={e => setProdTextoLibre(e.target.value)} />
                                    <input type="number" min="1" style={{ ...s.input, width: '80px' }} placeholder="Cant" title="Cantidad" value={cantProd} onChange={e => setCantProd(Number(e.target.value))} />
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 10px' }}>
                                        <span style={{ color: '#64748b', fontWeight: 'bold' }}>$</span>
                                        <input type="number" min="0" style={{ padding: '10px', border: 'none', width: '100px', outline: 'none' }} placeholder="Unitario" value={precioUnitarioProd} onChange={e => setPrecioUnitarioProd(Number(e.target.value))} />
                                    </div>
                                    <button style={s.btnPr} onClick={handleAgregarProductoLibre}>+</button>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ background: '#cbd5e1' }}>
                                            <th style={{ padding: '10px 8px', textAlign: 'left' }}>Producto / Descripción</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '90px' }}>Cant</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right', width: '130px' }}>Unit.</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right', width: '120px' }}>Total</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsProductos.map(item => (
                                            <tr key={item.id_temp} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '10px 8px' }}>{item.producto_texto_libre}</td>

                                                {/* CELDA CANTIDAD DINÁMICA */}
                                                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                    {idProdEditando === item.id_temp ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            style={{ ...s.input, padding: '5px', width: '60px', textAlign: 'center' }}
                                                            value={cantProdEditando}
                                                            onChange={e => setCantProdEditando(Number(e.target.value))}
                                                        />
                                                    ) : (
                                                        item.cantidad
                                                    )}
                                                </td>

                                                {/* CELDA PRECIO UNITARIO DINÁMICO */}
                                                <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                                    {idProdEditando === item.id_temp ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                            <span>$</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                style={{ ...s.input, padding: '5px', width: '80px', textAlign: 'right' }}
                                                                value={precioProdEditando}
                                                                onChange={e => setPrecioProdEditando(Number(e.target.value))}
                                                            />
                                                        </div>
                                                    ) : (
                                                        `$${item.precio_unitario}`
                                                    )}
                                                </td>

                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>${item.precio_total}</td>

                                                {/* ACCIONES DINÁMICAS */}
                                                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '1.1rem' }}>
                                                    {idProdEditando === item.id_temp ? (
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                            <span style={{ cursor: 'pointer' }} title="Guardar cambios" onClick={() => handleGuardarEdicionProd(item.id_temp)}>💾</span>
                                                            <span style={{ cursor: 'pointer' }} title="Cancelar" onClick={() => setIdProdEditando(null)}>❌</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                                            <span style={{ cursor: 'pointer' }} title="Editar Cantidad/Precio" onClick={() => {
                                                                setIdProdEditando(item.id_temp);
                                                                setCantProdEditando(item.cantidad);
                                                                setPrecioProdEditando(item.precio_unitario);
                                                            }}>✏️</span>
                                                            <span style={{ cursor: 'pointer', color: 'red' }} title="Quitar" onClick={() => setItemsProductos(itemsProductos.filter(i => i.id_temp !== item.id_temp))}>🗑️</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {itemsProductos.length === 0 && <tr><td colSpan="5" style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>No hay repuestos detallados.</td></tr>}
                                    </tbody>
                                </table>

                                {/* NUEVA SECCIÓN: SUBTOTAL REPUESTOS */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', paddingRight: '8px' }}>
                                    <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.95rem' }}>Subtotal Repuestos:</span>
                                        <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '1.15rem' }}>${totalProd.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* 3. SECCIÓN INFERIOR DE TOTALES Y GUARDADO (CONSOLIDADOR FINAL) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '25px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '30px' }}>

                            {/* Control de Descuento General (Aplica al remanente) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ ...s.lbl, marginBottom: '0px' }}>Descuento General (%)</label>
                                <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 10px', width: '130px' }}>
                                    <input type="number" min="0" max="100" style={{ padding: '10px 0', border: 'none', width: '70px', outline: 'none', fontSize: '1rem', fontWeight: 'bold', textAlign: 'center' }} value={descuento} onChange={e => setDescuento(Number(e.target.value))} />
                                    <span style={{ color: '#64748b', fontWeight: 'bold', fontSize: '1.1rem' }}>%</span>
                                </div>
                            </div>

                            {/* Desglose de Números en el Centro/Derecha */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 25px', fontSize: '0.95rem', textAlign: 'right', alignItems: 'center' }}>

                                {/* Mostramos el Bruto Puro inicial (Servicios sin desc + Repuestos) */}
                                <div style={{ color: '#475569' }}>Subtotal con IVA (MO + Repuestos):</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>${(totalMO + totalProd).toFixed(2)}</div>

                                {/* Si hay Bonificación de Servicios, se lista acá */}
                                {descuentoMO > 0 && (
                                    <>
                                        <div style={{ color: '#b45309' }}>Bonificación servicios ({descuentoMO}%):</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#b45309', fontStyle: 'italic' }}>-${descuentoMOMonto.toFixed(2)}</div>
                                    </>
                                )}

                                {/* Si hay Bonificación General, se lista acá */}
                                {descuento > 0 && (
                                    <>
                                        <div style={{ color: '#b45309' }}>Bonificación general ({descuento}%):</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#b45309', fontStyle: 'italic' }}>-${descuentoMonto.toFixed(2)}</div>
                                    </>
                                )}

                                <div style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1.05rem', borderTop: '2px solid #cbd5e1', paddingTop: '8px' }}>TOTAL PRESUPUESTO:</div>
                                <div style={{ fontWeight: '900', fontSize: '1.5rem', color: '#dc2626', borderTop: '2px solid #cbd5e1', paddingTop: '8px' }}>${totalFinalConIva.toFixed(2)}</div>
                            </div>

                            <button style={{ ...s.btnOk, padding: '15px 30px', fontSize: '1rem', boxShadow: '0 4px 6px rgba(22, 163, 74, 0.2)' }} onClick={handleGuardarPresupuestoCompleto}>
                                💾 Guardar Presupuesto
                            </button>
                        </div>
                    </div>
                )}

                {/* --- VISTA DE IMPRESIÓN (A4) --- */}
                {vista === 'ver' && presupuestoActivo && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#e2e8f0', padding: '20px 0', borderRadius: '8px' }}>

                        {/* ESTILOS MÁGICOS PARA IMPRESIÓN */}
                        <style>{`
      @media print {
        body * { visibility: hidden; }
        #hoja-presupuesto, #hoja-presupuesto * { visibility: visible; }
        #hoja-presupuesto { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none !important; }
        .ocultar-impresion { display: none !important; }
        @page { size: A4 portrait; margin: 15mm; }
      }
    `}</style>

                        {/* BOTONERA SUPERIOR (Se oculta al imprimir) */}
                        <div className="ocultar-impresion" style={{ width: '210mm', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <button style={{ ...s.btnSec, background: '#64748b' }} onClick={() => setVista('listado')}>← Volver al Listado</button>
                            <button style={{ ...s.btnOk, background: '#dc2626', fontSize: '1.1rem' }} onClick={handleImprimir}>🖨️ Generar PDF / Imprimir</button>
                        </div>

                        {/* EL CONTENEDOR QUE SIMULA LA HOJA A4 */}
                        <div id="hoja-presupuesto" style={{
                            width: '210mm', minHeight: '297mm', background: '#fff', padding: '15mm',
                            boxSizing: 'border-box', boxShadow: '0 0 15px rgba(0,0,0,0.2)', fontFamily: 'Arial, sans-serif', color: '#000'
                        }}>

                            {/* 1. CABECERA DOCUMENTO CON LOGO IMPORTADO */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #dc2626', paddingBottom: '15px', marginBottom: '20px' }}>
                                {/* Redujimos el ancho del contenedor de 220px a 150px */}
                                <div style={{ width: '100px' }}>
                                    <img src={logoRubal} alt="Logo Rubal" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                                </div>

                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <h1 style={{ margin: 0, fontSize: '26px', letterSpacing: '4px', color: '#1e293b', fontWeight: 'bold' }}>PRESUPUESTO</h1>
                                </div>

                                <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#475569' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '2px' }}>
                                        N° {presupuestoActivo.id.toString().padStart(5, '0')}
                                    </div>
                                    <b>Fecha cotización:</b> {presupuestoActivo.fecha_presupuesto.split('-').reverse().join('/')}
                                </div>
                            </div>

                            {/* 2. DATOS DEL CLIENTE Y TRABAJO */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '0.9rem' }}>
                                <div style={{ width: '48%', background: '#f8fafc', padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    <b style={{ color: '#dc2626', display: 'block', marginBottom: '5px' }}>Datos del Cliente:</b>
                                    <b>Nombre:</b> {presupuestoActivo.bd_clientes?.nombre} {presupuestoActivo.bd_clientes?.apellido} <br />
                                    <b>Dirección:</b> {presupuestoActivo.bd_clientes?.direccion || '-'} <br />
                                    <b>Localidad:</b> {presupuestoActivo.bd_clientes?.localidad || '-'} <br />
                                    <b>Teléfono:</b> {presupuestoActivo.bd_clientes?.telefono || '-'}
                                </div>

                                <div style={{ width: '48%', background: '#f8fafc', padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    <b style={{ color: '#dc2626', display: 'block', marginBottom: '5px' }}>Motor/Tapa:</b>
                                    <b>Tipo:</b> {presupuestoActivo.bd_nomenclador?.tipo} <br />
                                    <b>Modelo:</b> {presupuestoActivo.bd_nomenclador?.descripcion} <br />
                                    {presupuestoActivo.descripcion_trabajo && (
                                        <div style={{ marginTop: '5px' }}>
                                            <b>Observaciones:</b> {presupuestoActivo.descripcion_trabajo}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. SECCIÓN MANOS DE OBRA / SERVICIOS */}
                            {itemsMO.length > 0 && (
                                <div style={{ marginBottom: '25px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', color: '#1e293b', letterSpacing: '0.5px' }}>SERVICIOS</h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9' }}>
                                                <th style={{ padding: '6px', textAlign: 'center', width: '70px', border: '1px solid #cbd5e1' }}>ID</th>
                                                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Descripción del Servicio</th>
                                                <th style={{ padding: '6px', textAlign: 'center', width: '50px', border: '1px solid #cbd5e1' }}>Cant</th>
                                                <th style={{ padding: '6px', textAlign: 'right', width: '100px', border: '1px solid #cbd5e1' }}>P. Unitario</th>
                                                <th style={{ padding: '6px', textAlign: 'right', width: '100px', border: '1px solid #cbd5e1' }}>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsMO.map(mo => (
                                                <tr key={mo.id}>
                                                    <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>{mo.item_servicio}</td>
                                                    {/* Reemplazá esta celda en la tabla de servicios del PDF */}
                                                    <td style={{ padding: '6px', borderBottom: '1px solid #e2e8f0' }}>
                                                        {mo.bd_mo?.servicio || mo.descripcion_servicio || 'Servicio sin descripción'}
                                                    </td>
                                                    <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>{mo.cantidad}</td>
                                                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>${mo.precio_unitario}</td>
                                                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>${mo.precio_total}</td>
                                                </tr>
                                            ))}
                                            {/* Subtotal de la Sección */}
                                            <tr>
                                                <td colSpan="4" style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', color: '#475569' }}>Subtotal Servicios:</td>
                                                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid #cbd5e1' }}>${totalMO.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 4. SECCIÓN REPUESTOS */}
                            {itemsProductos.length > 0 && (
                                <div style={{ marginBottom: '25px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', color: '#1e293b', letterSpacing: '0.5px' }}>REPUESTOS</h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9' }}>
                                                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Descripción del Producto</th>
                                                <th style={{ padding: '6px', textAlign: 'center', width: '50px', border: '1px solid #cbd5e1' }}>Cant</th>
                                                <th style={{ padding: '6px', textAlign: 'right', width: '100px', border: '1px solid #cbd5e1' }}>P. Unitario</th>
                                                <th style={{ padding: '6px', textAlign: 'right', width: '100px', border: '1px solid #cbd5e1' }}>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsProductos.map(prod => (
                                                <tr key={prod.id}>
                                                    <td style={{ padding: '6px', borderBottom: '1px solid #e2e8f0' }}>{prod.producto_texto_libre}</td>
                                                    <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>{prod.cantidad}</td>
                                                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>${prod.precio_unitario}</td>
                                                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>${prod.precio_total}</td>
                                                </tr>
                                            ))}
                                            {/* Subtotal de la Sección */}
                                            <tr>
                                                <td colSpan="3" style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', color: '#475569' }}>Subtotal Repuestos:</td>
                                                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid #cbd5e1' }}>${totalProd.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 5. CÁLCULO E INFORMACIÓN DE TOTALES CONSOLIDADA */}
                            <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.9rem' }}>
                                <div style={{ width: '320px', borderTop: '1px solid #000', paddingTop: '10px' }}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ color: '#475569' }}>Subtotal CON IVA:</span>
                                        <span>${presupuestoActivo.subtotal_con_iva?.toFixed(2)}</span>
                                    </div>

                                    {/* BONIFICACIÓN SERVICIOS - ¡Acá usamos el total_mo_bruto que guardamos! */}
                                    {presupuestoActivo.descuento_porcentaje_mo > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#b45309' }}>
                                            <span>Bonificación ({presupuestoActivo.descuento_porcentaje_mo}%):</span>
                                            <span style={{ fontStyle: 'italic' }}>
                                                - ${((presupuestoActivo.total_mo_bruto || 0) * presupuestoActivo.descuento_porcentaje_mo / 100).toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    {/* BONIFICACIÓN GENERAL */}
                                    {presupuestoActivo.descuento_porcentaje > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#b45309' }}>
                                            <span>Bonificación ({presupuestoActivo.descuento_porcentaje}%):</span>
                                            <span style={{ fontStyle: 'italic' }}>
                                                - ${((presupuestoActivo.subtotal_con_iva * presupuestoActivo.descuento_porcentaje) / 100).toFixed(2)}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '1.25rem', fontWeight: 'bold', borderTop: '2px solid #000', paddingTop: '10px' }}>
                                        <span>Total presupuesto:</span>
                                        <span style={{ color: '#dc2626' }}>${presupuestoActivo.total_presupuesto_con_iva?.toFixed(2)}</span>
                                    </div>

                                </div>
                            </div>

                            {/* PIE DE PÁGINA (Leyenda de validez de 24 hs fijada) */}
                            <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                                * El presente presupuesto es válido hasta el: <b>{calcularFechaVencimiento(presupuestoActivo.fecha_presupuesto)}</b>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Presupuestos;