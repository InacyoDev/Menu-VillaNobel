const $ = (id) => document.getElementById(id);

const CATEGORIAS = ['Todos', 'Entradas', 'Petiscos', 'Pratos', 'Drinks', 'Sobremesas'];

const STATUS_CHAMADO = {
    aberto: { texto: 'Aberto', classe: 'text-bg-warning' },
    em_atendimento: { texto: 'Em atendimento', classe: 'text-bg-info' },
    atendido: { texto: 'Atendido', classe: 'text-bg-success' },
};

const ACOES_CHAMADO = {
    aberto: { texto: 'Atender', proximo: 'em_atendimento' },
    em_atendimento: { texto: 'Marcar como atendido', proximo: 'atendido' },
};

const COLUNAS = [
    { status: ['pendente', 'preparando', 'pronto'], coluna: 'coluna-pendente', contador: 'contador-pendente' },
    { status: ['entregue'], coluna: 'coluna-entregue', contador: 'contador-entregue' },
];

const STATUS_PEDIDO = {
    pendente: { texto: 'Pendente', classe: 'text-bg-secondary' },
    preparando: { texto: 'Preparando', classe: 'text-bg-warning' },
    pronto: { texto: 'Pronto', classe: 'text-bg-success' },
    entregue: { texto: 'Entregue', classe: 'text-bg-dark' },
};

const ACOES_PEDIDO = {
    pendente: { texto: 'Iniciar preparo', proximo: 'preparando' },
    preparando: { texto: 'Marcar como pronto', proximo: 'pronto' },
    pronto: { texto: 'Marcar como entregue', proximo: 'entregue' },
};

let filtroChamado = 'aberto';
let categoriaPedido = 'Todos';
let comanda = [];

const usuario = Auth.usuarioLogado();

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tempoDesde(dataIso) {
    const minutos = Math.floor((Date.now() - new Date(dataIso).getTime()) / 60000);
    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return 'há ' + minutos + ' min';
    return 'há ' + Math.floor(minutos / 60) + ' h';
}

function nomeDoUsuario(id) {
    const pessoa = Banco.buscarPorId('usuarios', id);
    return pessoa ? pessoa.nome : '';
}

function mostrarErroPedido(texto) {
    const caixa = $('pedido-erro');
    caixa.textContent = texto;
    caixa.classList.remove('d-none');
}

function esconderErroPedido() {
    const caixa = $('pedido-erro');
    caixa.textContent = '';
    caixa.classList.add('d-none');
}

function ligarFiltro(seletor, atributo, aoMudar) {
    const botoes = document.querySelectorAll(seletor + ' .js-filtro');

    botoes.forEach((botao) => {
        botao.addEventListener('click', () => {
            botoes.forEach((b) => b.classList.remove('active'));
            botao.classList.add('active');
            aoMudar(botao.dataset[atributo]);
        });
    });
}

function mostrarChamados() {
    const todos = Banco.ler('chamados');

    $('badge-chamados').textContent = todos.filter((c) => c.status === 'aberto').length;

    const lista = todos.filter((c) => c.status === filtroChamado);
    const caixa = $('lista-chamados');
    const molde = $('tpl-chamado');
    caixa.innerHTML = '';

    for (const chamado of lista) {
        const card = molde.content.cloneNode(true);
        const info = STATUS_CHAMADO[chamado.status];

        card.querySelector('.js-mesa').textContent = chamado.mesa;
        card.querySelector('.js-motivo').textContent = chamado.motivo;

        let tempo = tempoDesde(chamado.criado_em);
        if (chamado.atendido_por) tempo += ' · ' + nomeDoUsuario(chamado.atendido_por);
        card.querySelector('.js-tempo').textContent = tempo;

        const selo = card.querySelector('.js-status');
        selo.textContent = info.texto;
        selo.classList.add(info.classe);

        const botao = card.querySelector('.js-acao');
        const acao = ACOES_CHAMADO[chamado.status];
        if (acao) {
            botao.textContent = acao.texto;
            botao.addEventListener('click', () => avancarChamado(chamado.id, acao.proximo));
        } else {
            botao.remove();
        }

        caixa.appendChild(card);
    }

    $('chamados-vazio').classList.toggle('d-none', lista.length > 0);
}

