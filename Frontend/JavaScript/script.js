const API_URL = 'http://localhost:5000';

// ========== CONFIGURAÇÃO GLOBAL DO AJAX ==========
$.ajaxSetup({
    beforeSend: function(xhr) {
        const token = localStorage.getItem('token');
        if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
    }
});

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
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

function showLoading() {
    $('#loading').removeClass('d-none');
}

function hideLoading() {
    $('#loading').addClass('d-none');
}

function showError(jqXHR) {
    hideLoading();
    let errorMsg = 'Erro desconhecido';
    
    if (typeof jqXHR === 'string') {
        errorMsg = jqXHR;
    } else if (jqXHR.responseJSON && jqXHR.responseJSON.erro) {
        errorMsg = jqXHR.responseJSON.erro;
    } else if (jqXHR.status === 0) {
        errorMsg = 'Sem conexão com o servidor';
    } else if (jqXHR.status === 401) {
        errorMsg = 'Não autorizado. Faça login novamente.';
        logout();
    } else if (jqXHR.status === 403) {
        errorMsg = 'Acesso negado';
    } else if (jqXHR.responseText) {
        errorMsg = jqXHR.responseText;
    }

    const toast = $(`
        <div class="toast align-items-center text-white bg-danger border-0 show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 10000;">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>${errorMsg}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);
    
    $('body').append(toast);
    setTimeout(() => toast.remove(), 5000);
    
    console.error('Erro detalhado:', jqXHR);
}

function showSuccess(mensagem) {
    hideLoading();
    
    const toast = $(`
        <div class="toast align-items-center text-white bg-success border-0 show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 10000;">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle-fill me-2"></i>${mensagem}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);
    
    $('body').append(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== FUNÇÃO LOADDOADORES (COMPLETA E INTEGRADA) ==========
function loadDoadores() {
    if (!checkAuth()) return;
    
    showLoading();
    
    $.ajax({
        url: `${API_URL}/doadores`,
        type: 'GET',
        success: function(data) {
            const isConvidado = localStorage.getItem('modo_convidado') === 'true';
            
            let html = `
                <h2 class="mb-4">Doadores</h2>
                ${!isConvidado ? `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <button class="btn btn-primary" onclick="showAddDoador()">
                            <i class="bi bi-plus-circle"></i> Novo Doador
                        </button>
                        <button class="btn btn-success ms-2" onclick="exportToExcel()">
                            <i class="bi bi-file-earmark-excel"></i> Exportar
                        </button>
                    </div>
                    <div class="col-md-6">
                        <input type="text" id="searchDoador" class="form-control" placeholder="Pesquisar...">
                    </div>
                </div>
                ` : ''}
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
                        </td>
                        ` : ''}
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            $('#content').html(html);
            
            // Configura pesquisa
            $('#searchDoador').on('input', function() {
                const term = $(this).val().toLowerCase();
                $('table tbody tr').each(function() {
                    const rowText = $(this).text().toLowerCase();
                    $(this).toggle(rowText.includes(term));
                });
            });
        },
        error: function(jqXHR) {
            if (jqXHR.status === 401) {
                showError("Sessão expirada. Faça login novamente.");
                logout();
            } else {
                showError(jqXHR);
            }
        },
        complete: function() {
            hideLoading();
        }
    });
}

// ========== FUNÇÕES DE DOADORES ==========
function showAddDoador() {
    if (localStorage.getItem('modo_convidado') === 'true') {
        alert('Acesso somente leitura. Faça login para editar.');
        return;
    }

    $('#modalTitle').text('Adicionar Doador');
    $('#modalBody').html(`
        <form id="doadorForm">
            <div class="mb-3">
                <label class="form-label">Nome *</label>
                <input type="text" class="form-control" name="nome" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Contato *</label>
                <input type="text" class="form-control" name="contato" required>
            </div>
            <button type="submit" class="btn btn-primary">Salvar</button>
        </form>
    `);

    $('#doadorForm').submit(function(e) {
        e.preventDefault();
        const formData = $(this).serializeArray().reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
        }, {});

        showLoading();
        
        $.ajax({
            url: `${API_URL}/doadores`,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(formData),
            success: function() {
                $('#genericModal').modal('hide');
                loadDoadores();
                showSuccess('Doador adicionado com sucesso!');
            },
            error: showError,
            complete: hideLoading
        });
    });

    $('#genericModal').modal('show');
}

