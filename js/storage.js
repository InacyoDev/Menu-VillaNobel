const Banco = {
    ler: (tabela) => {
        return JSON.parse(localStorage.getItem(tabela)) || [];
    },
    gravar: (tabela, lista) => {
        localStorage.setItem(tabela, JSON.stringify(lista));
    },
    gerarId: () => {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },
    buscarPorId: (tabela, id) => {
        return Banco.ler(tabela).find((registro) => registro.id === id);
    },
    inserir: (tabela, dados) => {
        const lista = Banco.ler(tabela);
        const novo = { id: Banco.gerarId(), ...dados, criado_em: new Date().toISOString() };
        lista.push(novo);
        Banco.gravar(tabela, lista);
        return novo;
    },
    atualizar: (tabela, id, dados) => {
        const lista = Banco.ler(tabela);
        const posicao = lista.findIndex((registro) => registro.id === id);
        if (posicao === -1) return null;
        lista[posicao] = { ...lista[posicao], ...dados };
        Banco.gravar(tabela, lista);
        return lista[posicao];
    },
    excluir: (tabela, id) => {
        const lista = Banco.ler(tabela).filter((registro) => registro.id !== id);
        Banco.gravar(tabela, lista);
    },
};

function criarDadosIniciais() {
    if (Banco.ler('usuarios').length === 0) {
        Banco.inserir('usuarios', {
            nome: 'Administrador',
            email: 'admin@comand.com',
            senha: 'admin123',
            perfil: 'admin',
            ativo: true
        });
    }

    if (!localStorage.getItem('cardapio_inicial_criado')) {
        const exemplos = [
            { nome: 'Carpaccio de carne', categoria: 'Entradas', preco: 46, descricao: 'Lâminas finas de filé, rúcula, parmesão e azeite.', imagem: 'fotos/carpaccio.webp' },
            { nome: 'Bolinho de bacalhau', categoria: 'Petiscos', preco: 32, descricao: 'Porção com 8 unidades e molho da casa.', imagem: 'fotos/bolinho-bacalhau.webp' },
            { nome: 'Batata rústica', categoria: 'Petiscos', preco: 28, descricao: 'Com alho, alecrim e maionese defumada.', imagem: 'fotos/batata-rustica.webp' },
            { nome: 'Picanha na chapa', categoria: 'Pratos', preco: 89, descricao: 'Para duas pessoas, com arroz, farofa e vinagrete.', imagem: 'fotos/picanha.webp' },
            { nome: 'Caipirinha de limão', categoria: 'Drinks', preco: 22, descricao: 'Cachaça, limão, açúcar e gelo.', imagem: 'fotos/caipirinha.webp' },
            { nome: 'Pudim da casa', categoria: 'Sobremesas', preco: 18, descricao: 'Calda de caramelo, servido gelado.', imagem: 'fotos/pudim.webp' }
        ];
        for (const item of exemplos) {
            Banco.inserir('itens_cardapio', { ...item, imagem: item.imagem, disponivel: true });
        }
        localStorage.setItem('cardapio_inicial_criado', 'sim');
    }
}
criarDadosIniciais();
