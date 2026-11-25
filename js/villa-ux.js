(() => {
    'use strict';

    const perfil = document.body.getAttribute('data-perfil');
    const tituloOriginal = document.title;
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const caixaAvisos = document.createElement('div');
    caixaAvisos.className = 'cmd-toasts';
    caixaAvisos.setAttribute('role', 'status');
    caixaAvisos.setAttribute('aria-live', 'polite');
    document.body.appendChild(caixaAvisos);

    const avisar = (titulo, texto) => {
        const aviso = document.createElement('div');
        aviso.className = 'cmd-toast';
        const corpo = document.createElement('div');
        const t = document.createElement('strong');
        t.textContent = titulo;
        corpo.appendChild(t);
        if (texto) {
            const d = document.createElement('span');
            d.textContent = texto;
            corpo.appendChild(d);
        }
        aviso.appendChild(corpo);
        caixaAvisos.appendChild(aviso);

        setTimeout(() => {
            aviso.classList.add('saindo');
            setTimeout(() => aviso.remove(), 260);
        }, 4500);
    };

    const observarTexto = (el, aoMudar) => {
        if (!el) return;
        let ultimo = el.textContent.trim();
        new MutationObserver(() => {
            const atual = el.textContent.trim();
            if (atual === ultimo) return;
            const anterior = ultimo;
            ultimo = atual;
            aoMudar(atual, anterior);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    };

    const pulsar = (el) => {
        if (!el || semMovimento) return;
        el.classList.remove('cmd-pulso');
        void el.offsetWidth;
        el.classList.add('cmd-pulso');
    };

    const semAcento = (texto) =>
        String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const CAMPOS_FICHA = [
        ['ingredientes', 'Ingredientes'],
        ['preparo', 'Preparo'],
        ['tempo', 'Tempo'],
        ['diferencial', 'Diferencial'],
    ];

    const lerFicha = (bruto) => {
        const partes = String(bruto || '').split(/\r?\n---\r?\n/);
        const ficha = { texto: partes[0].trim(), ingredientes: '', preparo: '', tempo: '', diferencial: '' };
        if (partes.length > 1) {
            partes.slice(1).join('\n').split(/\r?\n/).forEach((linha) => {
                CAMPOS_FICHA.forEach(([chave, rotulo]) => {
                    const m = linha.match(new RegExp('^\\s*' + rotulo + '\\s*:\\s*(.*)$', 'i'));
                    if (m) ficha[chave] = m[1].trim();
                });
            });
        }
        return ficha;
    };

    const montarFicha = (ficha) => {
        const linhas = CAMPOS_FICHA
            .filter(([chave]) => ficha[chave])
            .map(([chave, rotulo]) => rotulo + ': ' + ficha[chave]);
        return linhas.length ? ficha.texto + '\n---\n' + linhas.join('\n') : ficha.texto;
    };

    const FICHA_EXEMPLO = {
        'bolinho de bacalhau': { ingredientes: 'Bacalhau, batata, cebola, salsa', preparo: 'Massa modelada à mão e frita na hora', tempo: '15 min', diferencial: 'Molho da casa servido à parte' },
        'batata rustica': { ingredientes: 'Batata com casca, alho, alecrim, maionese defumada', preparo: 'Assada e finalizada na fritura para ficar crocante', tempo: '20 min', diferencial: 'Maionese defumada feita na casa' },
        'picanha na chapa': { ingredientes: 'Picanha, sal grosso, arroz, farofa, vinagrete', preparo: 'Selada na chapa bem quente e finalizada no ponto', tempo: '25 min', diferencial: 'Serve duas pessoas' },
        'caipirinha de limao': { ingredientes: 'Cachaça, limão, açúcar, gelo', preparo: 'Limão macerado na hora, no seu ponto de doçura', tempo: '3 min', diferencial: 'Preparada na hora, sem mistura pronta' },
        'pudim da casa': { ingredientes: 'Leite, leite condensado, ovos, calda de caramelo', preparo: 'Cozido em banho-maria e servido gelado', tempo: 'Feito de véspera', diferencial: 'Calda de caramelo da casa' },
    };

    const PAPEIS = { cliente: 'Cliente', atendente: 'Atendente', admin: 'Administrador' };

    const decorarSidebar = () => {
        const rodape = document.querySelector('.cmd-sidebar-rodape');
        const nomeEl = rodape && rodape.querySelector('.js-nome-usuario');
        if (!rodape || !nomeEl) return;

        const antigo = rodape.querySelector('.cmd-texto-claro');
        if (antigo) antigo.remove();

        const cartao = document.createElement('div');
        cartao.className = 'cmd-usuario';
        const avatar = document.createElement('span');
        avatar.className = 'cmd-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        const coluna = document.createElement('div');
        coluna.className = 'cmd-usuario-dados';
        const papel = document.createElement('span');
        papel.className = 'cmd-usuario-papel';
        papel.textContent = PAPEIS[perfil] || '';

        rodape.insertBefore(cartao, rodape.firstChild);
        cartao.appendChild(avatar);
        cartao.appendChild(coluna);
        coluna.appendChild(nomeEl);
        coluna.appendChild(papel);

        const iniciais = () => {
            const partes = nomeEl.textContent.trim().split(/\s+/).filter(Boolean);
            const primeira = partes[0] ? partes[0][0] : '';
            const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
            avatar.textContent = (primeira + ultima).toUpperCase();
        };
        iniciais();
        observarTexto(nomeEl, iniciais);
    };

    const minutosDesde = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

    const tempoTexto = (iso) => {
        const m = minutosDesde(iso);
        if (m < 1) return 'agora mesmo';
        if (m < 60) return 'há ' + m + ' min';
        return 'há ' + Math.floor(m / 60) + ' h';
    };

    const lerBanco = (tabela) => {
        try { return Banco.ler(tabela) || []; } catch { return []; }
    };

    const desenharBarras = (caixa, linhas, cor) => {
        caixa.textContent = '';
        const maximo = Math.max(1, ...linhas.map((l) => l[1]));
        linhas.forEach(([nome, valor]) => {
            const linha = document.createElement('div');
            linha.className = 'cmd-barra-linha';
            const rotulo = document.createElement('span');
            rotulo.className = 'cmd-barra-rotulo';
            rotulo.textContent = nome;
            const trilho = document.createElement('span');
            trilho.className = 'cmd-barra-trilho';
            const preenche = document.createElement('span');
            preenche.className = 'cmd-barra-preenche' + (cor ? ' ' + cor : '');
            preenche.style.width = Math.round((valor / maximo) * 100) + '%';
            trilho.appendChild(preenche);
            const numero = document.createElement('span');
            numero.className = 'cmd-barra-valor';
            numero.textContent = valor;
            linha.appendChild(rotulo);
            linha.appendChild(trilho);
            linha.appendChild(numero);
            caixa.appendChild(linha);
        });
    };

    const lembrarAba = () => {
        if (!perfil) return;
        const chave = 'villa:aba:' + perfil;

        document.addEventListener('shown.bs.tab', (e) => {
            try { sessionStorage.setItem(chave, e.target.id); } catch { }
        });

        let salvo = null;
        try { salvo = sessionStorage.getItem(chave); } catch { }
        const botao = salvo && document.getElementById(salvo);
        if (botao && !botao.classList.contains('active') && window.bootstrap) {
            window.bootstrap.Tab.getOrCreateInstance(botao).show();
        }
    };

    const iniciarCliente = () => {
        const campo = document.getElementById('busca-cardapio');
        const lista = document.getElementById('lista-cardapio');
        const contagem = document.getElementById('busca-contagem');
        const vazia = document.getElementById('busca-vazia');
        const vazioCategoria = document.getElementById('cardapio-vazio');

        const enriquecer = () => {
            Array.from(lista.children).forEach((col) => {
                if (col.dataset.pronto) return;
                col.dataset.pronto = '1';

                const descEl = col.querySelector('.js-descricao');
                const nomeEl = col.querySelector('.js-nome');
                const corpo = col.querySelector('.card-body');
                if (!descEl || !nomeEl || !corpo) return;

                const ficha = lerFicha(descEl.textContent);
                const semFicha = !(ficha.ingredientes || ficha.preparo || ficha.tempo || ficha.diferencial);
                if (semFicha) {
                    const exemplo = FICHA_EXEMPLO[semAcento(nomeEl.textContent.trim())];
                    if (exemplo) Object.assign(ficha, exemplo);
                }

                descEl.textContent = ficha.texto;
                descEl.hidden = !ficha.texto;

                const linhas = [
                    ['Ingredientes', ficha.ingredientes],
                    ['Como é feito', ficha.preparo],
                    ['Diferencial', ficha.diferencial],
                ].filter(([, valor]) => valor);

                const texto = descEl.parentNode;
                if (ficha.tempo) {
                    const chip = document.createElement('span');
                    chip.className = 'cmd-meta-tempo';
                    chip.textContent = ficha.tempo;
                    const cat = texto.querySelector('.js-categoria');
                    if (cat) cat.after(chip); else texto.appendChild(chip);
                }

                if (linhas.length) {
                    const dl = document.createElement('dl');
                    dl.className = 'cmd-ficha';
                    linhas.forEach(([rotulo, valor]) => {
                        const bloco = document.createElement('div');
                        const dt = document.createElement('dt');
                        dt.textContent = rotulo;
                        const dd = document.createElement('dd');
                        dd.textContent = valor;
                        bloco.appendChild(dt);
                        bloco.appendChild(dd);
                        dl.appendChild(bloco);
                    });
                    texto.appendChild(dl);
                }
            });
        };

        const aplicarBusca = () => {
            const termo = semAcento(campo.value.trim());
            const cards = Array.from(lista.children);
            let visiveis = 0;

            cards.forEach((card) => {
                const bate = !termo || semAcento(card.textContent).includes(termo);
                card.hidden = !bate;
                if (bate) visiveis++;
            });

            const total = cards.length;
            vazia.classList.toggle('d-none', !(termo && total > 0 && visiveis === 0));
            contagem.textContent = total === 0 ? '' : visiveis + (visiveis === 1 ? ' item' : ' itens') +
                (termo ? ' para “' + campo.value.trim() + '”' : ' disponíveis');
        };

        campo.addEventListener('input', aplicarBusca);
        campo.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && campo.value) {
                campo.value = '';
                aplicarBusca();
            }
        });

        new MutationObserver(() => { enriquecer(); aplicarBusca(); }).observe(lista, { childList: true });
        enriquecer();
        aplicarBusca();

        document.addEventListener('keydown', (e) => {
            const alvo = e.target;
            const digitando = alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
            if (e.key === '/' && !digitando && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                const aba = document.getElementById('tab-cardapio');
                if (aba && !aba.classList.contains('active') && window.bootstrap) {
                    window.bootstrap.Tab.getOrCreateInstance(aba).show();
                }
                campo.focus();
            }
        });

        const mesa = document.getElementById('chamado-mesa');
        const menos = document.getElementById('mesa-menos');
        const mais = document.getElementById('mesa-mais');
        const dica = document.getElementById('mesa-lembrada');
        if (mesa && menos && mais) {
            let lembrada = null;
            try { lembrada = localStorage.getItem('villa:mesa'); } catch { }
            if (lembrada && !mesa.value) {
                mesa.value = lembrada;
                dica.textContent = 'Usamos a mesa do seu último chamado (' + lembrada + '). Altere se for outra.';
                dica.hidden = false;
            }
            const ajustar = (delta) => {
                const v = parseInt(mesa.value, 10);
                mesa.value = Math.max(1, (isNaN(v) ? 0 : v) + delta);
                mesa.dispatchEvent(new Event('input', { bubbles: true }));
            };
            menos.addEventListener('click', () => ajustar(-1));
            mais.addEventListener('click', () => ajustar(1));
            mesa.addEventListener('input', () => {
                dica.hidden = true;
                const v = parseInt(mesa.value, 10);
                if (v > 0) { try { localStorage.setItem('villa:mesa', String(v)); } catch { } }
            });
        }

        if (vazioCategoria) {
            new MutationObserver(() => {
                if (!vazioCategoria.classList.contains('d-none')) vazia.classList.add('d-none');
            }).observe(vazioCategoria, { attributes: true, attributeFilter: ['class'] });
        }

        const abaChamar = document.getElementById('tab-chamar');
        if (abaChamar) {
            const textoNovidade = document.createElement('span');
            textoNovidade.className = 'visually-hidden cmd-novidade-texto';
            textoNovidade.textContent = ' (novidade no seu chamado)';
            textoNovidade.hidden = true;
            abaChamar.appendChild(textoNovidade);

            document.addEventListener('shown.bs.tab', (e) => {
                if (e.target === abaChamar) {
                    abaChamar.classList.remove('tem-novidade');
                    textoNovidade.hidden = true;
                }
            });
            observarTexto(document.getElementById('status-chamado'), () => {
                if (!abaChamar.classList.contains('active')) {
                    abaChamar.classList.add('tem-novidade');
                    textoNovidade.hidden = false;
                }
            });
        }

        lista.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') e.target.removeAttribute('src');
        }, true);

        observarTexto(document.getElementById('status-chamado'), (atual) => {
            if (atual === 'Enviado') avisar('Chamado enviado', 'Um atendente já foi avisado.');
            else if (atual === 'Em atendimento') avisar('Já vão até a sua mesa', 'Seu chamado está em atendimento.');
            else if (atual === 'Atendido') avisar('Chamado atendido', 'Se precisar de algo mais, é só chamar.');
            else if (atual === 'Cancelado') avisar('Chamado cancelado', 'Nenhum atendente irá até a sua mesa.');
        });
    };

    const iniciarAtendente = () => {
        const badgeChamados = document.getElementById('badge-chamados');
        const badgeFila = document.getElementById('badge-fila');

        const numero = (el) => parseInt(el.textContent, 10) || 0;

        const atualizarTitulo = () => {
            const n = numero(badgeChamados);
            document.title = (n > 0 ? '(' + n + ') ' : '') + tituloOriginal;
        };

        observarTexto(badgeChamados, (atual, anterior) => {
            pulsar(badgeChamados);
            atualizarTitulo();
            if (numero({ textContent: atual }) > numero({ textContent: anterior })) {
                avisar('Novo chamado', atual + (atual === '1' ? ' mesa aguarda' : ' mesas aguardam') + ' atendimento.');
            }
        });

        observarTexto(badgeFila, (atual, anterior) => {
            pulsar(badgeFila);
            if (numero({ textContent: atual }) > numero({ textContent: anterior })) {
                avisar('Novo pedido na fila', atual + (atual === '1' ? ' pedido' : ' pedidos') + ' em andamento.');
            }
        });

        atualizarTitulo();

        const buscaPedido = document.getElementById('busca-pedido');
        const listaItens = document.getElementById('pedido-lista-itens');
        if (buscaPedido && listaItens) {
            const filtrarPedido = () => {
                const termo = semAcento(buscaPedido.value.trim());
                Array.from(listaItens.children).forEach((c) => {
                    c.hidden = !!termo && !semAcento(c.textContent).includes(termo);
                });
            };
            buscaPedido.addEventListener('input', filtrarPedido);
            new MutationObserver(filtrarPedido).observe(listaItens, { childList: true });
        }
        observarTexto(document.getElementById('pedido-total'), () => {
            pulsar(document.getElementById('pedido-total'));
        });

        const tira = document.getElementById('tira-chamados');
        const lista = document.getElementById('lista-chamados');

        const desenharTira = () => {
            if (!tira) return;
            const todos = lerBanco('chamados');
            const hoje = new Date().toDateString();
            const abertos = todos.filter((c) => c.status === 'aberto');
            const andamento = todos.filter((c) => c.status === 'em_atendimento');
            const atendidosHoje = todos.filter((c) => c.status === 'atendido' && new Date(c.criado_em).toDateString() === hoje);
            const maior = abertos.reduce((m, c) => Math.max(m, minutosDesde(c.criado_em)), 0);

            const dados = [
                ['Aguardando', abertos.length, abertos.length ? 'atenção' : ''],
                ['Em atendimento', andamento.length, ''],
                ['Atendidos hoje', atendidosHoje.length, ''],
                ['Maior espera', abertos.length ? (maior < 1 ? '< 1 min' : maior + ' min') : '-', maior >= 5 ? 'atenção' : ''],
            ];
            tira.textContent = '';
            dados.forEach(([rotulo, valor, classe]) => {
                const item = document.createElement('div');
                item.className = 'cmd-tira-item' + (classe ? ' ' + classe : '');
                const forte = document.createElement('strong');
                forte.textContent = valor;
                const legenda = document.createElement('span');
                legenda.textContent = rotulo;
                item.appendChild(forte);
                item.appendChild(legenda);
                tira.appendChild(item);
            });
        };

        const marcarUrgentes = () => {
            lista.querySelectorAll('.cmd-chamado').forEach((card) => {
                const status = card.querySelector('.js-status');
                const tempo = card.querySelector('.js-tempo');
                if (!status || !tempo) return;
                const m = tempo.textContent.match(/há (\d+) (min|h)/);
                const minutos = m ? (m[2] === 'h' ? parseInt(m[1], 10) * 60 : parseInt(m[1], 10)) : 0;
                const urgente = /aberto/i.test(status.textContent) && minutos >= 5;
                card.classList.toggle('cmd-urgente', urgente);
            });
        };

        if (lista) {
            new MutationObserver(() => { marcarUrgentes(); desenharTira(); }).observe(lista, { childList: true });
            marcarUrgentes();
        }
        desenharTira();
        setInterval(desenharTira, 15000);
        window.addEventListener('storage', desenharTira);
    };

    const iniciarAdmin = () => {
        ['resumo-chamados', 'resumo-pedidos', 'resumo-itens', 'resumo-atendentes'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;

            let escrito = el.textContent.trim();
            let quadro = 0;

            const animar = (de, para) => {
                cancelAnimationFrame(quadro);
                if (semMovimento || de === para) {
                    escrito = String(para);
                    el.textContent = escrito;
                    return;
                }
                const inicio = performance.now();
                const duracao = 600;
                const passo = (agora) => {
                    const p = Math.min((agora - inicio) / duracao, 1);
                    const v = Math.round(de + (para - de) * (1 - Math.pow(1 - p, 3)));
                    escrito = String(v);
                    el.textContent = escrito;
                    if (p < 1) quadro = requestAnimationFrame(passo);
                };
                passo(inicio);
            };

            new MutationObserver(() => {
                const atual = el.textContent.trim();
                if (atual === escrito) return;
                const alvo = parseInt(atual, 10);
                if (isNaN(alvo)) return;
                animar(parseInt(escrito, 10) || 0, alvo);
            }).observe(el, { childList: true, characterData: true, subtree: true });

            const inicial = parseInt(escrito, 10);
            if (!isNaN(inicial) && inicial > 0) animar(0, inicial);
        });
    };

    const iniciarFichaItem = () => {
        const form = document.getElementById('form-item');
        const desc = document.getElementById('item-descricao');
        if (!form || !desc) return;

        const campos = {};
        CAMPOS_FICHA.forEach(([chave]) => { campos[chave] = document.getElementById('item-' + chave); });

        const original = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

        const preencher = (ficha) => {
            CAMPOS_FICHA.forEach(([chave]) => {
                if (campos[chave]) campos[chave].value = ficha[chave] || '';
            });
        };

        Object.defineProperty(desc, 'value', {
            configurable: true,
            get() { return original.get.call(this); },
            set(v) {
                const ficha = lerFicha(v);
                original.set.call(this, ficha.texto);
                preencher(ficha);
            },
        });

        form.addEventListener('reset', () => preencher({}));

        form.addEventListener('submit', () => {
            const ficha = { texto: original.get.call(desc).trim() };
            CAMPOS_FICHA.forEach(([chave]) => {
                ficha[chave] = (campos[chave].value || '').trim().replace(/\s*\n\s*/g, ' ');
            });
            original.set.call(desc, montarFicha(ficha));
            setTimeout(() => {
                const atual = original.get.call(desc);
                if (/\r?\n---\r?\n/.test(atual)) original.set.call(desc, lerFicha(atual).texto);
            }, 0);
        }, true);
    };

    const iniciarPainelAdmin = () => {
        const ultimos = document.getElementById('ult-chamados');
        const hora = document.getElementById('ult-chamados-hora');
        const barrasFila = document.getElementById('barras-fila');
        const barrasCat = document.getElementById('barras-categorias');
        if (!ultimos || !barrasFila || !barrasCat) return;

        const NOME_STATUS = { aberto: 'Aberto', em_atendimento: 'Em atendimento', atendido: 'Atendido', cancelado: 'Cancelado' };
        const COR_STATUS = { aberto: 'text-bg-warning', atendido: 'text-bg-success', cancelado: 'text-bg-secondary' };

        const desenhar = () => {
            const chamados = lerBanco('chamados').slice(-5).reverse();
            ultimos.textContent = '';
            if (!chamados.length) {
                const vazio = document.createElement('li');
                vazio.className = 'cmd-vazio';
                vazio.textContent = 'Nenhum chamado ainda. Quando um cliente chamar, aparece aqui.';
                ultimos.appendChild(vazio);
            }
            chamados.forEach((c) => {
                const li = document.createElement('li');
                li.className = 'cmd-atividade';
                const mesa = document.createElement('span');
                mesa.className = 'cmd-atividade-mesa';
                mesa.textContent = c.mesa;
                const corpo = document.createElement('span');
                corpo.className = 'cmd-atividade-corpo';
                const titulo = document.createElement('strong');
                titulo.textContent = 'Mesa ' + c.mesa + ' · ' + (c.motivo || 'Chamado');
                const sub = document.createElement('span');
                sub.textContent = tempoTexto(c.criado_em);
                corpo.appendChild(titulo);
                corpo.appendChild(sub);
                const selo = document.createElement('span');
                selo.className = 'badge cmd-status ' + (COR_STATUS[c.status] || 'text-bg-info');
                selo.textContent = NOME_STATUS[c.status] || c.status;
                li.appendChild(mesa);
                li.appendChild(corpo);
                li.appendChild(selo);
                ultimos.appendChild(li);
            });
            hora.textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const pedidos = lerBanco('pedidos');
            desenharBarras(barrasFila, [
                ['Em andamento', pedidos.filter((p) => p.status !== 'entregue').length],
                ['Finalizados', pedidos.filter((p) => p.status === 'entregue').length],
            ], 'verde');

            const itens = lerBanco('itens_cardapio');
            const cats = ['Entradas', 'Petiscos', 'Pratos', 'Drinks', 'Sobremesas'];
            desenharBarras(barrasCat, cats.map((c) => [c, itens.filter((i) => i.categoria === c).length]), '');
        };

        desenhar();
        setInterval(desenhar, 8000);
        window.addEventListener('storage', desenhar);
        document.addEventListener('shown.bs.tab', desenhar);
    };

    const iniciarTabelasAdmin = () => {
        document.querySelectorAll('[data-busca-tabela]').forEach((caixa) => {
            const corpo = document.getElementById(caixa.getAttribute('data-busca-tabela'));
            const campo = caixa.querySelector('input');
            if (!corpo || !campo) return;

            const filtrar = () => {
                const termo = semAcento(campo.value.trim());
                Array.from(corpo.children).forEach((tr) => {
                    tr.hidden = !!termo && !semAcento(tr.textContent).includes(termo);
                });
            };
            campo.addEventListener('input', filtrar);
            new MutationObserver(filtrar).observe(corpo, { childList: true });
        });

        const corpoItens = document.getElementById('corpo-cardapio');
        if (corpoItens) {
            const colocar = () => {
                const itens = lerBanco('itens_cardapio');
                Array.from(corpoItens.children).forEach((tr) => {
                    const td = tr.querySelector('.js-nome');
                    if (!td || td.querySelector('.cmd-miniatura')) return;
                    const nome = td.textContent.trim();
                    const item = itens.find((i) => i.nome === nome);
                    let mini;
                    if (item && item.imagem) {
                        mini = document.createElement('img');
                        mini.src = item.imagem;
                        mini.alt = '';
                    } else {
                        mini = document.createElement('span');
                        mini.textContent = nome.charAt(0).toUpperCase();
                    }
                    mini.className = 'cmd-miniatura';
                    const linhaNome = document.createElement('div');
                    linhaNome.className = 'd-flex align-items-center gap-3';
                    const textoNome = document.createElement('span');
                    textoNome.textContent = nome;
                    td.textContent = '';
                    linhaNome.appendChild(mini);
                    linhaNome.appendChild(textoNome);
                    td.appendChild(linhaNome);
                });
            };
            new MutationObserver(colocar).observe(corpoItens, { childList: true });
            colocar();
        }
    };

    const iniciarImagemItem = () => {
        const guarda = document.getElementById('item-imagem');
        const area = document.getElementById('zona-imagem-area');
        const arquivo = document.getElementById('item-imagem-arquivo');
        const link = document.getElementById('item-imagem-link');
        const remover = document.getElementById('item-imagem-remover');
        const form = document.getElementById('form-item');
        if (!guarda || !area || !arquivo) return;

        let previa = null;
        const MAX_LADO = 720;
        const MAX_ORIGINAL = 12 * 1024 * 1024;

        const mostrar = (valor) => {
            valor = (valor || '').trim();
            if (valor) {
                if (!previa) {
                    previa = document.createElement('img');
                    previa.className = 'cmd-zona-previa';
                    previa.alt = 'Prévia da imagem do item';
                    area.insertBefore(previa, area.firstChild);
                }
                previa.src = valor;
            } else if (previa) {
                previa.remove();
                previa = null;
            }
            area.classList.toggle('com-imagem', !!valor);
            remover.hidden = !valor;
            if (document.activeElement !== link) {
                const linkVisivel = valor.startsWith('data:') ? '' : valor;
                if (link.value !== linkVisivel) link.value = linkVisivel;
            }
        };

        const original = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        Object.defineProperty(guarda, 'value', {
            configurable: true,
            get() { return original.get.call(this); },
            set(v) {
                original.set.call(this, v);
                mostrar(v);
            },
        });
        if (form) form.addEventListener('reset', () => {
            setTimeout(() => mostrar(guarda.value), 0);
        });

        const definir = (valor) => { guarda.value = valor; };

        const processar = (file) => {
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                avisar('Arquivo não aceito', 'Escolha uma imagem (JPG, PNG, WEBP...).');
                return;
            }
            if (file.size > MAX_ORIGINAL) {
                avisar('Imagem muito grande', 'Use um arquivo de até 12 MB.');
                return;
            }

            const leitor = new FileReader();
            leitor.onerror = () => avisar('Não consegui ler o arquivo', 'Tente outra imagem.');
            leitor.onload = () => {
                const img = new Image();
                img.onerror = () => avisar('Imagem inválida', 'Esse arquivo não pôde ser aberto.');
                img.onload = () => {
                    const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
                    const tela = document.createElement('canvas');
                    tela.width = Math.max(1, Math.round(img.width * escala));
                    tela.height = Math.max(1, Math.round(img.height * escala));
                    tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);

                    let saida = tela.toDataURL('image/webp', 0.82);
                    if (!saida.startsWith('data:image/webp')) saida = tela.toDataURL('image/jpeg', 0.85);
                    definir(saida);
                    avisar('Imagem pronta', 'Ela será salva junto com o item.');
                };
                img.src = leitor.result;
            };
            leitor.readAsDataURL(file);
        };

        arquivo.addEventListener('change', () => {
            processar(arquivo.files && arquivo.files[0]);
            arquivo.value = '';
        });

        ['dragenter', 'dragover'].forEach((nome) => {
            area.addEventListener(nome, (e) => {
                e.preventDefault();
                area.classList.add('arrastando');
            });
        });
        ['dragleave', 'dragend'].forEach((nome) => {
            area.addEventListener(nome, () => area.classList.remove('arrastando'));
        });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('arrastando');
            const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) processar(f);
        });

        ['dragover', 'drop'].forEach((nome) => {
            document.addEventListener(nome, (e) => {
                if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
                    e.preventDefault();
                }
            });
        });

        document.addEventListener('paste', (e) => {
            const painel = document.getElementById('aba-cardapio');
            if (!painel || !painel.classList.contains('active')) return;
            const itens = Array.from((e.clipboardData && e.clipboardData.items) || []);
            const imagem = itens.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
            if (imagem) {
                e.preventDefault();
                processar(imagem.getAsFile());
            }
        });

        link.addEventListener('input', () => definir(link.value.trim()));
        remover.addEventListener('click', () => definir(''));

        mostrar(guarda.value);
    };

    const iniciarLogin = () => {
        document.querySelectorAll('input[type="password"]').forEach((campo) => {
            const pai = campo.parentNode;
            const envolucro = document.createElement('div');
            envolucro.className = 'cmd-senha';
            pai.insertBefore(envolucro, campo);
            envolucro.appendChild(campo);

            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'cmd-senha-botao';
            botao.textContent = 'Mostrar';
            botao.setAttribute('aria-pressed', 'false');
            botao.setAttribute('aria-label', 'Mostrar senha');
            envolucro.appendChild(botao);

            const aviso = document.createElement('div');
            aviso.className = 'form-text cmd-aviso-caps';
            aviso.textContent = 'Caps Lock está ligado.';
            aviso.hidden = true;
            envolucro.after(aviso);

            botao.addEventListener('click', () => {
                const mostrar = campo.type === 'password';
                campo.type = mostrar ? 'text' : 'password';
                botao.textContent = mostrar ? 'Ocultar' : 'Mostrar';
                botao.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
                botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
                campo.focus();
            });

            const caps = (e) => {
                if (e.getModifierState) aviso.hidden = !e.getModifierState('CapsLock');
            };
            campo.addEventListener('keydown', caps);
            campo.addEventListener('keyup', caps);
            campo.addEventListener('blur', () => { aviso.hidden = true; });
        });

        ['login-erro', 'cad-erro'].forEach((id) => {
            const caixa = document.getElementById(id);
            if (!caixa) return;

            let visivel = !caixa.classList.contains('d-none');
            const form = caixa.closest('form');
            const campos = form ? Array.from(form.querySelectorAll('input')) : [];

            const marcarCampos = (invalido) => {
                campos.forEach((c) => {
                    if (invalido) {
                        c.setAttribute('aria-invalid', 'true');
                        c.setAttribute('aria-describedby', id);
                    } else {
                        c.removeAttribute('aria-invalid');
                        c.removeAttribute('aria-describedby');
                    }
                });
            };
            campos.forEach((c) => {
                c.addEventListener('input', () => c.removeAttribute('aria-invalid'));
            });

            new MutationObserver(() => {
                const agora = !caixa.classList.contains('d-none');
                if (agora === visivel) return;
                visivel = agora;
                marcarCampos(agora);
                if (agora && campos[0]) {
                    const primeiroVazio = campos.find((c) => !c.value);
                    (primeiroVazio || campos[0]).focus();
                }
                if (agora && !semMovimento) {
                    caixa.classList.remove('cmd-treme');
                    void caixa.offsetWidth;
                    caixa.classList.add('cmd-treme');
                }
            }).observe(caixa, { attributes: true, attributeFilter: ['class'] });
        });
    };

    const atalhoConteudo = () => {
        const principal = document.querySelector('main');
        if (!principal) return;
        if (!principal.id) principal.id = 'conteudo';
        const link = document.createElement('a');
        link.className = 'cmd-pular';
        link.href = '#' + principal.id;
        link.textContent = 'Pular para o conteúdo';
        document.body.insertBefore(link, document.body.firstChild);
    };

    const iniciarFundo = () => {
        const principal = document.querySelector('.cmd-conteudo');
        if (!principal) return;

        const fundo = document.createElement('div');
        fundo.className = 'cmd-fundo';
        fundo.setAttribute('aria-hidden', 'true');
        const foto = document.createElement('div');
        foto.className = 'cmd-fundo-foto';
        const veu = document.createElement('div');
        veu.className = 'cmd-fundo-veu';
        fundo.appendChild(foto);
        fundo.appendChild(veu);
        principal.insertBefore(fundo, principal.firstChild);

        const ajustarAltura = () => {
            const painel = principal.querySelector('.tab-pane.active');
            const titulo = painel && painel.querySelector('.cmd-titulo-pagina');
            if (!titulo) return;

            let bloco = titulo;
            while (bloco.parentElement && bloco.parentElement !== painel) bloco = bloco.parentElement;
            let ultimo = bloco;
            const apoio = bloco.nextElementSibling;
            if (apoio && apoio.classList.contains('cmd-texto-apoio')) ultimo = apoio;
            if (!ultimo.classList.contains('cmd-hero')) ultimo.classList.add('cmd-zona-titulo');

            const fim = ultimo.getBoundingClientRect().bottom;
            const altura = fim - principal.getBoundingClientRect().top + 48;
            fundo.style.setProperty('--altura-fundo', Math.round(altura) + 'px');
        };

        ajustarAltura();
        window.addEventListener('resize', ajustarAltura);
        window.addEventListener('load', ajustarAltura);
        document.addEventListener('shown.bs.tab', ajustarAltura);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarAltura);
        if (window.ResizeObserver) new ResizeObserver(ajustarAltura).observe(principal);
    };

    atalhoConteudo();
    if (perfil) iniciarFundo();
    decorarSidebar();
    lembrarAba();
    if (!perfil) iniciarLogin();
    if (perfil === 'cliente') iniciarCliente();
    else if (perfil === 'atendente') iniciarAtendente();
    else if (perfil === 'admin') {
        iniciarAdmin();
        iniciarPainelAdmin();
        iniciarTabelasAdmin();
        iniciarFichaItem();
        iniciarImagemItem();
    }
})();
