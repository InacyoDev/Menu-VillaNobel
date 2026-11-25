const $ = (id) => document.getElementById(id);

let filtroPerfil = 'todos';

const NOMES_PERFIL = { admin: 'Administrador', atendente: 'Atendente', cliente: 'Cliente' };

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarErro(idCaixa, mensagem) {
    const caixa = $(idCaixa);
    caixa.textContent = mensagem;
    caixa.classList.remove('d-none');
}

function limparErro(idCaixa) {
    const caixa = $(idCaixa);
    caixa.textContent = '';
    caixa.classList.add('d-none');
}

function atualizarVisaoGeral() {
    const chamadosAbertos = Banco.ler('chamados').filter((c) => c.status === 'aberto');
    const pedidosNaFila = Banco.ler('pedidos').filter((p) => p.status !== 'entregue');
    const atendentesAtivos = Banco.ler('usuarios').filter((u) => u.perfil === 'atendente' && u.ativo);

    $('resumo-chamados').textContent = chamadosAbertos.length;
    $('resumo-pedidos').textContent = pedidosNaFila.length;
    $('resumo-itens').textContent = Banco.ler('itens_cardapio').length;
    $('resumo-atendentes').textContent = atendentesAtivos.length;
}

function mostrarCardapio() {
    const itens = Banco.ler('itens_cardapio');
    const corpo = $('corpo-cardapio');
    const molde = $('tpl-linha-item');

    corpo.innerHTML = '';

    for (const item of itens) {
        const linha = molde.content.cloneNode(true);

        linha.querySelector('.js-nome').textContent = item.nome;
        linha.querySelector('.js-categoria').textContent = item.categoria;
        linha.querySelector('.js-preco').textContent = formatarPreco(item.preco);

        const status = linha.querySelector('.js-status');
        status.textContent = item.disponivel ? 'Disponível' : 'Indisponível';
        status.classList.add(item.disponivel ? 'text-bg-success' : 'text-bg-secondary');

        linha.querySelector('.js-editar').addEventListener('click', () => editarItem(item.id));
        linha.querySelector('.js-excluir').addEventListener('click', () => excluirItem(item.id));

        corpo.appendChild(linha);
    }

    $('cardapio-vazio').classList.toggle('d-none', itens.length > 0);
}

function limparFormItem() {
    $('form-item').reset();
    $('item-id').value = '';
    $('item-disponivel').checked = true;
    $('titulo-form-item').textContent = 'Novo item';
    limparErro('item-erro');
}

function editarItem(id) {
    const item = Banco.buscarPorId('itens_cardapio', id);

    $('item-id').value = item.id;
    $('item-nome').value = item.nome;
    $('item-categoria').value = item.categoria;
    $('item-preco').value = item.preco;
    $('item-descricao').value = item.descricao || '';
    $('item-imagem').value = item.imagem || '';
    $('item-disponivel').checked = item.disponivel;
    $('titulo-form-item').textContent = 'Editar item';
    limparErro('item-erro');
    $('item-nome').focus();
}

function salvarItem(evento) {
    evento.preventDefault();
    limparErro('item-erro');

    const nome = $('item-nome').value.trim();
    const preco = parseFloat($('item-preco').value);

    if (nome === '') {
        mostrarErro('item-erro', 'Informe o nome do item.');
        return;
    }
    if (isNaN(preco) || preco < 0) {
        mostrarErro('item-erro', 'Informe um preço válido.');
        return;
    }

    const dados = {
        nome: nome,
        categoria: $('item-categoria').value,
        preco: preco,
        descricao: $('item-descricao').value.trim(),
        imagem: $('item-imagem').value.trim(),
        disponivel: $('item-disponivel').checked,
    };

    const id = $('item-id').value;
    if (id === '') {
        Banco.inserir('itens_cardapio', dados);
    } else {
        Banco.atualizar('itens_cardapio', id, dados);
    }

    limparFormItem();
    mostrarCardapio();
    atualizarVisaoGeral();
}

function excluirItem(id) {
    if (!confirm('Excluir este item do cardápio?')) return;

    Banco.excluir('itens_cardapio', id);

    if ($('item-id').value === id) limparFormItem();

    mostrarCardapio();
    atualizarVisaoGeral();
}

