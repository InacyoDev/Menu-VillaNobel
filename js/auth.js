const Auth = {
    entrar: (email, senha) => {
        const emailLimpo = email.trim().toLowerCase();
        const usuario = Banco.ler('usuarios').find((u) => u.email === emailLimpo && u.senha === senha);

        if (!usuario) {
            return { ok: false, erro: 'E-mail ou senha incorretos.' };
        }
        if (!usuario.ativo) {
            return { ok: false, erro: 'Esta conta está desativada.' };
        }

        sessionStorage.setItem('sessao', usuario.id);
        return { ok: true, usuario: usuario };
    },

    cadastrarCliente: (nome, email, senha) => {
        const nomeLimpo = nome.trim();
        const emailLimpo = email.trim().toLowerCase();

        if (nomeLimpo === '') {
            return { ok: false, erro: 'Informe o seu nome.' };
        }
        if (!/\S+@\S+\.\S+/.test(emailLimpo)) {
            return { ok: false, erro: 'Informe um e-mail válido.' };
        }
        if (senha.length < 6) {
            return { ok: false, erro: 'A senha precisa ter pelo menos 6 caracteres.' };
        }
        if (Banco.ler('usuarios').some((u) => u.email === emailLimpo)) {
            return { ok: false, erro: 'Já existe uma conta com esse e-mail.' };
        }

        Banco.inserir('usuarios', {
            nome: nomeLimpo,
            email: emailLimpo,
            senha: senha,
            perfil: 'cliente',
            ativo: true,
        });
        return { ok: true };
    },

    usuarioLogado: () => {
        const id = sessionStorage.getItem('sessao');
        if (!id) return null;
        return Banco.buscarPorId('usuarios', id) || null;
    },

    sair: () => {
        sessionStorage.removeItem('sessao');
        window.location.href = 'index.html';
    },

    irParaPagina: (perfil) => {
        const paginas = {
            admin: 'admin.html',
            atendente: 'atendente.html',
            cliente: 'cliente.html',
        };

        const destino = paginas[perfil];
        if (!destino) {
            sessionStorage.removeItem('sessao');
            window.location.href = 'index.html';
            return;
        }
        window.location.href = destino;
    },

    exigirPerfil: (perfil) => {
        const usuario = Auth.usuarioLogado();

        if (!usuario || !usuario.ativo) {
            window.location.href = 'index.html';
        } else if (usuario.perfil !== perfil) {
            Auth.irParaPagina(usuario.perfil);
        }
    },
};

const perfilDaPagina = document.body.dataset.perfil;
if (perfilDaPagina) {
    Auth.exigirPerfil(perfilDaPagina);
}