function avancarChamado(id, proximo) {
    const dados = { status: proximo };
    if (proximo === 'em_atendimento') dados.atendido_por = usuario.id;

    Banco.atualizar('chamados', id, dados);
    mostrarChamados();
}

function mostrarFiltrosPedido() {
    const caixa = $('pedido-filtro-categorias');
    caixa.innerHTML = '';

    for (const nome of CATEGORIAS) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = nome;
        botao.className = 'btn btn-sm btn-outline-dark rounded-pill js-filtro';
        if (nome === categoriaPedido) botao.classList.add('active');

        botao.addEventListener('click', () => {
            categoriaPedido = nome;
            mostrarFiltrosPedido();
            mostrarItensPedido();
        });

        caixa.appendChild(botao);
    }
}

function mostrarItensPedido() {
    let itens = Banco.ler('itens_cardapio').filter((item) => item.disponivel);

    if (categoriaPedido !== 'Todos') {
        itens = itens.filter((item) => item.categoria === categoriaPedido);
    }

    const caixa = $('pedido-lista-itens');
    const molde = $('tpl-item-pedido');
    caixa.innerHTML = '';

    for (const item of itens) {
        const card = molde.content.cloneNode(true);

        card.querySelector('.js-nome').textContent = item.nome;
        card.querySelector('.js-categoria').textContent = item.categoria;
        card.querySelector('.js-preco').textContent = formatarPreco(item.preco);
        card.querySelector('.js-adicionar').addEventListener('click', () => adicionarItem(item));

        caixa.appendChild(card);
    }
}

function adicionarItem(item) {
    const linha = comanda.find((l) => l.item_id === item.id);

    if (linha) {
        linha.quantidade += 1;
    } else {
        comanda.push({ item_id: item.id, nome: item.nome, preco: item.preco, quantidade: 1 });
    }

    mostrarComanda();
}

function removerItem(itemId) {
    const linha = comanda.find((l) => l.item_id === itemId);
    linha.quantidade -= 1;

    if (linha.quantidade === 0) {
        comanda = comanda.filter((l) => l.item_id !== itemId);
    }

    mostrarComanda();
}

function mostrarComanda() {
    const caixa = $('pedido-linhas');
    const molde = $('tpl-linha-pedido');
    let total = 0;

    caixa.innerHTML = '';

    for (const linha of comanda) {
        const subtotal = linha.preco * linha.quantidade;
        total += subtotal;

        const elemento = molde.content.cloneNode(true);
        elemento.querySelector('.js-qtd').textContent = linha.quantidade;
        elemento.querySelector('.js-nome').textContent = linha.nome;
        elemento.querySelector('.js-subtotal').textContent = formatarPreco(subtotal);
        elemento.querySelector('.js-remover').addEventListener('click', () => removerItem(linha.item_id));

        caixa.appendChild(elemento);
    }

    $('pedido-total').textContent = formatarPreco(total);
    $('pedido-vazio').classList.toggle('d-none', comanda.length > 0);
}

function enviarPedido(evento) {
    evento.preventDefault();
    esconderErroPedido();

    const mesa = parseInt($('pedido-mesa').value, 10);

    if (isNaN(mesa) || mesa < 1) {
        mostrarErroPedido('Informe o número da mesa.');
        return;
    }
    if (comanda.length === 0) {
        mostrarErroPedido('Adicione pelo menos um item.');
        return;
    }

    const destino = document.querySelector('input[name="destino"]:checked').value;

    const pedido = Banco.inserir('pedidos', {
        mesa: mesa,
        destino: destino,
        status: 'pendente',
        observacao: $('pedido-obs').value.trim(),
        atendente_id: usuario.id,
    });

    for (const linha of comanda) {
        Banco.inserir('pedido_itens', {
            pedido_id: pedido.id,
            item_id: linha.item_id,
            quantidade: linha.quantidade,
            preco_unitario: linha.preco,
        });
    }

    comanda = [];
    $('form-pedido').reset();
    mostrarComanda();
    mostrarFila();
    bootstrap.Tab.getOrCreateInstance($('tab-fila')).show();
}

