const API_URL = 'http://localhost:5000';

$(document).ready(function() {
    // Verifica se já está logado
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }

    $('#loginForm').submit(function(e) {
        e.preventDefault();
        
        const formData = $(this).serializeArray().reduce((obj, item) => {
            obj[item.name] = item.value;
            return obj;
        }, {});

        $('.btn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Entrando...');

        $.ajax({
            url: `${API_URL}/auth/login`,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(formData),
            success: function(response) {
                // Salva token e dados do usuário
                localStorage.setItem('token', response.access_token);
                localStorage.setItem('usuario', JSON.stringify(response.usuario));
                
                // Redireciona para a página principal
                window.location.href = 'index.html';
            },
            error: function(jqXHR) {
                $('.btn').prop('disabled', false).html('<i class="bi bi-box-arrow-in-right"></i> Entrar');
                
                let errorMsg = 'Erro ao fazer login';
                if (jqXHR.responseJSON && jqXHR.responseJSON.erro) {
                    errorMsg = jqXHR.responseJSON.erro;
                }
                
                alert(errorMsg);
            }
        });
    });
});
function loginComoConvidado() {
    const btn = $('#guest-btn');
    btn.html('<span class="spinner-border spinner-border-sm"></span> Entrando...').prop('disabled', true);

    $.ajax({
        url: `${API_URL}/auth/login/convidado`,
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        success: function(response) {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('usuario', JSON.stringify(response.usuario));
            localStorage.setItem('modo_convidado', 'true');
            window.location.href = 'index.html';
        },
        error: function(jqXHR) {
            btn.html('<i class="bi bi-person-badge"></i> Acessar como Convidado').prop('disabled', false);
            alert('Erro ao entrar como convidado: ' + (jqXHR.responseJSON?.erro || ''));
        }
    });
}
