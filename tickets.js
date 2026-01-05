document.addEventListener('DOMContentLoaded', async () => {
    // Debounce helper
    const debounce = window.utils.debounce;

    // Check Auth is handled by guard.js

    const ticketsGrid = document.getElementById('ticketsGrid');
    const filterStatus = document.getElementById('filterStatus');
    const searchInput = document.getElementById('searchInput');
    const btnRefresh = document.getElementById('btnRefresh');

    // Modal elements
    const modalTicket = document.getElementById('modalTicket');
    const btnCloseTicketModal = document.getElementById('btnCloseTicketModal');
    const btnCancelTicket = document.getElementById('btnCancelTicket');
    const btnSaveTicketStatus = document.getElementById('btnSaveTicketStatus');
    const btnDeleteTicket = document.getElementById('btnDeleteTicket'); // New Delete Button

    // Current Ticket State
    let currentTicketId = null;

    // --- Init ---
    loadTickets();

    // --- Event Listeners ---
    if (btnRefresh) btnRefresh.addEventListener('click', loadTickets);
    if (filterStatus) filterStatus.addEventListener('change', loadTickets);
    if (searchInput) searchInput.addEventListener('input', debounce(loadTickets, 500));

    // Modal Close
    const closeModal = () => {
        modalTicket.classList.remove('active');
        currentTicketId = null;
    };
    if (btnCloseTicketModal) btnCloseTicketModal.addEventListener('click', closeModal);
    if (btnCancelTicket) btnCancelTicket.addEventListener('click', closeModal);

    // Save Status
    if (btnSaveTicketStatus) {
        btnSaveTicketStatus.addEventListener('click', async () => {
            if (!currentTicketId) return;
            const newStatus = document.getElementById('selectNewStatus').value;

            try {
                const { error } = await supabaseClient
                    .from('tickets')
                    .update({ estado: newStatus })
                    .eq('id', currentTicketId);

                if (error) throw error;

                closeModal();
                loadTickets();
                alert('Estado actualizado correctamente');
            } catch (err) {
                console.error('Error updating status:', err);
                alert('Error al actualizar estado');
            }
        });
    }


    // --- Functions ---

    async function loadTickets() {
        ticketsGrid.innerHTML = '<div class="bento-card" style="grid-column: span 3; text-align: center; padding: 40px;"><p>Cargando tickets...</p></div>';

        const statusFilter = filterStatus.value;
        const search = searchInput.value.toLowerCase();

        let query = supabaseClient
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (statusFilter !== 'todos') {
            query = query.eq('estado', statusFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tickets:', error);
            ticketsGrid.innerHTML = '<div class="error-msg">Error al cargar tickets</div>';
            return;
        }

        let filteredData = data;
        if (search) {
            filteredData = data.filter(t =>
                (t.asunto && t.asunto.toLowerCase().includes(search)) ||
                (t.email && t.email.toLowerCase().includes(search)) ||
                (t.nombre && t.nombre.toLowerCase().includes(search))
            );
        }

        renderTickets(filteredData);
    }

    function renderTickets(tickets) {
        ticketsGrid.innerHTML = '';
        if (tickets.length === 0) {
            ticketsGrid.innerHTML = '<div class="bento-card" style="grid-column: span 3; text-align: center; padding: 40px;"><p class="muted">No se encontraron tickets.</p></div>';
            return;
        }

        tickets.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'bento-card';

            // Status Color Logic
            let statusColor = 'var(--text-muted)';
            if (ticket.estado === 'Pendiente') statusColor = '#ef4444'; // Red
            if (ticket.estado === 'En Proceso') statusColor = '#f59e0b'; // Amber
            if (ticket.estado === 'Resuelto') statusColor = '#10b981'; // Green

            const dateStr = new Date(ticket.created_at).toLocaleDateString();

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <span class="badge" style="background-color: var(--bg-body); border: 1px solid var(--border-color);">${ticket.tipo || 'General'}</span>
                    <span style="font-size: 0.8rem; font-weight: 600; color: ${statusColor};">${ticket.estado}</span>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 1.1rem;">${ticket.asunto || '(Sin asunto)'}</h3>
                <p class="muted" style="font-size: 0.9rem; margin-bottom: 16px;">
                    ${ticket.mensaje ? (ticket.mensaje.length > 80 ? ticket.mensaje.substring(0, 80) + '...' : ticket.mensaje) : ''}
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px;">
                    <div style="font-size: 0.85rem;">
                        <div><strong>${ticket.nombre || 'Anónimo'}</strong></div>
                        <div class="muted">${dateStr}</div>
                    </div>
                    <button class="btn-secundario btn-sm view-ticket-btn" data-id="${ticket.id}">Ver</button>
                </div>
            `;
            ticketsGrid.appendChild(card);
        });

        // Add event listeners to "Ver" buttons
        document.querySelectorAll('.view-ticket-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const ticket = tickets.find(t => t.id == id);
                openTicketModal(ticket);
            });
        });
    }

    function openTicketModal(ticket) {
        if (!ticket) return;
        currentTicketId = ticket.id;

        document.getElementById('modalTicketSubject').textContent = ticket.asunto;
        document.getElementById('modalTicketName').textContent = ticket.nombre;
        document.getElementById('modalTicketEmail').textContent = ticket.email;
        document.getElementById('modalTicketPhone').textContent = ticket.telefono || 'No especificado'; // Show Phone
        document.getElementById('modalTicketType').textContent = ticket.tipo;
        document.getElementById('modalTicketDate').textContent = new Date(ticket.created_at).toLocaleString();
        document.getElementById('modalTicketMessage').textContent = ticket.mensaje;

        // Select current status
        document.getElementById('selectNewStatus').value = ticket.estado;

        modalTicket.classList.add('active');
    }

    // Delete Ticket Event
    if (btnDeleteTicket) {
        btnDeleteTicket.onclick = async () => {
            if (!currentTicketId) return;
            if (!confirm('¿Estás seguro de que deseas eliminar este ticket permanentemente?')) return;

            try {
                const { error } = await supabaseClient
                    .from('tickets')
                    .delete()
                    .eq('id', currentTicketId);

                if (error) throw error;

                closeModal();
                loadTickets();
                // alert('Ticket eliminado'); // Optional feedback
            } catch (err) {
                console.error('Error deleting ticket:', err);
                alert('Error al eliminar ticket');
            }
        };
    }

});
