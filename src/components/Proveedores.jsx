import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Clientes.css'; // Reutiliza los mismos estilos unificados

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('bd_proveedores')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) console.error("Error cargando proveedores:", error);
    else setProveedores(data || []);
    setCargando(false);
  };

  const agregarProveedor = async () => {
    const nombreLimpio = busqueda.trim();
    if (!nombreLimpio) return;

    // Validación en memoria para evitar llamadas innecesarias si ya existe
    const existe = proveedores.find(p => p.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    if (existe) {
      alert("⚠️ Ese proveedor ya existe.");
      return;
    }

    // LÓGICA DE ID MANUAL ENTERO (INTEGER): Buscamos el ID más alto y le sumamos 1
    const proximoId = proveedores.length > 0 
      ? Math.max(...proveedores.map(p => Number(p.id || 0))) + 1 
      : 1;

    const { error } = await supabase
      .from('bd_proveedores')
      .insert([{ id: proximoId, nombre: nombreLimpio }]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setBusqueda('');      // Limpiamos el buscador
      fetchProveedores();   // Recargamos el listado fresco
    }
  };

  const proveedoresFiltrados = proveedores.filter(p => 
    (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="modulo-clientes">
      
      {/* UN SOLO BUSCADOR: Filtra mientras escribís */}
      <div className="clientes-header">
        <input
          type="text"
          className="input-busqueda"
          placeholder="🔍 Buscar proveedor o escribí uno nuevo para agregar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {/* El botón aparece solo si escribiste algo que NO coincide con un proveedor existente */}
        {busqueda.length > 0 && !proveedores.find(p => p.nombre.toLowerCase() === busqueda.toLowerCase()) && (
          <button className="btn-nuevo-cliente" onClick={agregarProveedor}>
            + Agregar "{busqueda}"
          </button>
        )}
      </div>

      <div className="tabla-contenedor">
        {cargando ? <p className="mensaje-carga">Cargando catálogo de proveedores...</p> : (
          <table className="tabla-moderna">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>ID</th>
                <th>Nombre del Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.length > 0 ? (
                proveedoresFiltrados.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 'bold', color: '#64748b' }}>#{p.id}</td>
                    <td>{p.nombre}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="sin-resultados">
                    No se encontró el proveedor. {busqueda && "Podés agregarlo arriba como un nuevo registro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Proveedores;