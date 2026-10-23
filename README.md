# maresias

Página de letras para um grupo cantar junto. A letra aparece grande, sem anúncio. A busca funciona sem conta. Não há cookie de rastreio. Quem entra pode guardar músicas e escrever a própria cifra.

As letras não ficam neste repositório. Quando alguém abre uma música, o site busca a letra na hora e mostra na tela.

## Como rodar

É preciso Node.js 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra [http://localhost:43117](http://localhost:43117).

O servidor de desenvolvimento escuta em todas as interfaces, na porta 43117.

## De onde vêm as letras

O navegador só fala com este site. Duas rotas fazem a ponte:

- `/api/busca` procura músicas
- `/api/letra` traz a letra de uma música

Essas rotas consultam, nesta ordem:

1. [LRCLIB](https://lrclib.net), sem chave
2. [lyrics.ovh](https://api.lyrics.ovh), se a primeira não tiver a letra

Usamos a letra corrida. Se a resposta vier com o tempo do karaokê e também com a letra corrida, fica só a corrida. Linhas que são só acorde são tiradas.

O tamanho da letra fica gravado neste aparelho, para não precisar ajustar de novo. Isso não é uma conta. A tela fica clara, em tom quente.

## Cifra

Quem entrou pode cifrar uma música. **Cifrar** abre a edição: um toque na palavra escolhe o lugar, o acorde se escreve na barra e um arraste leva o acorde até a fresta entre as letras. **Pronto** guarda. Depois, **Cifra** liga e desliga esses acordes. O lápis volta para a edição. A cifra fica na conta da pessoa, separada das músicas guardadas. Com a cifra desligada, a tela mostra só a letra.

## Entrar com Google

No alto da página inicial há o link Entrar. Ele abre `/entrar`, com um botão do Google e um caminho de volta para a busca. Sem conta, a busca e as letras continuam iguais.

A sessão é um JWT. As músicas guardadas e as cifras ficam na conta.

Estas três variáveis ligam o Google:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Se alguma faltar, `/entrar` avisa que o Google ainda não está ligado. Ninguém aparece como se tivesse entrado.

No provedor Google, o caminho de callback é `/api/auth/callback/google`. Em desenvolvimento, o endereço completo é `http://localhost:43117/api/auth/callback/google`.