function editDoador(id) {
    if (localStorage.getItem('modo_convidado') === 'true') {
        alert('Acesso somente leitura. Faça login para editar.');
        return;
    }

    showLoading();
    
    $.ajax({
        url: `${API_URL}/doadores/${id}`,
        type: 'GET',
        success: function(doador) {
            $('#modalTitle').text('Editar Doador');
            $('#modalBody').html(`
                <form id="editDoadorForm">
                    <div class="mb-3">
                        <label class="form-label">Nome *</label>
                        <input type="text" class="form-control" name="nome" value="${doador.nome}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Contato *</label>
                        <input type="text" class="form-control" name="contato" value="${doador.contato}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </form>
            `);

            $('#editDoadorForm').submit(function(e) {
                e.preventDefault();
                const formData = $(this).serializeArray().reduce((obj, item) => {
                    obj[item.name] = item.value;
                    return obj;
                }, {});

                showLoading();
                
                $.ajax({
                    url: `${API_URL}/doadores/${id}`,
                    type: 'PUT',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify(formData),
                    success: function(response) {
                        $('#genericModal').modal('hide');
                        loadDoadores();
                        showSuccess('Doador atualizado com sucesso!');
                    },
                    error: showError,
                    complete: hideLoading
                });
            });

            $('#genericModal').modal('show');
        },
        error: showError,
        complete: hideLoading
    });
}

function deleteDoador(id) {
    if (localStorage.getItem('modo_convidado') === 'true') {
        alert('Acesso somente leitura. Faça login para editar.');
        return;
    }

    if (!confirm('Tem certeza que deseja excluir este doador?\nEsta ação não pode ser desfeita.')) {
        return;
    }

    showLoading();
    
    $.ajax({
        url: `${API_URL}/doadores/${id}`,
        type: 'DELETE',
        success: function(response) {
            loadDoadores();
            showSuccess('Doador excluído com sucesso!');
        },
        error: showError,
        complete: hideLoading
    });
}

