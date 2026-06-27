import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Clientes.css';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Modales de control
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFichaVisible, setModalFichaVisible] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [clienteVerFicha, setClienteVerFicha] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', direccion: '', localidad: '', telefono: '', cuil_cuit: '', es_empresa: false
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('bd_clientes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) console.error('Error al cargar clientes:', error);
    else setClientes(data || []);
    setCargando(false);
  };

  const abrirNuevoCliente = () => {
    setClienteEditando(null);
    setFormData({ nombre: '', apellido: '', direccion: '', localidad: '', telefono: '', cuil_cuit: '', es_empresa: false });
    setModalVisible(true);
  };

  const abrirEditarCliente = (cliente) => {
    setClienteEditando(cliente);
    setFormData({
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      direccion: cliente.direccion || '',
      localidad: cliente.localidad || '',
      telefono: cliente.telefono || '',
      cuil_cuit: cliente.cuil_cuit || '',
      es_empresa: cliente.es_empresa || false
    });
    setModalVisible(true);
  };

  const abrirFichaCliente = (cliente) => {
    setClienteVerFicha(cliente);
    setModalFichaVisible(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    const datosAGuardar = { ...formData };
    
    if (datosAGuardar.es_empresa) {
      datosAGuardar.apellido = '';
    }

    const nombreInput = (datosAGuardar.nombre || '').trim().toLowerCase();
    const apellidoInput = (datosAGuardar.apellido || '').trim().toLowerCase();

    const clienteDuplicado = clientes.find((cli) => {
      if (clienteEditando && cli.id === clienteEditando.id) return false;
      const nombreDB = (cli.nombre || '').trim().toLowerCase();
      const apellidoDB = (cli.apellido || '').trim().toLowerCase();
      
      if (datosAGuardar.es_empresa) {
        return nombreDB === nombreInput;
      } else {
        return nombreDB === nombreInput && apellidoDB === apellidoInput;
      }
    });

    if (clienteDuplicado) {
      const nombreMostrar = datosAGuardar.es_empresa ? datosAGuardar.nombre : `${datosAGuardar.nombre} ${datosAGuardar.apellido}`;
      const confirmar = window.confirm(
        `⚠️ ¡ATENCIÓN!\n\nYa existe un cliente registrado con el nombre "${nombreMostrar.trim()}".\n\n¿Estás seguro de que querés guardarlo de todas formas?`
      );
      if (!confirmar) return; 
    }

    if (clienteEditando) {
      const { error } = await supabase
        .from('bd_clientes')
        .update(datosAGuardar)
        .eq('id', clienteEditando.id);
      if (error) alert('Error al actualizar: ' + error.message);
    } else {
      const { error } = await supabase
        .from('bd_clientes')
        .insert([datosAGuardar]);
      if (error) alert('Error al crear: ' + error.message);
    }

    setModalVisible(false);
    fetchClientes();
  };

  // 🛑 LOGICA DE ELIMINACIÓN CON BLINDAJE TOTAL CRÍTICO
  const eliminarCliente = async (cliente) => {
    const idCli = cliente.id;
    const nombreMostrar = cliente.es_empresa ? cliente.nombre : `${cliente.nombre} ${cliente.apellido || ''}`;

    // 1. Verificación cruzada en tablas contables y de taller
    const checkPresupuestos = await supabase.from('bd_presupuestos').select('id').eq('id_cliente', idCli).limit(1);
    const checkRecibos = await supabase.from('bd_recibos').select('id').eq('id_cliente', idCli).limit(1);
    const checkTrabajos = await supabase.from('bd_trabajos').select('id').eq('id_cliente', idCli).limit(1);
    const checkComisiones = await supabase.from('bd_comisiones').select('id').eq('id_cliente', idCli).limit(1);

    // 2. Si tiene datos vinculados, bloqueamos la acción instantáneamente
    if (
      (checkPresupuestos.data && checkPresupuestos.data.length > 0) ||
      (checkRecibos.data && checkRecibos.data.length > 0) ||
      (checkTrabajos.data && checkTrabajos.data.length > 0) ||
      (checkComisiones.data && checkComisiones.data.length > 0)
    ) {
      return alert(`⚠️ ACCIÓN DENEGADA:\n\nNo se puede eliminar a "${nombreMostrar.trim()}" porque tiene presupuestos, recibos, trabajos o comisiones asociados en el sistema.`);
    }

    // 3. Si pasó limpio, pedimos confirmación física
    if (window.confirm(`¿Estás seguro de que querés eliminar por completo al cliente "${nombreMostrar.trim()}"?`)) {
      const { error } = await supabase.from('bd_clientes').delete().eq('id', idCli);
      if (error) alert('Error al eliminar: ' + error.message);
      else {
        alert('✅ Cliente eliminado con éxito.');
        fetchClientes();
      }
    }
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const termino = busqueda.toLowerCase();
    const datosCliente = `${cliente.nombre || ''} ${cliente.apellido || ''} ${cliente.localidad || ''} ${cliente.telefono || ''} ${cliente.cuil_cuit || ''}`.toLowerCase();
    return datosCliente.includes(termino);
  });

  return (
    <div className="modulo-clientes">
      
      <div className="clientes-header">
        <input
          type="text"
          className="input-busqueda"
          placeholder="🔍 Buscar por nombre, apellido, localidad o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />
        <button className="btn-nuevo-cliente" onClick={abrirNuevoCliente}>
          + Nuevo Cliente
        </button>
      </div>

      <div className="tabla-contenedor">
        {cargando ? (
          <p className="mensaje-carga">Cargando clientes ⚙️</p>
        ) : (
          <table className="tabla-moderna">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Nombre / Razón Social</th>
                <th style={{ width: '20%' }}>Localidad</th>
                <th style={{ width: '15%' }}>Teléfono</th>
                <th style={{ width: '15%' }}>CUIT / CUIL</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cli) => (
                  <tr key={cli.id}>
                    <td className="col-nombre">
                      {cli.nombre} {cli.apellido && !cli.es_empresa ? cli.apellido : ''}
                      {cli.es_empresa && <span style={{fontSize:'0.75rem', marginLeft:'8px', backgroundColor:'#e2e8f0', padding:'2px 6px', borderRadius:'4px', color:'#475569'}}>Empresa</span>}
                    </td>
                    <td>{cli.localidad || '-'}</td>
                    <td>{cli.telefono || '-'}</td>
                    <td>{cli.cuil_cuit || '-'}</td>
                    <td>
                      {/* CONTENEDOR DE ICONOS PREMIUM ALINEADOS */}
                      <div style={{ display: 'flex', gap: '18px', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => abrirFichaCliente(cli)} title="Ver Ficha Completa">👁️</span>
                        <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => abrirEditarCliente(cli)} title="Editar Ficha">✏️</span>
                        <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => eliminarCliente(cli)} title="Eliminar Cliente">🗑️</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="sin-resultados">
                    No se encontraron clientes con "{busqueda}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL EDITAR / CREAR CLIENTE */}
      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-contenido">
            <h2>{clienteEditando ? '✏️ Editar Ficha de Cliente' : '👤 Nuevo Cliente'}</h2>
            
            <form onSubmit={guardarCliente}>
              <div className="form-grid" style={{marginBottom: '15px'}}>
                 <div className="input-group columna-entera" style={{flexDirection: 'row', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                  <input 
                    type="checkbox" 
                    name="es_empresa" 
                    id="es_empresa"
                    checked={formData.es_empresa} 
                    onChange={handleInputChange} 
                    style={{width: '18px', height: '18px', cursor: 'pointer'}}
                  />
                  <label htmlFor="es_empresa" style={{cursor: 'pointer', margin: 0, fontSize: '1rem', color: '#0f172a'}}>
                    🏢 Este cliente es una Empresa (Razón Social)
                  </label>
                </div>
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label>{formData.es_empresa ? 'Razón Social *' : 'Nombre *'}</label>
                  <input type="text" name="nombre" required value={formData.nombre} onChange={handleInputChange} autoFocus />
                </div>
                
                {!formData.es_empresa && (
                  <div className="input-group">
                    <label>Apellido *</label>
                    <input type="text" name="apellido" required value={formData.apellido} onChange={handleInputChange} />
                  </div>
                )}
                
                <div className="input-group">
                  <label>Teléfono</label>
                  <input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} />
                </div>

                <div className="input-group">
                  <label>CUIT / CUIL</label>
                  <input type="text" name="cuil_cuit" value={formData.cuil_cuit} onChange={handleInputChange} />
                </div>
                
                <div className="input-group columna-entera">
                  <label>Dirección</label>
                  <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} />
                </div>
                <div className="input-group columna-entera">
                  <label>Localidad</label>
                  <input type="text" name="localidad" value={formData.localidad} onChange={handleInputChange} />
                </div>
              </div>

              <div className="modal-acciones">
                <button type="button" className="btn-cancelar" onClick={() => setModalVisible(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar">💾 Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 👁️ MODAL INFORMATIVO: FICHA DE LECTURA COMPLETA DEL CLIENTE */}
      {modalFichaVisible && clienteVerFicha && (
        <div className="modal-overlay">
          <div className="modal-contenido" style={{ maxWidth: '500px' }}>
            <h2>📋 Ficha Técnica del Cliente</h2>
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '15px', lineHeight: '1.8' }}>
              <p><strong>Tipo de Cliente:</strong> {clienteVerFicha.es_empresa ? '🏢 Empresa / Razón Social' : '👤 Particular'}</p>
              <p><strong>Nombre completo:</strong> {clienteVerFicha.nombre} {clienteVerFicha.apellido || ''}</p>
              <p><strong>CUIT / CUIL:</strong> {clienteVerFicha.cuil_cuit || 'No registrado'}</p>
              <p><strong>Teléfono de Contacto:</strong> {clienteVerFicha.telefono || 'No registrado'}</p>
              <p><strong>Dirección Física:</strong> {clienteVerFicha.direccion || 'No registrada'}</p>
              <p><strong>Localidad:</strong> {clienteVerFicha.localidad || 'No registrada'}</p>
              
              {/* Espacio reservado para balances contables futuros */}
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1', fontSize: '0.85rem', color: '#64748b' }}>
                ℹ️ Próximamente vas a poder auditar el saldo corriente, historial analítico de trabajos y presupuestos aprobados desde acá.
              </div>
            </div>
            <div className="modal-acciones" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-cancelar" style={{ width: '100%' }} onClick={() => setModalFichaVisible(false)}>Cerrar Ficha</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Clientes;