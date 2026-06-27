import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Clientes.css'; // Usamos las mismas clases base de diseño

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('bd_tipos_producto')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) console.error(error);
    else setCategorias(data || []);
    setCargando(false);
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    const prefijoLimpio = prefijo.trim().toUpperCase();

    if (editandoId) {
      // EDITAR SOLO NOMBRE
      const { error } = await supabase
        .from('bd_tipos_producto')
        .update({ nombre: nombreLimpio })
        .eq('id', editandoId);
      if (error) alert("Error al editar: " + error.message);
    } else {
      // CREAR NUEVO (Validar duplicados de nombre o prefijo)
      const existe = categorias.find(c => 
        c.nombre.toLowerCase() === nombreLimpio.toLowerCase() || 
        c.prefijo === prefijoLimpio
      );
      if (existe) {
        alert("⚠️ La categoría o el prefijo ya existen.");
        return;
      }
      const { error } = await supabase
        .from('bd_tipos_producto')
        .insert([{ nombre: nombreLimpio, prefijo: prefijoLimpio }]);
      if (error) alert("Error: " + error.message);
    }

    cancelarEdicion();
    fetchCategorias();
  };

  const iniciarEdicion = (cat) => {
    setEditandoId(cat.id);
    setNombre(cat.nombre);
    setPrefijo(cat.prefijo);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre('');
    setPrefijo('');
  };

  const eliminarCategoria = async (cat) => {
    // 1. BLINDAJE: Verificar si hay productos que usen esta categoría
    const { data: productosAsociados, error: errCheck } = await supabase
      .from('bd_productos')
      .select('id')
      .eq('id_tipo_producto', cat.id)
      .limit(1);

    if (errCheck) {
      alert("Error verificando dependencias: " + errCheck.message);
      return;
    }

    if (productosAsociados && productosAsociados.length > 0) {
      return alert(`⚠️ ACCIÓN DENEGADA:\n\nNo podés eliminar la categoría "${cat.nombre}" porque ya existen repuestos/productos cargados en el stock bajo este tipo.`);
    }

    // 2. Si no hay productos, pedimos confirmación y borramos
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${cat.nombre}"?`)) {
      const { error } = await supabase.from('bd_tipos_producto').delete().eq('id', cat.id);
      if (error) alert("Error al eliminar: " + error.message);
      else fetchCategorias();
    }
  };

  return (
    <div className="modulo-clientes">
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
          {editandoId ? '✏️ Editando Categoría' : '🗂️ Agregar Nueva Categoría'}
        </h3>
        <form onSubmit={guardarCategoria} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <input
            type="text"
            className="input-busqueda"
            placeholder="Nombre (ej. Biela)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            style={{ flex: 1, minWidth: '200px' }}
          />
          
          <input
            type="text"
            className="input-busqueda"
            placeholder="PREFIJO (ej. BL)"
            style={{ width: '120px', textTransform: 'uppercase', backgroundColor: editandoId ? '#f1f5f9' : '#fff' }}
            value={prefijo}
            onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
            required
            maxLength="4"
            disabled={editandoId !== null} 
            title={editandoId ? "El prefijo no puede modificarse" : "Máximo 4 letras"}
          />
          
          <button type="submit" className="btn-nuevo-cliente" style={{ padding: '10px 25px' }}>
            {editandoId ? '💾 Guardar' : '➕ Agregar'}
          </button>
          
          {editandoId && (
            <button type="button" className="btn-cancelar" onClick={cancelarEdicion} style={{ padding: '10px 25px' }}>
              Cancelar
            </button>
          )}
        </form>
      </div>

      <div className="tabla-contenedor">
        {cargando ? (
          <p className="mensaje-carga">Cargando categorías...</p>
        ) : (
          <table className="tabla-moderna">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Prefijo</th>
                <th style={{ width: '60%' }}>Nombre de Categoría</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.length > 0 ? (
                categorias.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '1.1rem' }}>{c.prefijo}</td>
                    <td style={{ fontSize: '1.05rem', color: '#1e293b' }}>{c.nombre}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '18px', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => iniciarEdicion(c)} title="Editar Nombre">✏️</span>
                        <span style={{ cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => eliminarCategoria(c)} title="Eliminar Categoría">🗑️</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No hay categorías registradas.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Categorias;