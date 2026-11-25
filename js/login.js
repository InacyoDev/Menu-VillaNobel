const $ = (id) => document.getElementById(id);

function mostrarMensagem(idCaixa, texto) {
    const caixa = $(idCaixa);
    caixa.textContent = texto;
    caixa.classList.remove('d-none');
}

function esconderMensagem(idCaixa) {
    const caixa = $(idCaixa);
    caixa.textContent = '';
    caixa.classList.add('d-none');
}

const jaLogado = Auth.usuarioLogado();
if (jaLogado) {
    Auth.irParaPagina(jaLogado.perfil);
}

$('form-login').addEventListener('submit', (evento) => {
    evento.preventDefault();
    esconderMensagem('login-erro');

    const resultado = Auth.entrar($('login-email').value, $('login-senha').value);

    if (!resultado.ok) {
        mostrarMensagem('login-erro', resultado.erro);
        return;
    }

    Auth.irParaPagina(resultado.usuario.perfil);
});

$('form-cadastro').addEventListener('submit', (evento) => {
    evento.preventDefault();
    esconderMensagem('cad-erro');
    esconderMensagem('cad-sucesso');

    const email = $('cad-email').value;
    const senha = $('cad-senha').value;

    const resultado = Auth.cadastrarCliente($('cad-nome').value, email, senha);

    if (!resultado.ok) {
        mostrarMensagem('cad-erro', resultado.erro);
        return;
    }

    mostrarMensagem('cad-sucesso', 'Conta criada! Entrando...');

    setTimeout(() => {
        const entrada = Auth.entrar(email, senha);
        Auth.irParaPagina(entrada.usuario.perfil);
    }, 800);
});
