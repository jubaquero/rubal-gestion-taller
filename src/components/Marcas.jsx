import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Clientes.css';

function Marcas() {
  const [marcas, setMarcas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetchMarcas();
  }, []);

  const fetchMarcas = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('bd_marcas')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) console.error(error);
    else setMarcas(data);
    setCargando(false);
  };

  const agregarMarca = async () => {
    const nombreLimpio = busqueda.trim();
    if (!nombreLimpio) return;

    const existe = marcas.find(m => m.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    if (existe) {
      alert("⚠️ Esa marca ya existe.");
      return;
    }

    const { error } = await supabase.from('bd_marcas').insert([{ nombre: nombreLimpio }]);
    if (error) alert("Error: " + error.message);
    else {
      setBusqueda(''); // Limpiamos el buscador
      fetchMarcas();    // Recargamos
    }
  };

  const marcasFiltradas = marcas.filter(m => 
    m.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="modulo-clientes">
      
      {/* UN SOLO BUSCADOR: Filtra mientras escribís */}
      <div className="clientes-header">
        <input
          type="text"
          className="input-busqueda"
          placeholder="🔍 Buscar marca o escribí una nueva para agregar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {/* El botón aparece solo si escribiste algo que NO coincide con una marca existente */}
        {busqueda.length > 0 && !marcas.find(m => m.nombre.toLowerCase() === busqueda.toLowerCase()) && (
          <button className="btn-nuevo-cliente" onClick={agregarMarca}>
            + Agregar "{busqueda}"
          </button>
        )}
      </div>

      <div className="tabla-contenedor">
        {cargando ? <p className="mensaje-carga">Cargando marcas...</p> : (
          <table className="tabla-moderna">
            <thead><tr><th>Nombre de Marca</th></tr></thead>
            <tbody>
              {marcasFiltradas.length > 0 ? (
                marcasFiltradas.map(m => (
                  <tr key={m.id}><td>{m.nombre}</td></tr>
                ))
              ) : (
                <tr><td className="sin-resultados">No se encontró esa marca. {busqueda && "Podés agregarla arriba."}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Marcas;