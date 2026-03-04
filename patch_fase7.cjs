const fs = require('fs');
const path = require('path');

const filesToPatch = [
    {
        name: 'Consumidores.jsx',
        path: 'src/pages/Consumidores.jsx',
        patches: [
            {
                // Import useAuth
                find: "import { useSearchParams } from 'react-router-dom';",
                replace: "import { useSearchParams } from 'react-router-dom';\nimport { useAuth } from '../contexts/AuthContext';"
            },
            {
                // Add empresaActiva
                find: "export default function Consumidores() {",
                replace: "export default function Consumidores() {\n    const { empresaActiva } = useAuth();"
            },
            {
                // Guard fetchData
                find: "const fetchData = async () => {\n        setLoading(true);",
                replace: "const fetchData = async () => {\n        if (!empresaActiva?.id) return;\n        setLoading(true);"
            },
            {
                // Filter consumers
                find: "const { data: cons, error: err, count } = await supabase\n            .from('consumidores')",
                replace: "const { data: cons, error: err, count } = await supabase\n            .from('consumidores')\n            .eq('empresa_id', empresaActiva.id)"
            },
            {
                // Add empresaActiva to useEffect deps
                find: "}, [page, fNombre, fEstado, fResponsable]);",
                replace: "}, [page, fNombre, fEstado, fResponsable, empresaActiva]);"
            }
        ]
    },
    {
        name: 'Repartidores.jsx',
        path: 'src/pages/Repartidores.jsx',
        patches: [
            {
                find: "import { supabase } from '../lib/supabase';",
                replace: "import { supabase } from '../lib/supabase';\nimport { useAuth } from '../contexts/AuthContext';"
            },
            {
                find: "export default function Repartidores() {",
                replace: "export default function Repartidores() {\n    const { empresaActiva } = useAuth();"
            },
            {
                find: "const fetchRepartidores = async () => {\n        setLoading(true);",
                replace: "const fetchRepartidores = async () => {\n        if (!empresaActiva?.id) return;\n        setLoading(true);"
            },
            {
                find: ".from('repartidores')\n            .select('*')",
                replace: ".from('repartidores')\n            .select('*')\n            .eq('empresa_id', empresaActiva.id)"
            },
            {
                find: "}, [search, filterEstado]);",
                replace: "}, [search, filterEstado, empresaActiva]);"
            }
        ]
    },
    {
        name: 'Proveedores.jsx',
        path: 'src/pages/Proveedores.jsx',
        patches: [
            {
                find: "import { supabase } from '../lib/supabase';",
                replace: "import { supabase } from '../lib/supabase';\nimport { useAuth } from '../contexts/AuthContext';"
            },
            {
                find: "export default function Proveedores() {",
                replace: "export default function Proveedores() {\n    const { empresaActiva } = useAuth();"
            },
            {
                find: "const fetchData = async () => {\n        setLoading(true);",
                replace: "const fetchData = async () => {\n        if (!empresaActiva?.id) return;\n        setLoading(true);"
            },
            {
                find: ".from('proveedores')\n            .select('*')",
                replace: ".from('proveedores')\n            .select('*')\n            .eq('empresa_id', empresaActiva.id)"
            },
            {
                find: ".from('eventos_proveedores')\n            .select(`*, proveedores(nombre)`);",
                replace: ".from('eventos_proveedores')\n            .select(`*, proveedores(nombre)`)\n            .eq('empresa_id', empresaActiva.id);"
            },
            {
                find: "}, []);",
                replace: "}, [empresaActiva]);"
            }
        ]
    },
    {
        name: 'ConsumidorModal.jsx',
        path: 'src/components/ui/ConsumidorModal.jsx',
        patches: [
            {
                find: "import { supabase } from '../../lib/supabase';",
                replace: "import { supabase } from '../../lib/supabase';\nimport { useAuth } from '../../contexts/AuthContext';"
            },
            {
                find: "export function ConsumidorModal({ isOpen, onClose, consumidorId, onSaved }) {\n    const [loading, setLoading] = useState(false);",
                replace: "export function ConsumidorModal({ isOpen, onClose, consumidorId, onSaved }) {\n    const { empresaActiva } = useAuth();\n    const [loading, setLoading] = useState(false);"
            },
            {
                find: "const payload = {\n            ...formData,",
                replace: "const payload = {\n            ...formData,\n            empresa_id: empresaActiva?.id,"
            },
            {
                find: "consumidor_id: consumidorId,",
                replace: "consumidor_id: consumidorId,\n                    empresa_id: empresaActiva?.id,"
            },
            {
                find: "consumidor_id: data.id,",
                replace: "consumidor_id: data.id,\n                    empresa_id: empresaActiva?.id,"
            }
        ]
    },
    {
        name: 'ActividadConsumidorModal.jsx',
        path: 'src/components/ui/ActividadConsumidorModal.jsx',
        patches: [
            {
                find: "import { supabase } from '../../lib/supabase';",
                replace: "import { supabase } from '../../lib/supabase';\nimport { useAuth } from '../../contexts/AuthContext';"
            },
            {
                find: "export function ActividadConsumidorModal({ isOpen, onClose, consumidorId, consumidorNombre, onSaved }) {",
                replace: "export function ActividadConsumidorModal({ isOpen, onClose, consumidorId, consumidorNombre, onSaved }) {\n    const { empresaActiva } = useAuth();"
            },
            {
                find: "const payload = {\n            consumidor_id: consumidorId,",
                replace: "const payload = {\n            consumidor_id: consumidorId,\n            empresa_id: empresaActiva?.id,"
            }
        ]
    },
    {
        name: 'RepartidorModal.jsx',
        path: 'src/components/ui/RepartidorModal.jsx',
        patches: [
            {
                find: "import { supabase } from '../../lib/supabase';",
                replace: "import { supabase } from '../../lib/supabase';\nimport { useAuth } from '../../contexts/AuthContext';"
            },
            {
                find: "export function RepartidorModal({ isOpen, onClose, repartidorId, initialLocation, onSaved }) {",
                replace: "export function RepartidorModal({ isOpen, onClose, repartidorId, initialLocation, onSaved }) {\n    const { empresaActiva } = useAuth();"
            },
            {
                find: "const payload = {\n            nombre: formData.nombre,",
                replace: "const payload = {\n            nombre: formData.nombre,\n            empresa_id: empresaActiva?.id,"
            },
            {
                find: "repartidor_id: repartidorId,",
                replace: "repartidor_id: repartidorId,\n                    empresa_id: empresaActiva?.id,"
            },
            {
                find: "repartidor_id: data.id,",
                replace: "repartidor_id: data.id,\n                    empresa_id: empresaActiva?.id,"
            }
        ]
    },
    {
        name: 'ActividadRepartidorModal.jsx',
        path: 'src/components/ui/ActividadRepartidorModal.jsx',
        patches: [
            {
                find: "import { supabase } from '../../lib/supabase';",
                replace: "import { supabase } from '../../lib/supabase';\nimport { useAuth } from '../../contexts/AuthContext';"
            },
            {
                find: "export function ActividadRepartidorModal({ isOpen, onClose, repartidorId, repartidorNombre, onSaved }) {",
                replace: "export function ActividadRepartidorModal({ isOpen, onClose, repartidorId, repartidorNombre, onSaved }) {\n    const { empresaActiva } = useAuth();"
            },
            {
                find: "const payload = {\n            repartidor_id: repartidorId,",
                replace: "const payload = {\n            repartidor_id: repartidorId,\n            empresa_id: empresaActiva?.id,"
            }
        ]
    },
    {
        name: 'ProveedorModal.jsx',
        path: 'src/components/ui/ProveedorModal.jsx',
        patches: [
            {
                find: "import { supabase } from '../../lib/supabase';",
                replace: "import { supabase } from '../../lib/supabase';\nimport { useAuth } from '../../contexts/AuthContext';"
            },
            {
                find: "export function ProveedorModal({ isOpen, onClose, proveedorId, onSaved }) {",
                replace: "export function ProveedorModal({ isOpen, onClose, proveedorId, onSaved }) {\n    const { empresaActiva } = useAuth();"
            },
            {
                find: "const payload = {\n            nombre: formData.nombre.trim(),",
                replace: "const payload = {\n            nombre: formData.nombre.trim(),\n            empresa_id: empresaActiva?.id,"
            }
        ]
    },
    {
        name: 'EventoProveedorModal.jsx',
        path: 'src/components/ui/EventoProveedorModal.jsx',
        patches: [
            {
                find: "import { supabase } from '../../lib/supabase';",
                replace: "import { supabase } from '../../lib/supabase';\nimport { useAuth } from '../../contexts/AuthContext';"
            },
            {
                find: "export function EventoProveedorModal({ isOpen, onClose, eventId, isIdea = false, onSaved, proveedores = [], secciones = [] }) {",
                replace: "export function EventoProveedorModal({ isOpen, onClose, eventId, isIdea = false, onSaved, proveedores = [], secciones = [] }) {\n    const { empresaActiva } = useAuth();"
            },
            {
                find: "const payload = {\n            proveedor_id: formData.proveedor_id,",
                replace: "const payload = {\n            proveedor_id: formData.proveedor_id,\n            empresa_id: empresaActiva?.id,"
            },
            {
                find: "const { error } = await supabase.from('eventos_historial').insert([{",
                replace: "const { error } = await supabase.from('eventos_historial').insert([{\n            empresa_id: empresaActiva?.id,"
            },
            {
                find: ".from('eventos_historial').select('*').eq('evento_id', id)",
                replace: ".from('eventos_historial').select('*').eq('evento_id', id).eq('empresa_id', empresaActiva?.id)"
            }
        ]
    }
];

const basePath = 'c:/Users/Usr/Desktop/CRMPickingUp/crm-react';

filesToPatch.forEach(file => {
    const fullPath = path.join(basePath, file.path);
    if (!fs.existsSync(fullPath)) {
        console.log(`File NOT FOUND: ${fullPath}`);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    file.patches.forEach(p => {
        if (content.includes(p.find)) {
            content = content.replace(p.find, p.replace);
            modified = true;
            console.log(`Applied patch to ${file.name}`);
        } else {
            console.log(`Patch NOT APPLICABLE to ${file.name}: ${p.find.substring(0, 30)}...`);
        }
    });

    if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Saved ${file.name}`);
    }
});
