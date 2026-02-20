/**
 * Global Search (Command Palette) - CRM PickingUp
 * Press Ctrl+K to open
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject HTML for Command Palette
    const paletteHTML = `
    <div id="commandPaletteModal" class="modal">
        <div class="modal-content command-palette">
            <div class="command-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="commandInput" class="command-input" placeholder="Buscar clientes, consumidores, repartidores..." autocomplete="off">
            </div>
            <div id="commandResults" class="command-results">
                <!-- Results injected here -->
            </div>
            <div class="command-footer">
                <span><kbd class="command-kbd">↑</kbd> <kbd class="command-kbd">↓</kbd> navegar</span>
                <span><kbd class="command-kbd">Enter</kbd> seleccionar</span>
                <span><kbd class="command-kbd">Esc</kbd> cerrar</span>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', paletteHTML);

    const modal = document.getElementById('commandPaletteModal');
    const input = document.getElementById('commandInput');
    const resultsContainer = document.getElementById('commandResults');

    let isPaletteOpen = false;
    let currentResults = [];
    let focusedIndex = -1;

    // 2. Keyboard Listeners
    document.addEventListener('keydown', (e) => {
        // Ctrl+K to Open
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            togglePalette();
        }

        // Esc to Close
        if (e.key === 'Escape' && isPaletteOpen) {
            closePalette();
        }

        // Navigation inside palette
        if (isPaletteOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusNext();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusPrev();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                selectCurrent();
            }
        }
    });

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePalette();
        }
    });

    // Handle Input
    input.addEventListener('input', window.utils ? window.utils.debounce(handleSearch, 300) : handleSearch);

    // 3. Functions
    function togglePalette() {
        if (isPaletteOpen) {
            closePalette();
        } else {
            openPalette();
        }
    }

    function openPalette() {
        isPaletteOpen = true;
        modal.classList.add('active');
        input.value = '';
        resultsContainer.innerHTML = '';
        focusedIndex = -1;
        setTimeout(() => input.focus(), 50);
    }

    function closePalette() {
        isPaletteOpen = false;
        modal.classList.remove('active');
        input.blur();
    }

    async function handleSearch() {
        const query = input.value.trim().toLowerCase();

        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            currentResults = [];
            focusedIndex = -1;
            return;
        }

        if (!window.supabaseClient) return;

        // Visual feedback
        resultsContainer.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted);"><div class="skeleton" style="height: 20px; width: 60%; margin: 0 auto; border-radius: 4px;"></div></div>`;

        try {
            // Search Clientes
            const { data: clientes } = await window.supabaseClient
                .from('clientes')
                .select('id, nombre, nombre_local, direccion')
                .or(`nombre.ilike.%${query}%,nombre_local.ilike.%${query}%`)
                .limit(4);

            // Search Consumidores
            const { data: consumidores } = await window.supabaseClient
                .from('consumidores')
                .select('id, nombre, telefono')
                .or(`nombre.ilike.%${query}%,telefono.ilike.%${query}%`)
                .limit(3);

            // Search Repartidores
            const { data: repartidores } = await window.supabaseClient
                .from('repartidores')
                .select('id, nombre, apellido')
                .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
                .limit(3);

            currentResults = [];

            if (clientes) {
                clientes.forEach(c => currentResults.push({
                    type: 'cliente',
                    title: c.nombre || c.nombre_local || '(Sin nombre)',
                    desc: c.direccion || 'Sin dirección',
                    icon: '🏢',
                    url: `clientes.html?id=${c.id}`
                }));
            }

            if (consumidores) {
                consumidores.forEach(c => currentResults.push({
                    type: 'consumidor',
                    title: (c.nombre || '').trim() || '(Sin nombre)',
                    desc: c.telefono || 'Sin teléfono',
                    icon: '👥',
                    url: `consumidores.html?id=${c.id}`
                }));
            }

            if (repartidores) {
                repartidores.forEach(r => currentResults.push({
                    type: 'repartidor',
                    title: `${r.nombre || ''} ${r.apellido || ''}`.trim(),
                    icon: '🚚',
                    url: `repartidores.html?id=${r.id}`
                }));
            }

            renderResults();

        } catch (error) {
            console.error('Error in global search:', error);
            resultsContainer.innerHTML = '<div style="padding: 12px; color: var(--danger);">Error al buscar</div>';
        }
    }

    function renderResults() {
        if (currentResults.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted);">No se encontraron resultados</div>';
            return;
        }

        resultsContainer.innerHTML = currentResults.map((item, index) => `
            <a href="${item.url}" class="command-item" data-index="${index}">
                <div class="command-item-icon">${item.icon}</div>
                <div class="command-item-content">
                    <div class="command-item-title">${escapeHtml(item.title)}</div>
                    ${item.desc ? `<div class="command-item-desc">${escapeHtml(item.desc)}</div>` : ''}
                </div>
            </a>
        `).join('');

        focusedIndex = 0;
        updateFocus();
    }

    function focusNext() {
        if (currentResults.length === 0) return;
        focusedIndex = (focusedIndex + 1) % currentResults.length;
        updateFocus();
    }

    function focusPrev() {
        if (currentResults.length === 0) return;
        focusedIndex = (focusedIndex - 1 + currentResults.length) % currentResults.length;
        updateFocus();
    }

    function updateFocus() {
        const items = resultsContainer.querySelectorAll('.command-item');
        items.forEach((item, idx) => {
            if (idx === focusedIndex) {
                item.classList.add('focused');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('focused');
            }
        });
    }

    function selectCurrent() {
        if (focusedIndex >= 0 && focusedIndex < currentResults.length) {
            window.location.href = currentResults[focusedIndex].url;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
