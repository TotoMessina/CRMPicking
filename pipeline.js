document.addEventListener('DOMContentLoaded', async () => {
    // Shared Utils
    const debounce = window.utils ? window.utils.debounce : (fn, d) => {
        let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); }
    };

    const board = document.getElementById('kanbanBoard');
    const searchInput = document.getElementById('searchInput');
    const btnRefresh = document.getElementById('btnRefresh');

    // Estado local
    let allClients = [];

    // Config: Column definition
    const COLUMNS = [
        { id: '1 - Cliente relevado', label: 'Relevado', color: '#64748b' },
        { id: '2 - Local Visitado No Activo', label: 'Visitado (No Act)', color: '#ef4444' },
        { id: '3 - Primer Ingreso', label: 'Primer Ingreso', color: '#f59e0b' },
        { id: '4 - Local Creado', label: 'Creado', color: '#3b82f6' },
        { id: '5 - Local Visitado Activo', label: 'Visitado (Activo)', color: '#10b981' },
        { id: '6 - Local No Interesado', label: 'No Interesado', color: '#ef4444' }
    ];

    // INIT
    initBoard();

    // Wait for auth guard to confirm session before fetching
    if (window.CRM_GUARD_READY) {
        window.CRM_GUARD_READY.then(async (res) => {
            if (res.ok) {
                await loadClients();
            } else {
                console.warn("Pipeline: Auth not ready or user not active.");
            }
        });
    } else {
        // Fallback if guard not present (rare)
        loadClients();
    }

    // LISTENERS
    if (btnRefresh) btnRefresh.addEventListener('click', loadClients);
    if (searchInput) searchInput.addEventListener('input', debounce(renderBoard, 300));

    // DRAG & DROP STATE
    let draggedItem = null;

    // --- FUNCS ---

    function initBoard() {
        board.innerHTML = '';
        COLUMNS.forEach(col => {
            const colEl = document.createElement('div');
            colEl.className = 'kanban-column';
            colEl.dataset.status = col.id;

            colEl.innerHTML = `
                <div class="kanban-column-header" style="border-bottom-color: ${col.color}">
                    <h2>${col.label}</h2>
                    <span class="kanban-count">0</span>
                </div>
                <div class="kanban-items" id="col-${col.id.replace(/\s/g, '-')}"></div>
            `;

            // Drop events
            colEl.addEventListener('dragover', handleDragOver);
            colEl.addEventListener('dragleave', handleDragLeave);
            colEl.addEventListener('drop', handleDrop);

            board.appendChild(colEl);
        });
    }

    async function loadClients() {
        if (!window.supabaseClient) return;

        try {
            const { data, error } = await window.supabaseClient
                .from('clientes')
                .select('*')
                .eq('activo', true)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            allClients = data || [];
            renderBoard();
        } catch (e) {
            console.error(e);
            alert('Error al cargar pipeline');
        }
    }

    function renderBoard() {
        const term = searchInput.value.toLowerCase();
        const filtered = allClients.filter(c =>
            !term ||
            (c.nombre_fantasia && c.nombre_fantasia.toLowerCase().includes(term)) ||
            (c.nombre && c.nombre.toLowerCase().includes(term)) ||
            (c.razon_social && c.razon_social.toLowerCase().includes(term)) ||
            (c.responsable && c.responsable.toLowerCase().includes(term))
        );

        // Group by status
        const groups = {};
        COLUMNS.forEach(c => groups[c.id] = []);

        filtered.forEach(c => {
            // Mapeo simple o normalización
            let st = c.estado;
            // Intentar matchear con columnas (puede venir sucio)
            // Si no matchea exacto, intentamos "includes" o fallback
            // Para demo usamos exact match
            if (groups[st]) {
                groups[st].push(c);
            } else {
                // Try finding close match
                const found = COLUMNS.find(col => col.id === st);
                if (found) groups[st].push(c);
                else {
                    // Fallback to Relevado if unknown or empty? Or maybe "Primer Ingreso" default?
                    // Let's allow putting them in "Sin Clasificar" if we had one, but strict now.
                    // If mismatch, maybe just skip or put in Col 1
                    if (!st) groups[COLUMNS[0].id].push(c);
                    // else skip or log
                }
            }
        });

        // Render Cards
        COLUMNS.forEach(col => {
            const container = board.querySelector(`[data-status="${col.id}"] .kanban-items`);
            if (!container) return;
            container.innerHTML = ''; // Clear

            // Update count
            const countEl = board.querySelector(`[data-status="${col.id}"] .kanban-count`);
            if (countEl) countEl.textContent = groups[col.id].length;

            groups[col.id].forEach(client => {
                const card = createCard(client);
                container.appendChild(card);
            });
        });
    }

    function createCard(client) {
        const el = document.createElement('div');
        el.className = 'kanban-card';
        el.draggable = true;
        el.dataset.id = client.id;
        el.dataset.status = client.estado;

        el.innerHTML = `
            <div class="kanban-card-title">${escapeHtml(client.nombre_fantasia || client.nombre || client.razon_social || 'Sin Nombre')}</div>
            <div class="kanban-card-meta">
                <span>👤 ${escapeHtml(client.responsable || '-')}</span>
                <span>📅 ${client.updated_at ? new Date(client.updated_at).toLocaleDateString() : '-'}</span>
            </div>
        `;

        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragend', handleDragEnd);

        return el;
    }

    // --- DnD HANDLERS ---

    function handleDragStart(e) {
        draggedItem = this;
        setTimeout(() => this.classList.add('dragging'), 0);

        // Data set for easy retrieval
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.id);
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        draggedItem = null;

        // Remove drop highlights
        document.querySelectorAll('.kanban-column').forEach(c => {
            c.classList.remove('kanban-drop-zone');
        });
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary for "drop" to fire
        e.dataTransfer.dropEffect = 'move';

        this.classList.add('kanban-drop-zone');
    }

    function handleDragLeave(e) {
        this.classList.remove('kanban-drop-zone');
    }

    async function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('kanban-drop-zone');

        const newStatus = this.dataset.status;
        const clientId = e.dataTransfer.getData('text/plain');

        if (!clientId || !newStatus) return;

        // Validar no mover a mismo estado
        const client = allClients.find(c => c.id == clientId);
        if (client && client.estado === newStatus) return;

        // Optimistic UI Update
        moveCard(clientId, newStatus);

        // Update Backend
        try {
            // 1. Update Client
            const { error } = await window.supabaseClient
                .from('clientes')
                .update({
                    estado: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', clientId);

            if (error) throw error;

            // 2. Create Log (Actividad)
            // Need user name... assuming window.CRM_USER or similar from auth
            const userName = window.CRM_USER ? window.CRM_USER.nombre : 'Sistema';

            await window.supabaseClient
                .from('actividades')
                .insert([{
                    cliente_id: clientId,
                    usuario: userName,
                    accion: `Movido a ${newStatus}`,
                    detalle: `Cambio de estado desde Kanban`,
                    fecha: new Date().toISOString()
                }]);

            // Update local state completely
            if (client) client.estado = newStatus;

        } catch (err) {
            console.error('Error changing status:', err);
            alert('Error al actualizar estado. Se revertirán los cambios.');
            loadClients(); // Revert
        }
    }

    function moveCard(id, newStatusKey) {
        // Find existing card
        const card = document.querySelector(`.kanban-card[data-id="${id}"]`);
        if (!card) return;

        // Find new container
        const newCol = board.querySelector(`[data-status="${newStatusKey}"] .kanban-items`);
        if (!newCol) return;

        // Move DOM
        newCol.appendChild(card);
        card.dataset.status = newStatusKey;

        // Recalculate counts visual only? Better to re-render but animations break.
        // We'll trust final reload or just update text manually for smoothness
        updateCounts();
    }

    function updateCounts() {
        COLUMNS.forEach(col => {
            const container = board.querySelector(`[data-status="${col.id}"] .kanban-items`);
            const countEl = board.querySelector(`[data-status="${col.id}"] .kanban-count`);
            if (container && countEl) {
                countEl.textContent = container.children.length;
            }
        });
    }

    function escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
