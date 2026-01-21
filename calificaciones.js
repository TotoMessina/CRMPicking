document.addEventListener('DOMContentLoaded', async () => {
    const debounce = window.utils.debounce;

    const ratingsGrid = document.getElementById('ratingsGrid');
    const filterScore = document.getElementById('filterScore');
    const filterStatus = document.getElementById('filterStatus');
    const searchInput = document.getElementById('searchInput');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnNewRating = document.getElementById('btnNewRating');

    // View Modal
    const modalRating = document.getElementById('modalRating');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancel = document.getElementById('btnCancel');
    const btnSaveStatus = document.getElementById('btnSaveStatus');
    const btnDeleteRating = document.getElementById('btnDeleteRating');

    // Create Modal
    const modalCreate = document.getElementById('modalCreate');
    const btnCloseCreate = document.getElementById('btnCloseCreate');
    const btnCancelCreate = document.getElementById('btnCancelCreate');
    const formCreate = document.getElementById('formCreate');

    let currentRatingId = null;

    // --- Init ---
    loadRatings();

    // --- Events ---
    if (btnRefresh) btnRefresh.addEventListener('click', loadRatings);
    if (filterScore) filterScore.addEventListener('change', loadRatings);
    if (filterStatus) filterStatus.addEventListener('change', loadRatings);
    if (searchInput) searchInput.addEventListener('input', debounce(loadRatings, 500));

    // Modal View Actions
    const closeViewModal = () => { modalRating.classList.remove('active'); currentRatingId = null; };
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeViewModal);
    if (btnCancel) btnCancel.addEventListener('click', closeViewModal);

    if (btnSaveStatus) {
        btnSaveStatus.addEventListener('click', async () => {
            if (!currentRatingId) return;
            const newStatus = document.getElementById('selectNewStatus').value;
            try {
                const { error } = await supabaseClient
                    .from('calificaciones')
                    .update({ estado: newStatus })
                    .eq('id', currentRatingId);
                if (error) throw error;
                window.showToast("Estado actualizado", "success");
                closeViewModal();
                loadRatings();
            } catch (e) {
                console.error(e);
                window.showToast("Error al actualizar", "error");
            }
        });
    }

    if (btnDeleteRating) {
        btnDeleteRating.addEventListener('click', async () => {
            if (!currentRatingId) return;
            if (!confirm("¿Eliminar calificación?")) return;
            try {
                const { error } = await supabaseClient
                    .from('calificaciones')
                    .delete()
                    .eq('id', currentRatingId);
                if (error) throw error;
                window.showToast("Calificación eliminada", "success");
                closeViewModal();
                loadRatings();
            } catch (e) {
                console.error(e);
                window.showToast("Error al eliminar", "error");
            }
        });
    }

    // Modal Create Actions
    const closeCreateModal = () => modalCreate.classList.remove('active');
    if (btnNewRating) btnNewRating.addEventListener('click', () => {
        formCreate.reset();
        modalCreate.classList.add('active');
    });
    if (btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateModal);
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateModal);

    if (formCreate) {
        formCreate.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('inpNewName').value;
            const aspect = document.getElementById('inpNewAspect').value;
            const comment = document.getElementById('inpNewComment').value;
            // Get Radio Value
            const score = document.querySelector('input[name="newScore"]:checked')?.value || 5;

            try {
                const { error } = await supabaseClient
                    .from('calificaciones')
                    .insert([{
                        nombre_local: name,
                        puntaje: parseInt(score),
                        aspecto: aspect,
                        comentario: comment,
                        estado: 'Nuevo',
                        created_at: new Date()
                    }]);

                if (error) throw error;
                window.showToast("Calificación creada", "success");
                closeCreateModal();
                loadRatings();
            } catch (err) {
                console.error(err);
                window.showToast("Error al crear", "error");
            }
        });
    }


    // --- Functions ---
    async function loadRatings() {
        ratingsGrid.innerHTML = '<div class="bento-card" style="grid-column:span 3; text-align:center; padding:40px;"><p>Cargando...</p></div>';

        const score = filterScore.value;
        const status = filterStatus.value;
        const search = searchInput.value.toLowerCase();

        let query = supabaseClient
            .from('calificaciones')
            .select('*')
            .order('created_at', { ascending: false });

        if (score !== 'todos') query = query.eq('puntaje', score);
        if (status !== 'todos') query = query.eq('estado', status);

        const { data, error } = await query;
        if (error) {
            console.error(error);
            ratingsGrid.innerHTML = '<div class="error-msg">Error cargando datos</div>';
            return;
        }

        let filtered = data;
        if (search) {
            filtered = data.filter(r =>
                (r.nombre_local && r.nombre_local.toLowerCase().includes(search)) ||
                (r.comentario && r.comentario.toLowerCase().includes(search))
            );
        }

        renderRatings(filtered);
    }

    function renderRatings(list) {
        ratingsGrid.innerHTML = '';
        if (list.length === 0) {
            ratingsGrid.innerHTML = '<div class="bento-card" style="grid-column: span 3; text-align: center; padding: 40px;"><p class="muted">No se encontraron calificaciones.</p></div>';
            return;
        }

        list.forEach(r => {
            const card = document.createElement('div');
            card.className = 'bento-card';

            const stars = "⭐".repeat(r.puntaje);
            const dateStr = window.utils.formatDateES(r.created_at ? r.created_at.split('T')[0] : '');

            let statusColor = '#9ca3af';
            if (r.estado === 'Nuevo') statusColor = '#3b82f6';
            if (r.estado === 'Leído') statusColor = '#10b981';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                     <span class="badge">${r.aspecto || 'General'}</span>
                     <span style="font-size:0.8rem; font-weight:600; color:${statusColor}">${r.estado}</span>
                </div>
                <div style="font-size:0.85em; color:var(--text-muted); margin-bottom:4px;">Atendido por: <strong>${r.atendido_por || '-'}</strong></div>
                <h3 style="margin:0 0 4px 0;">${r.nombre_local || 'Kiosco'}</h3>
                <div class="star-rating" style="margin-bottom:8px;">${stars} <span class="muted" style="font-size:0.8em">(${r.puntaje})</span></div>
                
                <p class="muted" style="font-size:0.9rem; margin-bottom:16px; font-style:italic;">
                    "${r.comentario ? (r.comentario.length > 60 ? r.comentario.substring(0, 60) + '...' : r.comentario) : 'Sin comentario'}"
                </p>

                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #eee; padding-top:12px;">
                    <div style="font-size:0.8rem;" class="muted">${dateStr}</div>
                    <button class="btn-secundario btn-sm view-btn" data-id="${r.id}">Ver Detalle</button>
                </div>
            `;
            ratingsGrid.appendChild(card);
        });

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = list.find(l => l.id == btn.dataset.id);
                openViewModal(item);
            });
        });
    }

    function openViewModal(item) {
        if (!item) return;
        currentRatingId = item.id;
        document.getElementById('modalTitle').textContent = "Detalle de Calificación";
        document.getElementById('modalKioscoName').textContent = item.nombre_local;
        document.getElementById('modalStars').textContent = "⭐".repeat(item.puntaje) + ` (${item.puntaje}/5)`;
        document.getElementById('modalAspect').textContent = item.aspecto;
        document.getElementById('modalAttendedBy').textContent = item.atendido_por || '-';
        document.getElementById('modalDate').textContent = new Date(item.created_at).toLocaleString();
        document.getElementById('modalComment').textContent = item.comentario || "(Sin comentario)";
        document.getElementById('selectNewStatus').value = item.estado;

        modalRating.classList.add('active');
    }

});