function exportToExcel() {
    const table = $('table').first();
    let csvContent = '';
    
    const BOM = '\uFEFF';
    
    const headers = [];
    table.find('thead th').each(function() {
        if (!$(this).text().includes('Ações')) {
            headers.push(`"${$(this).text().trim()}"`);
        }
    });
    csvContent += BOM + headers.join(',') + '\n';
    
    table.find('tbody tr').each(function() {
        const cells = [];
        $(this).find('td').each(function(index) {
            if (index < $(this).closest('tr').find('td').length - 1) {
                const text = $(this).text().trim();
                cells.push(`"${text.replace(/"/g, '""')}"`);
            }
        });
        csvContent += cells.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `doadores_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSuccess('Planilha exportada com sucesso!');
}

// ========== FUNÇÕES DE DOAÇÕES ==========
function loadDoacoes() {
    if (!checkAuth()) return;
    
    showLoading();
    
    const isConvidado = localStorage.getItem('modo_convidado') === 'true';
    
    $.get(`${API_URL}/doacoes`)
        .done(function(data) {
            let html = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="mb-0">Doações</h2>
                    ${isConvidado ? `
                    <button class="btn btn-success btn-lg" onclick="showDoacaoForm()">
                        <i class="bi bi-heart-fill"></i> Fazer Doação
                    </button>
                    ` : `
                    <button class="btn btn-outline-primary" onclick="showDoacaoForm()">
                        <i class="bi bi-plus-circle"></i> Nova Doação
                    </button>
                    `}
                </div>
                
                ${isConvidado ? `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Visualização transparente de todas as doações realizadas
                </div>
                ` : ''}
                
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Doador</th>
                                <th>Data</th>
                                <th>Observações</th>
                                ${!isConvidado ? '<th>Ações</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.length === 0) {
                html += `
                    <tr>
                        <td colspan="${isConvidado ? 4 : 5}" class="text-center text-muted py-4">
                            <i class="bi bi-inbox"></i><br>
                            Nenhuma doação encontrada
                        </td>
                    </tr>
                `;
            } else {
                data.forEach(doacao => {
                    html += `
                        <tr>
                            <td>${doacao.id_doacao}</td>
                            <td>${doacao.id_doador}</td>
                            <td>${doacao.data_doacao}</td>
                            <td>${doacao.observacoes || '-'}</td>
                            ${!isConvidado ? `
                            <td>
                                <button class="btn btn-sm btn-info" onclick="verDoacao(${doacao.id_doacao})">
                                    <i class="bi bi-eye"></i> Ver
                                </button>
                            </td>
                            ` : ''}
                        </tr>
                    `;
                });
            }

            html += `
                        </tbody>
                    </table>
                </div>
                
                ${data.length > 0 ? `
                <div class="mt-3 text-end">
                    <small class="text-muted">
                        Total: ${data.length} doação${data.length !== 1 ? 'es' : ''}
                    </small>
                </div>
                ` : ''}
            `;

            $('#content').html(html);
        })
        .fail(showError)
        .always(hideLoading);
}
// Função para atualizar automaticamente
function startAutoRefresh() {
    // Atualiza a cada 30 segundos apenas se na aba de Doações
    setInterval(() => {
        if (window.location.hash === '#doacoes' || 
            document.querySelector('[data-section].active')?.dataset?.section === 'doacoes') {
            loadDoacoes();
        }
    }, 30000);
}

function showDoacaoForm() {
    if (localStorage.getItem('modo_convidado') === 'true') {
        showModalDoacaoSimples();
    } else {
        showModalDoacaoCompleta();
    }
}

function showModalDoacaoSimples() {
    $('#modalTitle').text('Fazer Doação');
    $('#modalBody').html(`
        <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> 
            Para fazer uma doação, entre em contato conosco:
        </div>
        
        <div class="text-center">
            <p><strong>Telefone:</strong> (XX) XXXX-XXXX</p>
            <p><strong>Email:</strong> doacoes@piesc.org</p>
            <p><strong>Endereço:</strong> Rua Exemplo, 123 - Centro</p>
            
            <div class="mt-4">
                <button class="btn btn-primary" onclick="window.open('mailto:doacoes@piesc.org')">
                    <i class="bi bi-envelope"></i> Enviar Email
                </button>
            </div>
        </div>
    `);
    
    $('#genericModal').modal('show');
}

function showModalDoacaoCompleta() {
    $('#modalTitle').text('Nova Doação');
    $('#modalBody').html(`
        <form id="doacaoForm">
            <div class="mb-3">
                <label class="form-label">Doador *</label>
                <select class="form-select" name="id_doador" required>
                    <option value="">Selecione um doador...</option>
                    <!-- Os options serão preenchidos via AJAX -->
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label">Data da Doação</label>
                <input type="date" class="form-control" name="data_doacao" 
                       value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="mb-3">
                <label class="form-label">Observações</label>
                <textarea class="form-control" name="observacoes" rows="3" 
                          placeholder="Informações sobre a doação"></textarea>
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Registrar Doação</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            </div>
        </form>
    `);

    // Carrega doadores para o select
    $.get(`${API_URL}/doadores`)
        .done(function(doadores) {
            const select = $('select[name="id_doador"]');
            doadores.forEach(doador => {
                select.append(`<option value="${doador.id_doador}">${doador.nome}</option>`);
            });
        })
        .fail(showError);

    $('#doacaoForm').submit(function(e) {
        e.preventDefault();
        const formData = $(this).serializeArray().reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
        }, {});

        showLoading();
        
        $.ajax({
            url: `${API_URL}/doacoes`,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(formData),
            success: function(response) {
                $('#genericModal').modal('hide');
                showSuccess('Doação registrada com sucesso!');
                loadDoacoes(); // Atualiza a lista
            },
            error: showError,
            complete: hideLoading
        });
    });

    $('#genericModal').modal('show');
}

function verDoacao(id_doacao) {
    showLoading();
    
    $.get(`${API_URL}/doacoes/${id_doacao}`)
        .done(function(doacao) {
            $('#modalTitle').text(`Doação #${doacao.id_doacao}`);
            
            let html = `
                <div class="row">
                    <div class="col-md-6">
                        <strong>Doador:</strong> ${doacao.id_doador}
                    </div>
                    <div class="col-md-6">
                        <strong>Data:</strong> ${doacao.data_doacao}
                    </div>
                    <div class="col-12 mt-3">
                        <strong>Observações:</strong><br>
                        ${doacao.observacoes || 'Nenhuma observação'}
                    </div>
                </div>
                
                <hr>
                <h5>Itens Doados</h5>
            `;

            // Adicione aqui a lógica para carregar itens da doação se existir
            html += `
                <div class="text-center text-muted">
                    <i class="bi bi-box"></i><br>
                    Funcionalidade de itens em desenvolvimento
                </div>
            `;

            $('#modalBody').html(html);
            $('#genericModal').modal('show');
        })
        .fail(showError)
        .always(hideLoading);
}


