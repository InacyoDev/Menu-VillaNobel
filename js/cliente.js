const $ = (id) => document.getElementById(id);

const CATEGORIAS = ['Todos', 'Entradas', 'Petiscos', 'Pratos', 'Drinks', 'Sobremesas'];

const STATUS_CHAMADO = {
    aberto: { texto: 'Enviado', classe: 'text-bg-warning' },
    em_atendimento: { texto: 'Em atendimento', classe: 'text-bg-info' },
    atendido: { texto: 'Atendido', classe: 'text-bg-success' },
    cancelado: { texto: 'Cancelado', classe: 'text-bg-secondary' },
};
const ORDEM_STATUS = ['aberto', 'em_atendimento', 'atendido'];

let categoriaAtual = 'Todos';
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

function mostrarErro(texto) {
    const caixa = $('chamado-erro');
    caixa.textContent = texto;
    caixa.classList.remove('d-none');
}

function esconderErro() {
    const caixa = $('chamado-erro');
    caixa.textContent = '';
    caixa.classList.add('d-none');
}

function mostrarFiltros() {
    const caixa = $('filtro-categorias');
    caixa.innerHTML = '';

    for (const nome of CATEGORIAS) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = nome;
        botao.className = 'btn btn-sm btn-outline-dark rounded-pill js-filtro';
        if (nome === categoriaAtual) botao.classList.add('active');

        botao.addEventListener('click', () => {
            categoriaAtual = nome;
            mostrarFiltros();
            mostrarCardapio();
        });

        caixa.appendChild(botao);
    }
}

function mostrarCardapio() {
    let itens = Banco.ler('itens_cardapio').filter((item) => item.disponivel);

    if (categoriaAtual !== 'Todos') {
        itens = itens.filter((item) => item.categoria === categoriaAtual);
    }

    const lista = $('lista-cardapio');
    const molde = $('tpl-item-cardapio');
    lista.innerHTML = '';

    for (const item of itens) {
        const card = molde.content.cloneNode(true);

        card.querySelector('.js-nome').textContent = item.nome;
        card.querySelector('.js-preco').textContent = formatarPreco(item.preco);
        card.querySelector('.js-descricao').textContent = item.descricao;
        card.querySelector('.js-categoria').textContent = item.categoria;

        const foto = card.querySelector('.js-foto');
        if (item.imagem) {
            foto.src = item.imagem;
            foto.alt = item.nome;
            foto.onerror = () => foto.remove();
        } else {
            foto.remove();
        }

        lista.appendChild(card);
    }

    $('cardapio-vazio').classList.toggle('d-none', itens.length > 0);
}

function ultimoChamado() {
    const meus = Banco.ler('chamados').filter((c) => c.usuario_id === usuario.id);
    return meus[meus.length - 1] || null;
}

function mostrarUltimoChamado() {
    const chamado = ultimoChamado();
    const selo = $('status-chamado');
    const passos = document.querySelectorAll('#card-ultimo-chamado .js-passo');

    $('btn-cancelar-chamado').classList.toggle('d-none', !chamado || chamado.status !== 'aberto');

    if (!chamado) {
        selo.textContent = 'Nenhum';
        selo.className = 'badge cmd-status text-bg-secondary';
        $('resumo-chamado').textContent = 'Você ainda não fez nenhum chamado.';
        passos.forEach((passo) => {
            passo.classList.remove('cmd-passo-ativo', 'fw-bold');
        });
        return;
    }

    const info = STATUS_CHAMADO[chamado.status];
    selo.textContent = info.texto;
    selo.className = 'badge cmd-status ' + info.classe;

    $('resumo-chamado').textContent =
        'Mesa ' + chamado.mesa + ' · ' + chamado.motivo + ' · ' + tempoDesde(chamado.criado_em);

    const posicaoAtual = ORDEM_STATUS.indexOf(chamado.status);
    passos.forEach((passo) => {
        const ativo = ORDEM_STATUS.indexOf(passo.dataset.passo) <= posicaoAtual;
        passo.classList.toggle('cmd-passo-ativo', ativo);
        passo.classList.toggle('fw-bold', ativo);
    });
}

function chamarGarcom(evento) {
    evento.preventDefault();
    esconderErro();

    const mesa = parseInt($('chamado-mesa').value, 10);

    if (isNaN(mesa) || mesa < 1) {
        mostrarErro('Informe o número da mesa.');
        return;
    }

    const emAndamento = Banco.ler('chamados').some((c) => c.mesa === mesa && c.status !== 'atendido' && c.status !== 'cancelado');
    if (emAndamento) {
        mostrarErro('Já existe um chamado em andamento para a mesa ' + mesa + '.');
        return;
    }

    const motivo = document.querySelector('input[name="motivo"]:checked').value;

    Banco.inserir('chamados', {
        usuario_id: usuario.id,
        mesa: mesa,
        motivo: motivo,
        status: 'aberto',
        atendido_por: null,
    });

    mostrarUltimoChamado();
}

function cancelarChamado() {
    esconderErro();
    const chamado = ultimoChamado();

    if (!chamado || chamado.status !== 'aberto') {
        mostrarErro('Não dá mais para cancelar: o garçom já está a caminho.');
        mostrarUltimoChamado();
        return;
    }

    Banco.atualizar('chamados', chamado.id, { status: 'cancelado' });
    mostrarUltimoChamado();
}

function iniciar() {
    if (!usuario) return;

    document.querySelectorAll('.js-nome-usuario').forEach((el) => {
        el.textContent = usuario.nome;
    });
    $('btn-sair').addEventListener('click', () => Auth.sair());

    $('form-chamado').addEventListener('submit', chamarGarcom);
    $('btn-cancelar-chamado').addEventListener('click', cancelarChamado);

    mostrarFiltros();
    mostrarCardapio();
    mostrarUltimoChamado();

    window.addEventListener('storage', () => {
        mostrarCardapio();
        mostrarUltimoChamado();
    });

    setInterval(mostrarUltimoChamado, 30000);
}

iniciar();
