const API_URL = 'https://piesc-new.onrender.com';
let token = localStorage.getItem('token') || null;

// ================= LOGIN AUTOMÁTICO =================
async function loginConvidado() {
    if (!token) {
        try {
            const res = await fetch(`${API_URL}/auth/login/convidado`, { method: 'POST' });
            const data = await res.json();
            if (data.token) {
                token = data.token;
                localStorage.setItem('token', token);
                localStorage.setItem('modo_convidado', 'true');
            } else {
                console.error('Falha ao logar como convidado', data);
            }
        } catch (err) { console.error('Erro login convidado:', err); }
    }
}

// ================= FETCH COM TOKEN =================
async function fetchAPI(endpoint, options = {}) {
    const authToken = token || localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.erro || `Erro ${res.status}`);
    }
    return res.json();
}

// ================= AUTENTICAÇÃO =================
function checkAuth() {
    const tokenCheck = localStorage.getItem('token');
    if (!tokenCheck) { window.location.href = 'login.html'; return false; }
    return true;
}

function loadUserInfo() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const isConvidado = localStorage.getItem('modo_convidado') === 'true';

    if (usuario.username) {
        $('#userInfo').html(`
            <div class="navbar-nav">
                <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="bi bi-${isConvidado ? 'eye' : 'person-circle'}"></i> 
                        ${usuario.nome_completo || usuario.username}
                        ${isConvidado ? ' <span class="badge bg-secondary">Convidado</span>' : ''}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><span class="dropdown-item-text"><small>${isConvidado ? 'Visualização somente' : usuario.role || 'user'}</small></span></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Sair</a></li>
                    </ul>
                </div>
            </div>
        `);
    } else {
        $('#userInfo').html(`
            <div class="navbar-nav">
                <a class="nav-link" href="login.html">
                    <i class="bi bi-box-arrow-in-right"></i> Entrar
                </a>
            </div>
        `);
    }
}

function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('modo_convidado');
        window.location.href = 'login.html';
    }
}

// ================= MENSAGENS =================
function showLoading() { $('#loading').removeClass('d-none'); }
function hideLoading() { $('#loading').addClass('d-none'); }

