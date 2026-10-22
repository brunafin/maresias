# Letras da roda

Página de letras para um grupo cantar junto. A letra aparece grande, sem anúncio, sem login e sem cadastro. Não há cifra, conta, cookie de rastreio nem banco de dados.

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

O tamanho da letra e o contraste ficam gravados neste aparelho, para não precisar ajustar de novo. Isso não é uma conta.