function textoDosItens(pedidoId) {
    const itens = Banco.ler('pedido_itens').filter((i) => i.pedido_id === pedidoId);

    return itens
        .map((i) => {
            const produto = Banco.buscarPorId('itens_cardapio', i.item_id);
            return i.quantidade + '× ' + (produto ? produto.nome : 'item removido');
        })
        .join(', ');
}

function mostrarFila() {
    const todos = Banco.ler('pedidos');
    const naFila = todos.filter((p) => p.status !== 'entregue');

    $('badge-fila').textContent = naFila.length;

    const molde = $('tpl-pedido-fila');

    for (const coluna of COLUNAS) {
        const caixa = $(coluna.coluna);
        const doStatus = todos.filter((p) => coluna.status.includes(p.status));
        const finalizados = coluna.status.includes('entregue');

        if (finalizados) {
            doStatus.sort((a, b) => new Date(b.entregue_em || b.criado_em) - new Date(a.entregue_em || a.criado_em));
        } else {
            doStatus.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
        }
        caixa.innerHTML = '';

        for (const pedido of doStatus) {
            const card = molde.content.cloneNode(true);

            card.querySelector('.js-mesa').textContent = pedido.mesa;
            card.querySelector('.js-itens').textContent = textoDosItens(pedido.id);
            card.querySelector('.js-obs').textContent = pedido.observacao ? 'Obs.: ' + pedido.observacao : '';

            const selo = card.querySelector('.js-destino');
            selo.textContent = pedido.destino;
            selo.classList.add(pedido.destino === 'Cozinha' ? 'text-bg-warning' : 'text-bg-success');

            const info = STATUS_PEDIDO[pedido.status];
            const seloStatus = card.querySelector('.js-status-pedido');
            seloStatus.textContent = info.texto;
            seloStatus.classList.add(info.classe);

            const botao = card.querySelector('.js-acao');
            if (finalizados) {
                card.querySelector('.js-tempo').textContent = 'Entregue ' + tempoDesde(pedido.entregue_em || pedido.criado_em);
                botao.remove();
            } else {
                card.querySelector('.js-tempo').textContent = tempoDesde(pedido.criado_em);
                const acao = ACOES_PEDIDO[pedido.status];
                botao.textContent = acao.texto;
                botao.addEventListener('click', () => avancarPedido(pedido.id, acao.proximo));
            }

            caixa.appendChild(card);
        }

        $(coluna.contador).textContent = doStatus.length;
    }
}

function avancarPedido(id, proximo) {
    const dados = { status: proximo };
    if (proximo === 'entregue') dados.entregue_em = new Date().toISOString();
    Banco.atualizar('pedidos', id, dados);
    mostrarFila();
}

function atualizarTudo() {
    mostrarChamados();
    mostrarFila();
    mostrarItensPedido();
}

function iniciar() {
    if (!usuario) return;

    document.querySelectorAll('.js-nome-usuario').forEach((el) => {
        el.textContent = usuario.nome;
    });
    $('btn-sair').addEventListener('click', () => Auth.sair());

    ligarFiltro('#filtro-chamados', 'status', (valor) => {
        filtroChamado = valor;
        mostrarChamados();
    });

    $('form-pedido').addEventListener('submit', enviarPedido);

    mostrarFiltrosPedido();
    mostrarComanda();
    atualizarTudo();

    window.addEventListener('storage', atualizarTudo);

    setInterval(() => {
        mostrarChamados();
        mostrarFila();
    }, 30000);
}

iniciar();