function showError(err) {
    hideLoading();
    const msg = typeof err === 'string' ? err : err.message || 'Erro desconhecido';
    const toast = $(`
        <div class="toast align-items-center text-white bg-danger border-0 show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index:10000;">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>${msg}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);
    $('body').append(toast);
    setTimeout(() => toast.remove(), 5000);
    console.error('Erro detalhado:', err);
}

function showSuccess(msg) {
    hideLoading();
    const toast = $(`
        <div class="toast align-items-center text-white bg-success border-0 show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index:10000;">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle-fill me-2"></i>${msg}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);
    $('body').append(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== DOADORES ====================
async function loadDoadores() {
    if (!checkAuth()) return;
    showLoading();
    try {
        const data = await fetchAPI('/doadores');
        const isConvidado = localStorage.getItem('modo_convidado') === 'true';

        let html = `
            <h2 class="mb-4">Doadores</h2>
            ${!isConvidado ? `
            <div class="row mb-3">
                <div class="col-md-6">
                    <button class="btn btn-primary" onclick="showAddDoador()">
                        <i class="bi bi-plus-circle"></i> Novo Doador
                    </button>
                    <button class="btn btn-success ms-2" onclick="exportToExcel('doadores')">
                        <i class="bi bi-file-earmark-excel"></i> Exportar
                    </button>
                </div>
                <div class="col-md-6">
                    <input type="text" id="searchDoador" class="form-control" placeholder="Pesquisar...">
                </div>
            </div>` : ''}

            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Contato</th>
                            ${!isConvidado ? '<th>Ações</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(doador => {
            html += `
                <tr>
                    <td>${doador.id_doador}</td>
                    <td>${doador.nome}</td>
                    <td>${doador.contato}</td>
                    ${!isConvidado ? `
                    <td>
                        <button class="btn btn-sm btn-info" onclick="editDoador(${doador.id_doador})">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDoador(${doador.id_doador})">
                            <i class="bi bi-trash"></i> Excluir
                        </button>
                    </td>` : ''}
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        $('#content').html(html);

        $('#searchDoador').on('input', function() {
            const term = $(this).val().toLowerCase();
            $('table tbody tr').each(function() {
                $(this).toggle($(this).text().toLowerCase().includes(term));
            });
        });

    } catch (err) { showError(err); if(err.message.includes('401')) logout(); }
    finally { hideLoading(); }
}

async function showAddDoador(editId=null) {
    if (localStorage.getItem('modo_convidado') === 'true') { alert('Acesso somente leitura'); return; }

    $('#modalTitle').text(editId ? 'Editar Doador' : 'Adicionar Doador');

    let doadorData = { nome:'', contato:'' };
    if (editId) {
        try { doadorData = await fetchAPI(`/doadores/${editId}`); } catch(err){ showError(err); return; }
    }

    $('#modalBody').html(`
        <form id="doadorForm">
            <div class="mb-3">
                <label class="form-label">Nome *</label>
                <input type="text" class="form-control" name="nome" value="${doadorData.nome}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Contato *</label>
                <input type="text" class="form-control" name="contato" value="${doadorData.contato}" required>
            </div>
            <button type="submit" class="btn btn-primary">${editId?'Atualizar':'Salvar'}</button>
        </form>
    `);

    $('#doadorForm').submit(async function(e) {
        e.preventDefault();
        const formData = $(this).serializeArray().reduce((obj, i) => (obj[i.name]=i.value,obj),{});
        showLoading();
        try {
            if (editId) await fetchAPI(`/doadores/${editId}`, { method: 'PUT', body: JSON.stringify(formData) });
            else await fetchAPI('/doadores', { method: 'POST', body: JSON.stringify(formData) });
            $('#genericModal').modal('hide');
            loadDoadores();
            showSuccess(editId?'Doador atualizado!':'Doador adicionado!');
        } catch(err){ showError(err); } 
        finally{ hideLoading(); }
    });

    $('#genericModal').modal('show');
}

async function editDoador(id) { showAddDoador(id); }

async function deleteDoador(id) {
    if (localStorage.getItem('modo_convidado')==='true'){ alert('Acesso somente leitura'); return; }
    if (!confirm('Deseja realmente excluir este doador?')) return;

    showLoading();
    try {
        const data = await fetchAPI(`/doadores/${id}`, { method: 'DELETE' });
        showSuccess(data.mensagem || 'Doador excluído!');
        loadDoadores();
    } catch(err){ showError(err); }
    finally{ hideLoading(); }
}

// ==================== DOAÇÕES ====================
async function loadDoacoes() {
    if (!checkAuth()) return;
    showLoading();
    try {
        const data = await fetchAPI('/doacoes');
        const isConvidado = localStorage.getItem('modo_convidado')==='true';

        let html = `<h2 class="mb-4">Doações</h2>`;
        html += `<div class="table-responsive"><table class="table table-striped table-hover">
            <thead><tr>
                <th>ID</th><th>Doador</th><th>Data</th><th>Itens</th>
                ${!isConvidado?'<th>Ações</th>':''}
            </tr></thead><tbody>`;
        
        data.forEach(doacao=>{
            html+=`<tr>
                <td>${doacao.id_doacao}</td>
                <td>${doacao.doador_nome}</td>
                <td>${doacao.data}</td>
                <td>${doacao.itens.map(i=>i.nome).join(', ')}</td>
                ${!isConvidado?`<td>
                    <button class="btn btn-sm btn-info" onclick="editDoacao(${doacao.id_doacao})"><i class="bi bi-pencil"></i> Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDoacao(${doacao.id_doacao})"><i class="bi bi-trash"></i> Excluir</button>
                </td>`:''}
            </tr>`;
        });

        html += `</tbody></table></div>`;
        $('#content').html(html);

    } catch(err){ showError(err); if(err.message.includes('401')) logout(); }
    finally{ hideLoading(); }
}

async function editDoacao(id){ /* mesmo padrão do doador */ }
async function deleteDoacao(id){ /* mesmo padrão do doador */ }

// ==================== CESTAS ====================
async function loadCestas(){ /* fetchAPI('/cestas') + tabela + CRUD */ }
// ==================== ITENS ====================
async function loadItens(){ /* fetchAPI('/itens') + tabela + CRUD */ }

// ==================== EXPORTAÇÃO ====================
function exportToExcel(tipo){ alert('Função de exportação '+tipo+' ainda não implementada'); }

// ==================== INICIALIZAÇÃO ====================
$(document).ready(async function(){
    await loginConvidado();
    if(!checkAuth()) return;
    loadUserInfo();

    $('[data-section]').click(function(e){
        e.preventDefault();
        const section=$(this).data('section');
        switch(section){
            case 'doadores': loadDoadores(); break;
            case 'doacoes': loadDoacoes(); break;
            case 'cestas': loadCestas(); break;
            case 'itens': loadItens(); break;
        }
    });
});