// ========== FUNÇÕES DE CESTAS BÁSICAS ==========
function loadCestas() {
    if (!checkAuth()) return;
    
    showLoading();
    $.get(`${API_URL}/cestas`)
        .done(function(data) {
            const isConvidado = localStorage.getItem('modo_convidado') === 'true';
            
            let html = `
                <h2 class="mb-4">Cestas Básicas</h2>
                ${!isConvidado ? `
                <button class="btn btn-primary mb-3" onclick="showAddCesta()">
                    <i class="bi bi-plus-circle"></i> Nova Cesta
                </button>
                ` : ''}
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Data</th>
                                <th>Destinatário</th>
                                <th>Observações</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.length === 0) {
                html += `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i class="bi bi-inbox"></i><br>
                            Nenhuma cesta encontrada
                        </td>
                    </tr>
                `;
            } else {
                data.forEach(cesta => {
                    html += `
                        <tr>
                            <td>${cesta.id_cesta}</td>
                            <td>${cesta.data_montagem}</td>
                            <td>${cesta.destinatario}</td>
                            <td>${cesta.observacoes || '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-info" onclick="showCestaDetails(${cesta.id_cesta})">
                                    <i class="bi bi-eye"></i> Detalhes
                                </button>
                                ${!isConvidado ? `
                                <button class="btn btn-sm btn-warning" onclick="editCesta(${cesta.id_cesta})">
                                    <i class="bi bi-pencil"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteCesta(${cesta.id_cesta})">
                                    <i class="bi bi-trash"></i> Excluir
                                </button>
                                ` : ''}
                            </td>
                        </tr>
                    `;
                });
            }

            html += `
                        </tbody>
                    </table>
                </div>
                
                ${data.length > 0 ? `
                <div class="mt-3 text-end">
                    <small class="text-muted">
                        Total: ${data.length} cesta${data.length !== 1 ? 's' : ''}
                    </small>
                </div>
                ` : ''}
            `;

            $('#content').html(html);
        })
        .fail(showError)
        .always(hideLoading);
}

// ========== FUNÇÃO PARA EDITAR CESTA ==========
function editCesta(id_cesta) {
    if (localStorage.getItem('modo_convidado') === 'true') {
        alert('Acesso somente leitura. Faça login para editar.');
        return;
    }

    showLoading();
    
    $.ajax({
        url: `${API_URL}/cestas/${id_cesta}`,
        type: 'GET',
        success: function(cesta) {
            $('#modalTitle').text('Editar Cesta Básica');
            $('#modalBody').html(`
                <form id="editCestaForm">
                    <div class="mb-3">
                        <label class="form-label">Destinatário *</label>
                        <input type="text" class="form-control" name="destinatario" 
                               value="${cesta.destinatario}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Data de Montagem</label>
                        <input type="date" class="form-control" name="data_montagem" 
                               value="${cesta.data_montagem}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Observações</label>
                        <textarea class="form-control" name="observacoes" 
                                  rows="3">${cesta.observacoes || ''}</textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    </div>
                </form>
            `);

            $('#editCestaForm').submit(function(e) {
                e.preventDefault();
                
                const formData = $(this).serializeArray().reduce((obj, item) => {
                    obj[item.name] = item.value;
                    return obj;
                }, {});

                showLoading();
                
                $.ajax({
                    url: `${API_URL}/cestas/${id_cesta}`,
                    type: 'PUT',
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify(formData),
                    success: function(response) {
                        $('#genericModal').modal('hide');
                        showSuccess('Cesta atualizada com sucesso!');
                        loadCestas(); // Recarrega a lista
                    },
                    error: function(jqXHR) {
                        let errorMsg = 'Erro ao atualizar cesta';
                        if (jqXHR.responseJSON && jqXHR.responseJSON.erro) {
                            errorMsg = jqXHR.responseJSON.erro;
                        }
                        showError(errorMsg);
                    },
                    complete: hideLoading
                });
            });

            $('#genericModal').modal('show');
        },
        error: showError,
        complete: hideLoading
    });
}

// ========== FUNÇÃO PARA EXCLUIR CESTA ==========
function deleteCesta(id_cesta) {
    if (localStorage.getItem('modo_convidado') === 'true') {
        alert('Acesso somente leitura. Faça login para excluir.');
        return;
    }

    if (!confirm('Tem certeza que deseja excluir esta cesta?\nTodos os itens associados também serão removidos!\nEsta ação não pode ser desfeita.')) {
        return;
    }

    showLoading();
    
    // Use fetch que é mais confiável para DELETE
    fetch(`${API_URL}/cestas/${id_cesta}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.erro || `Erro ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        showSuccess(data.mensagem || 'Cesta excluída com sucesso!');
        loadCestas();
    })
    .catch(error => {
        console.error('Erro detalhado:', error);
        showError(error.message);
    })
    .finally(() => {
        hideLoading();
    });
}
// ========== FUNÇÃO PARA ADICIONAR NOVA CESTA ==========
function showAddCesta() {
    if (localStorage.getItem('modo_convidado') === 'true') {
        alert('Acesso somente leitura. Faça login para criar cestas.');
        return;
    }

    $('#modalTitle').text('Nova Cesta Básica');
    $('#modalBody').html(`
        <form id="cestaForm">
            <div class="mb-3">
                <label class="form-label">Destinatário *</label>
                <input type="text" class="form-control" name="destinatario" required 
                       placeholder="Nome do destinatário">
            </div>
            <div class="mb-3">
                <label class="form-label">Data de Montagem</label>
                <input type="date" class="form-control" name="data_montagem" 
                       value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="mb-3">
                <label class="form-label">Observações</label>
                <textarea class="form-control" name="observacoes" 
                          placeholder="Informações adicionais" rows="3"></textarea>
            </div>
            <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Criar Cesta</button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            </div>
        </form>
    `);

    $('#cestaForm').submit(function(e) {
        e.preventDefault();
        
        const formData = $(this).serializeArray().reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
        }, {});

        // Se data não foi preenchida, usa data atual
        if (!formData.data_montagem) {
            formData.data_montagem = new Date().toISOString().split('T')[0];
        }

        showLoading();
        
        $.ajax({
            url: `${API_URL}/cestas`,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(formData),
            success: function(response) {
                $('#genericModal').modal('hide');
                showSuccess('Cesta criada com sucesso!');
                
                // Opcional: redirecionar para adicionar itens
                if (response.id_cesta) {
                    setTimeout(() => {
                        showCestaDetails(response.id_cesta);
                    }, 1000);
                }
                
                // Recarrega a lista de cestas
                loadCestas();
            },
            error: function(jqXHR) {
                let errorMsg = 'Erro ao criar cesta';
                if (jqXHR.responseJSON && jqXHR.responseJSON.erro) {
                    errorMsg = jqXHR.responseJSON.erro;
                }
                showError(errorMsg);
            },
            complete: function() {
                hideLoading();
            }
        });
    });

    $('#genericModal').modal('show');
}

// ========== INICIALIZAÇÃO ==========
$(document).ready(function() {
    if (!checkAuth()) return;
    
    loadUserInfo();
    startAutoRefresh();

    $('[data-section]').click(function(e) {
        e.preventDefault();
        const section = $(this).data('section');
        loadSection(section);
    });
});

function loadSection(section) {
    if (!checkAuth()) return;
    
    showLoading();
    
    const isConvidado = localStorage.getItem('modo_convidado') === 'true';
    
    // Se for convidado, sempre mostra cestas como página inicial
    if (isConvidado && section !== 'cestas') {
        section = 'cestas'; // Força mostrar cestas para convidados
    }
    
    switch(section) {
        case 'doadores':
            loadDoadores();
            break;
        case 'doacoes':
            loadDoacoes();
            break;
        case 'cestas':
            loadCestas();
            break;
        default:
            $('#content').html(`
                <div class="text-center py-5">
                    <h2>Bem-vindo ao Sistema PIESC</h2>
                    <p class="lead">Selecione uma seção no menu</p>
                </div>
            `);
            hideLoading();
    }
}
// ========== FUNÇÃO PARA MOSTRAR DETALHES DA CESTA ==========
function showCestaDetails(id_cesta) {
    showLoading();
    
    $.ajax({
        url: `${API_URL}/cestas/${id_cesta}`,
        type: 'GET',
        success: function(cesta) {
            const isConvidado = localStorage.getItem('modo_convidado') === 'true';
            
            $('#modalTitle').text(`Cesta #${cesta.id_cesta} - ${cesta.destinatario}`);
            
            let html = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>Data de Montagem:</strong><br>${cesta.data_montagem}
                    </div>
                    <div class="col-md-6">
                        <strong>Destinatário:</strong><br>${cesta.destinatario}
                    </div>
                </div>
                <div class="mb-3">
                    <strong>Observações:</strong><br>${cesta.observacoes || 'Nenhuma'}
                </div>
                <hr>
                <h5>Itens da Cesta</h5>
            `;

            if (cesta.itens && cesta.itens.length > 0) {
                html += `
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Quantidade</th>
                                    <th>Unidade</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                cesta.itens.forEach(item => {
                    html += `
                        <tr>
                            <td>${item.nome_item}</td>
                            <td>${item.quantidade}</td>
                            <td>${item.unidade_medida}</td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">Total: ${cesta.itens.length} itens</small>
                    </div>
                `;
            } else {
                html += `<p class="text-muted">Nenhum item cadastrado nesta cesta.</p>`;
            }

            // Adiciona botões de ação para administradores
            if (!isConvidado) {
                html += `
                    <hr>
                    <div class="d-flex gap-2 justify-content-end">
                        <button class="btn btn-sm btn-warning" onclick="editCesta(${id_cesta})">
                            <i class="bi bi-pencil"></i> Editar Cesta
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCesta(${id_cesta})">
                            <i class="bi bi-trash"></i> Excluir Cesta
                        </button>
                    </div>
                `;
            }

            $('#modalBody').html(html);
            $('#genericModal').modal('show');
        },
        error: function(jqXHR) {
            showError('Erro ao carregar detalhes da cesta: ' + 
                     (jqXHR.responseJSON?.erro || ''));
        },
        complete: function() {
            hideLoading();
        }
    });
}