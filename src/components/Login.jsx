import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Ajustá la ruta si tu supabaseClient está en otra carpeta
import logoRubal from '../assets/logo_rubal.png'; 

export default function Login({ onLogin }) {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setCargando(true);
        
        // Consultamos la tabla bd_usuarios
        const { data, error } = await supabase
            .from('bd_usuarios')
            .select('*')
            .eq('usuario', usuario)
            .eq('contrasena', password);

        if (error) {
            alert('Error al conectar con la base de datos.');
            console.error(error);
        } else if (data && data.length > 0) {
            // Si data tiene algo, las credenciales son correctas
            onLogin(true); 
        } else {
            // Si data está vacío, los datos están mal
            alert('❌ Usuario o contraseña incorrectos.');
        }
        
        setCargando(false);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a' }}>
            <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
                <img src={logoRubal} alt="Logo Rubal" style={{ width: '150px', marginBottom: '20px' }} />
                <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Acceso al Sistema</h2>
                <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '0.9rem' }}>Ingrese sus credenciales de acceso</p>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input 
                        type="text" 
                        placeholder="Usuario" 
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Contraseña" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }}
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={cargando}
                        style={{ background: '#dc2626', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: cargando ? 'not-allowed' : 'pointer', marginTop: '10px' }}
                    >
                        {cargando ? 'Verificando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    );
}