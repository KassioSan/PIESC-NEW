from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import json
from datetime import datetime
from datetime import timedelta
from flask_cors import CORS
from functools import wraps
from flask import Flask, session, redirect, url_for

app = Flask(__name__)
CORS(app)

# Configurações JWT
app.config['JWT_SECRET_KEY'] = 'Jubileuaoquadrado'  
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
jwt = JWTManager(app)

DATABASE = 'doacoes.db'

#   Função de conectar ao banco

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Tabela de usuários 
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Usuario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            nome_completo TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'user',
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Usuário admin padrão 
    cursor.execute('SELECT 1 FROM Usuario WHERE username = ?', ('admin',))
    if not cursor.fetchone():
        password_hash = generate_password_hash('admin123')
        cursor.execute(
            'INSERT INTO Usuario (username, password_hash, nome_completo, email, role) VALUES (?, ?, ?, ?, ?)',
            ('admin', password_hash, 'Administrador', 'admin@piesc.com', 'admin')
        )
    
    conn.commit()
    conn.close()

# Verifica permissoes
def readonly_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_json = get_jwt_identity()
        
        # CORREÇÃO: Decodifica a string JSON
        try:
            current_user = json.loads(current_user_json)
        except:
            return jsonify({'erro': 'Token inválido'}), 401
        
        # Agora verifica normalmente
        if current_user.get('readonly'):
            return jsonify({
                'erro': 'Acesso somente leitura. Faça login completo para realizar esta ação.'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function

# Rota de Sessão temporário (convidado)

@app.route('/guest')
def guest_access():
    session['user'] = 'guest'
    session['role'] = 'convidado'
    return redirect(url_for('home'))

# Controle de permissão

@app.route('/guest/doacoes', methods=['GET'])
def listar_doacoes_guest():
    conn = get_db_connection()
    doacoes = conn.execute('SELECT * FROM Doacao').fetchall()
    conn.close()
    return jsonify([dict(d) for d in doacoes])


# Rota de Login
@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'erro': 'Username e senha são obrigatórios'}), 400
        
        conn = get_db_connection()
        usuario = conn.execute(
            'SELECT * FROM Usuario WHERE username = ?', 
            (data['username'],)
        ).fetchone()
        conn.close()
        
        if not usuario or not check_password_hash(usuario['password_hash'], data['password']):
            return jsonify({'erro': 'Credenciais inválidas'}), 401
        
        # CORREÇÃO: Identity deve ser string
        identity_data = {
            'id': usuario['id'],
            'username': usuario['username'],
            'role': usuario['role']
        }
        
        access_token = create_access_token(
            identity=json.dumps(identity_data)  # ← AGORA É UMA STRING
        )
        
        return jsonify({
            'mensagem': 'Login realizado com sucesso!',
            'access_token': access_token,
            'usuario': {
                'id': usuario['id'],
                'username': usuario['username'],
                'nome_completo': usuario['nome_completo'],
                'email': usuario['email'],
                'role': usuario['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

# Rota de Registro (opcional)
@app.route('/auth/register', methods=['POST'])
@jwt_required()
def register():
    try:
        data = request.get_json()
        
        campos_obrigatorios = ['username', 'password', 'nome_completo', 'email']
        if not all(campo in data for campo in campos_obrigatorios):
            return jsonify({'erro': 'Todos os campos são obrigatórios'}), 400
        
        if len(data['password']) < 6:
            return jsonify({'erro': 'Senha deve ter pelo menos 6 caracteres'}), 400
        
        conn = get_db_connection()
        
        # Verifica se username ou email já existem
        existente = conn.execute(
            'SELECT 1 FROM Usuario WHERE username = ? OR email = ?',
            (data['username'], data['email'])
        ).fetchone()
        
        if existente:
            conn.close()
            return jsonify({'erro': 'Username ou email já cadastrados'}), 400
        
        # Cria hash da senha
        password_hash = generate_password_hash(data['password'])
        
        conn.execute(
            'INSERT INTO Usuario (username, password_hash, nome_completo, email) VALUES (?, ?, ?, ?)',
            (data['username'], password_hash, data['nome_completo'], data['email'])
        )
        conn.commit()
        conn.close()
        
        return jsonify({'mensagem': 'Usuário criado com sucesso!'}), 201
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

# Rota protegida de exemplo
@app.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_json = get_jwt_identity()
        
        # CORREÇÃO: Decodifica a string JSON
        current_user = json.loads(current_user_json)
        
        return jsonify({'usuario': current_user}), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

# Rota de Login Convidado (Só leitura)
@app.route('/auth/login/convidado', methods=['POST'])
def login_convidado():
    try:
        
        identity_data = {
            'id': 0,
            'username': 'convidado',
            'role': 'convidado',
            'readonly': True
        }
        
        # Convertemos o dicionário para string JSON
        access_token = create_access_token(
            identity=json.dumps(identity_data)  # ← AGORA É UMA STRING
        )
        
        return jsonify({
            'mensagem': 'Modo convidado ativado',
            'access_token': access_token,
            'usuario': {
                'id': 0,
                'username': 'convidado',
                'nome_completo': 'Usuário Convidado',
                'email': 'convidado@piesc.com',
                'role': 'convidado'
            }
        }), 200
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

#   Rota principal

@app.route('/')
def home():
    return 'API de Doações - PIESC'

#   Rota: listar doadores

@app.route('/doadores', methods=['GET'])
@jwt_required()
def listar_doadores():
    conn = get_db_connection()
    doadores = conn.execute('SELECT * FROM Doador').fetchall()
    conn.close()
    return jsonify([dict(d) for d in doadores])

#   Rota: adicionar doador

@app.route('/doadores', methods=['POST'])
@jwt_required()
@readonly_required
def adicionar_doador():
    try:
        data = request.get_json()
        
        if not data or 'nome' not in data or 'contato' not in data:
            return jsonify({'erro' : 'Nome e contato são obrigatórios'}), 400

        conn = get_db_connection()
        conn.execute(
            'INSERT INTO Doador (nome, contato) VALUES (?, ?)',
            (data['nome'], data['contato'])
        )
        conn.commit()
        return jsonify({'mensagem' : 'Doador adicionado com sucesso!'}), 201
    
    except Exception as e:
        return jsonify({'erro' : str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
    
# Rota para Doador

@app.route('/doacoes', methods=['GET'])
@jwt_required()
def listar_doacoes():
    conn = get_db_connection()
    doacoes = conn.execute('SELECT * FROM Doacao').fetchall()
    conn.close()
    return jsonify([dict(d) for d in doacoes])

@app.route('/doacoes', methods=['POST'])
@jwt_required()
@readonly_required
def adicionar_doacao():
    try:
        data = request.get_json()
        print("Dados recebidos:", data)  # Log dos dados de entrada
         
        # Validações obrigatórias
        
        if not data or 'id_doador' not in data:
            return jsonify({'erro': 'id_doador é obrigatório!'}), 400
        
        # Validação do tipo do id_doador
        
        try:
            id_doador = int(data['id_doador'])
        except (TypeError, ValueError):
            return jsonify({'erro': 'id_doador deve ser um número inteiro'}), 400
        
        # Verifica se o doador existe
        
        conn = get_db_connection()
        cursor = conn.execute('SELECT id_doador, nome FROM Doador WHERE id_doador = ?', (id_doador,))
        doador = cursor.fetchone()
        print('Doador encontrado:', doador) # Log do resultado da query
        
        if not doador:
            return jsonify({'erro': f'Doador com o id {id_doador} não encontrado'}), 404

        # Validação da data (se enviada)
        
        if 'data_doacao' in data:
            try:
                datetime.strptime(data_doacao, '%Y-%m-%d')
            except ValueError:
                return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
        
        # Define a data padrão se não fornecida
        data_doacao = data.get('data_doacao', datetime.now().strftime('%Y-%m-%d'))
        observacoes = data.get('observacoes','') 
        
        # Insere a doação
        conn.execute(
            'INSERT INTO Doacao (id_doador, data_doacao, observacoes) VALUES (?, ?, ?)',
            (id_doador, data_doacao, observacoes)
        )
        nova_doacao_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.commit()
        
        return jsonify({
            'mensagem': 'Doação realizada com sucesso!',
            'id_doacao': nova_doacao_id
        }), 201
    
    except Exception as e:
        print(f"Erro no servidor: {e}")
        return jsonify({'erro': 'Falha ao processar a doação'}), 500
    finally:
        if conn:
            conn.close()
            
# Rota para Item de Doação

@app.route('/itens', methods=['POST'])
@jwt_required()
@readonly_required
def adicionar_item():
    try:
        data = request.get_json()
    
        campos_obrigatorios = ['id_doacao', 'nome_item', 'quantidade', 'unidade_medida']
        
        if not all (campo in data for campo in campos_obrigatorios):
            return jsonify({'erro' : 'Todos os campos são obrigatórios'}), 400
        
        # Validação de tipos 
        
        try:
            quantidade = float(data['quantidade'])
            if quantidade <= 0:
                return jsonify({'erro': 'Quantidade deve ser maior que zero!'}), 400
        except (ValueError, TypeError):
            return jsonify({'erro': 'Quantidade deve ser um número válido'}), 400
        
        # Valida se a doação existe
        conn = get_db_connection()
        doacao = conn.execute('SELECT 1 FROM Doacao WHERE id_doacao = ?', (data['id_doacao'],)).fetchone()
        
        if not doacao:
            conn.close()
            return jsonify({'erro': 'Doação não encontrada!'}), 404
        
        conn.execute(
            'INSERT INTO ItemDoado (id_doacao, nome_item, quantidade, unidade_medida) VALUES (?, ?, ?, ?)',
            (data['id_doacao'], data['nome_item'], quantidade, data['unidade_medida'])
        )
        conn.commit()
        return jsonify({'mensagem' : 'Item adicionado a Doação!'}), 201
    
    except Exception as e:
        return jsonify({'erro' : str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
    
@app.route('/itens/<int:id_doacao>', methods=['GET'])
def listar_itens_por_doacao(id_doacao):
    conn = get_db_connection()
    itens = conn.execute(
        'SELECT * FROM ItemDoado WHERE id_doacao = ?',
        (id_doacao,)
    ).fetchall()
    conn.close()
    
    if not itens:
        return jsonify({'mensagem' : 'Nenhum item encontrado para esta doação'}), 404
    
    return jsonify([dict(i) for i in itens])

# Rota para criar cesta

@app.route('/cestas', methods = ['POST'])
@jwt_required()
@readonly_required
def criar_cesta():
    try:
        data = request.get_json()
        
        # Validação dos campos obrigatórios
        
        if not data or 'destinatario' not in data:
            return jsonify({'erro': 'Destinatário é obrigatório'}), 400
        
        # Define a data atual se não fornecida
        
        data_montagem = data.get('data_montagem', datetime.now().strftime('%Y-%m-%d'))
        
        conn = get_db_connection()
        conn.execute('INSERT INTO CestaBasica (data_montagem, destinatario, observacoes) VALUES (?, ?, ?)',
        (data_montagem, data['destinatario'], data.get('observacoes', '')))   

        nova_cesta_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        conn.commit()
        
        return jsonify({
            'mensagem': 'Cesta básica criada',
            'id_cesta': nova_cesta_id
        }), 201
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    
    finally:
        if 'conn' in locals():
            conn.close()
            
# Rota para listar todas as cestas

@app.route('/cestas', methods = ['GET'])
@jwt_required()
def listar_cestas():
    conn = get_db_connection()
    cestas = conn.execute('SELECT * FROM CestaBasica').fetchall()
    conn.close()
    return jsonify([dict(c) for c in cestas])

# Rota para adicionar item à cesta

@app.route('/cestas/<int:id_cesta>/itens', methods=['POST'])
@jwt_required()
@readonly_required
def adicionar_item_cesta(id_cesta):
    try:
        data = request.get_json()
        
        campos_obrigatorios = ['nome_item', 'quantidade', 'unidade_medida']
        if not all (campo in data for campo in campos_obrigatorios):
            return jsonify({'erro': 'Todos os campos são obrigatórios'}), 400
        
        # Valida se a cesta existe
        
        conn = get_db_connection()
        cesta = conn.execute('SELECT 1 FROM CestaBasica WHERE id_cesta = ?', 
                             (id_cesta, )).fetchone()
        if not cesta:
            return jsonify({'erro': 'Cesta não encontrada'}), 404
        
        # Validação de quantidade
        try:
            quantidade = float(data['quantidade'])
            if quantidade <= 0:
                return jsonify({'erro':'Quantidade deve ser positiva'}), 400
        except ValueError:
            return jsonify({'erro': 'Quantidade inválida'}), 400
        
        conn.execute(
            'INSERT INTO ItemNaCesta (id_cesta, nome_item, quantidade, unidade_medida VALUES (?, ?, ?, ?)',
            (id_cesta, data['nome_item'], quantidade, data['unidade_medida'])
        )
        
        conn.commit()
        return jsonify({'mensagem': 'Item adicionado à cesta!'}), 201
    
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
            
# Rota para listar itens de uma cesta específica

@app.route('/cestas/<int:id_cesta>/itens', methods=['GET'])
def listar_itens_cesta(id_cesta):
    conn = get_db_connection()
    
    # Verifica se a cesta existe
    
    cesta = conn.execute('SELECT 1 FROM CestaBasica WHERE id_cesta = ?', (id_cesta,)).fetchone()
    
    if not cesta:
        conn.close()
        return jsonify({'erro': 'Cesta não encontrada'}), 404
    
    itens = conn.execute(
        'SELECT * FROM ItemNaCesta WHERE id_cesta = ?', 
        (id_cesta, )
    ).fetchall()
    conn.close()
    
    return jsonify([dict(i) for i in itens])

# Rota para detalhes de uma cesta especifica e seus itens

@app.route('/cestas/<int:id_cesta>', methods=['GET'])
def detalhes_cesta(id_cesta):
    conn = get_db_connection()
    
    cesta = conn.execute(
        'SELECT * FROM CestaBasica WHERE id_cesta = ?',
        (id_cesta, )
    ).fetchone()
    
    if not cesta:
        conn.close()
        return jsonify({'erro': 'Cesta não encontrada'}), 404
    
    itens = conn.execute(
        'SELECT nome_item, quantidade, unidade_medida FROM ItemNaCesta WHERE id_cesta = ?',
        (id_cesta, )
    ).fetchall()
    
    conn.close()
    
    response = dict(cesta)
    response['itens'] = [dict(i) for i in itens]
    
    return jsonify(response)

# Rota para atualizar cesta existente

@app.route('/cestas/<int:id_cesta>', methods = ['PUT'])
@jwt_required()
@readonly_required
def atualizar_cesta(id_cesta):
    try:
        data = request.get_json()
        conn = get_db_connection()
        
        # Verifica se a cesta existe
        
        cesta = conn.execute('SELECT 1 FROM CestaBasica WHERE id_cesta = ?', (id_cesta, )).fetchone()
        
        if not cesta:
            return jsonify({'erro': 'Cesta não encontrada'}), 404
        
        # Contrói a query dinamicamente
        
        campos = []
        valores = []
        for campo in ['destinatario', 'observacoes']:
            if campo in data:
                campos.append(f"{campo} = ?")
                valores.append(data[campo])
                
        if not campos:
            return jsonify({'erro': 'Nenhum campo válido para atualização'}), 400
        
        valores.append(id_cesta)
        query = f"UPDATE CestaBasica SET {', '.join(campos)} WHERE id_cesta = ?"
        
        conn.execute(query, valores)
        conn.commit()
        return jsonify({'mensagem': 'Cesta atualizada com sucesso!'}), 200
    
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
            
# Rota para remover cesta

@app.route('/cestas/<int:id_cesta>', methods = ['DELETE'])
@jwt_required()
@readonly_required
def remover_cesta(id_cesta):
    try:
        conn = get_db_connection()
        
        # Verifica existencia
        
        cesta = conn.execute('SELECT 1 FROM CestaBasica WHERE id_cesta = ?', (id_cesta,)).fetchone()
        
        if not cesta:
            return jsonify({'erro': 'Cesta não encontrada'}), 404
        
        # Remove primeiro os itens associados
        
        conn.execute('DELETE FROM ItemNaCesta WHERE id_cesta = ?', (id_cesta,))
        
        # Depois remove a cesta
        
        conn.execute('DELETE FROM CestaBasica WHERE id_cesta = ?', (id_cesta,))
        
        conn.commit()
        conn.close()
         
        return jsonify({'mensagem': 'Cesta e itens removidos com sucesso'}), 200
    
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'erro': str(e)}), 500
 
# Rota para atualizar item na cesta
            
@app.route('/cestas/<int:id_cesta>/itens/<int:id_item>', methods=['PUT'])
@jwt_required()
@readonly_required
def atualizar_item_cesta(id_cesta, id_item):
    try:
        data = request.get_json()
        conn = get_db_connection()
        
        # Verifica existências
        item = conn.execute('''
            SELECT 1 FROM ItemNaCesta 
            WHERE id_item_cesta = ? AND id_cesta = ?
        ''', (id_item, id_cesta)).fetchone()
        
        if not item:
            return jsonify({'erro': 'Item não encontrado nesta cesta'}), 404
        
        # Validações e construção da query
        campos = []
        valores = []
        
        if 'quantidade' in data:
            try:
                quantidade = float(data['quantidade'])
                if quantidade <= 0:
                    return jsonify({'erro': 'Quantidade deve ser positiva'}), 400
                campos.append("quantidade = ?")
                valores.append(quantidade)
            except ValueError:
                return jsonify({'erro': 'Quantidade inválida'}), 400
        
        if 'unidade_medida' in data:
            campos.append("unidade_medida = ?")
            valores.append(data['unidade_medida'])
        
        if 'nome_item' in data:
            campos.append("nome_item = ?")
            valores.append(data['nome_item'])
        
        if not campos:
            return jsonify({'erro': 'Nenhum campo válido para atualização'}), 400
        
        valores.extend([id_item, id_cesta])
        query = f'''
            UPDATE ItemNaCesta 
            SET {', '.join(campos)} 
            WHERE id_item_cesta = ? AND id_cesta = ?
        '''
        
        conn.execute(query, valores)
        conn.commit()
        return jsonify({'mensagem': 'Item atualizado com sucesso!'}), 200
    
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# Rota para remover item da cesta
         
@app.route('/cestas/<int:id_cesta>/itens/<int:id_item>', methods=['DELETE'])
@jwt_required()
@readonly_required
def remover_item_cesta(id_cesta, id_item):
    try:
        conn = get_db_connection()
        
        # Verifica existência
        item = conn.execute('''
            SELECT 1 FROM ItemNaCesta 
            WHERE id_item_cesta = ? AND id_cesta = ?
        ''', (id_item, id_cesta)).fetchone()
        
        if not item:
            return jsonify({'erro': 'Item não encontrado nesta cesta'}), 404
        
        conn.execute('''
            DELETE FROM ItemNaCesta 
            WHERE id_item_cesta = ? AND id_cesta = ?
        ''', (id_item, id_cesta))
        
        conn.commit()
        return jsonify({'mensagem': 'Item removido da cesta!'}), 200
    
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
            
@app.route('/doadores/<int:id>', methods=['DELETE'])
@jwt_required()
@readonly_required
def deletar_doador(id):
    try:
        conn = get_db_connection()
        
        # Verifica se o doador existe
        doador = conn.execute('SELECT 1 FROM Doador WHERE id_doador = ?', (id,)).fetchone()
        if not doador:
            return jsonify({'erro': 'Doador não encontrado'}), 404
        
        # Deleta o doador
        conn.execute('DELETE FROM Doador WHERE id_doador = ?', (id,))
        conn.commit()
        
        return jsonify({'mensagem': 'Doador deletado com sucesso!'}), 200
    
    except sqlite3.IntegrityError:
        return jsonify({'erro': 'Não é possível deletar doador com doações associadas'}), 400
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
            
@app.route('/doadores/<int:id>', methods=['GET'])
def obter_doador(id):
    try:
        conn = get_db_connection()
        doador = conn.execute('SELECT * FROM Doador WHERE id_doador = ?', (id,)).fetchone()
        conn.close()
        
        if not doador:
            return jsonify({'erro': 'Doador não encontrado'}), 404
        
        return jsonify(dict(doador)), 200
    
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    
@app.route('/doadores/<int:id>', methods=['PUT'])
@jwt_required()
@readonly_required
def atualizar_doador(id):
    try:
        data = request.get_json()
        
        # Validação dos dados
        if not data:
            return jsonify({'erro': 'Dados não fornecidos'}), 400
        
        if 'nome' not in data or 'contato' not in data:
            return jsonify({'erro': 'Nome e contato são obrigatórios'}), 400

        conn = get_db_connection()
        
        # Verifica se o doador existe
        doador = conn.execute('SELECT 1 FROM Doador WHERE id_doador = ?', (id,)).fetchone()
        if not doador:
            return jsonify({'erro': 'Doador não encontrado'}), 404
        
        # Atualiza o doador
        conn.execute(
            'UPDATE Doador SET nome = ?, contato = ? WHERE id_doador = ?',
            (data['nome'], data['contato'], id)
        )
        conn.commit()
        
        return jsonify({'mensagem': 'Doador atualizado com sucesso!'}), 200
    
    except Exception as e:
        return jsonify({'erro': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()
        
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
    app.run(debug=True)