function mostrarUsuarios() {
    let usuarios = Banco.ler('usuarios');

    if (filtroPerfil !== 'todos') {
        usuarios = usuarios.filter((u) => u.perfil === filtroPerfil);
    }

    const corpo = $('corpo-usuarios');
    const molde = $('tpl-linha-usuario');
    const eu = Auth.usuarioLogado();

    corpo.innerHTML = '';

    for (const usuario of usuarios) {
        const linha = molde.content.cloneNode(true);

        linha.querySelector('.js-nome').textContent = usuario.nome;
        linha.querySelector('.js-email').textContent = usuario.email;
        linha.querySelector('.js-perfil').textContent = NOMES_PERFIL[usuario.perfil];

        const status = linha.querySelector('.js-status');
        status.textContent = usuario.ativo ? 'Ativo' : 'Inativo';
        status.classList.add(usuario.ativo ? 'text-bg-success' : 'text-bg-secondary');

        const botaoEditar = linha.querySelector('.js-editar');
        const botaoAtivar = linha.querySelector('.js-ativar');

        if (usuario.perfil === 'cliente') {
            botaoEditar.remove();
        } else {
            botaoEditar.addEventListener('click', () => editarUsuario(usuario.id));
        }

        botaoAtivar.textContent = usuario.ativo ? 'Desativar' : 'Ativar';
        botaoAtivar.addEventListener('click', () => alternarAtivo(usuario.id));

        if (eu && usuario.id === eu.id) botaoAtivar.disabled = true;

        corpo.appendChild(linha);
    }

    $('usuarios-vazio').classList.toggle('d-none', usuarios.length > 0);
}

function limparFormUsuario() {
    $('form-usuario').reset();
    $('usuario-id').value = '';
    $('titulo-form-usuario').textContent = 'Novo usuário';
    $('btn-salvar-usuario').textContent = 'Criar conta';
    $('usuario-senha').placeholder = '';
    limparErro('usuario-erro');
}

function editarUsuario(id) {
    const usuario = Banco.buscarPorId('usuarios', id);

    $('usuario-id').value = usuario.id;
    $('usuario-nome').value = usuario.nome;
    $('usuario-email').value = usuario.email;
    $('usuario-senha').value = '';
    $('usuario-senha').placeholder = 'Deixe em branco para manter';
    $('usuario-perfil').value = usuario.perfil;
    $('titulo-form-usuario').textContent = 'Editar usuário';
    $('btn-salvar-usuario').textContent = 'Salvar';
    limparErro('usuario-erro');
    $('usuario-nome').focus();
}

function salvarUsuario(evento) {
    evento.preventDefault();
    limparErro('usuario-erro');

    const id = $('usuario-id').value;
    const nome = $('usuario-nome').value.trim();
    const email = $('usuario-email').value.trim().toLowerCase();
    const senha = $('usuario-senha').value;
    const perfil = $('usuario-perfil').value;

    if (nome === '') {
        mostrarErro('usuario-erro', 'Informe o nome.');
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        mostrarErro('usuario-erro', 'Informe um e-mail válido.');
        return;
    }

    const repetido = Banco.ler('usuarios').some((u) => u.email === email && u.id !== id);
    if (repetido) {
        mostrarErro('usuario-erro', 'Já existe um usuário com esse e-mail.');
        return;
    }

    if (id === '' && senha.length < 6) {
        mostrarErro('usuario-erro', 'A senha precisa ter pelo menos 6 caracteres.');
        return;
    }
    if (id !== '' && senha !== '' && senha.length < 6) {
        mostrarErro('usuario-erro', 'A nova senha precisa ter pelo menos 6 caracteres.');
        return;
    }

    const eu = Auth.usuarioLogado();
    if (id !== '' && eu && id === eu.id && perfil !== 'admin') {
        mostrarErro('usuario-erro', 'Você não pode mudar o seu próprio perfil.');
        return;
    }

    if (id === '') {
        Banco.inserir('usuarios', { nome, email, senha, perfil, ativo: true });
    } else {
        const dados = { nome, email, perfil };
        if (senha !== '') dados.senha = senha;
        Banco.atualizar('usuarios', id, dados);
    }

    limparFormUsuario();
    mostrarUsuarios();
    atualizarVisaoGeral();
}

function alternarAtivo(id) {
    const usuario = Banco.buscarPorId('usuarios', id);
    Banco.atualizar('usuarios', id, { ativo: !usuario.ativo });
    mostrarUsuarios();
    atualizarVisaoGeral();
}

function configurarFiltroUsuarios() {
    const botoes = document.querySelectorAll('#filtro-usuarios .js-filtro');

    botoes.forEach((botao) => {
        botao.addEventListener('click', () => {
            filtroPerfil = botao.dataset.perfil;
            botoes.forEach((b) => b.classList.remove('active'));
            botao.classList.add('active');
            mostrarUsuarios();
        });
    });
}

function iniciar() {
    const usuario = Auth.usuarioLogado();
    if (!usuario) return;

    document.querySelectorAll('.js-nome-usuario').forEach((el) => {
        el.textContent = usuario.nome;
    });
    $('btn-sair').addEventListener('click', () => Auth.sair());

    $('form-item').addEventListener('submit', salvarItem);
    $('btn-novo-item').addEventListener('click', limparFormItem);
    $('btn-cancelar-item').addEventListener('click', limparFormItem);

    $('form-usuario').addEventListener('submit', salvarUsuario);
    $('btn-novo-usuario').addEventListener('click', limparFormUsuario);
    $('btn-cancelar-usuario').addEventListener('click', limparFormUsuario);

    configurarFiltroUsuarios();

    atualizarVisaoGeral();
    mostrarCardapio();
    mostrarUsuarios();

    window.addEventListener('storage', atualizarVisaoGeral);
}

iniciar();
