# nero-developer

Site pessoal em TypeScript e CSS, feito com Vite. Mostra o perfil do Discord em tempo real (avatar, nome, status e RPCs), toca uma rádio com player e aponta para as redes.

## Configuração

Tudo fica em `src/config.ts`: ID do Discord, wallpaper, playlist, links e a coluna de tecnologias.

- O status vem do Lanyard. Entre em https://discord.gg/lanyard com a sua conta.
- Troque `SEU_USUARIO` nos links do LinkedIn e do Patreon.

## Wallpapers

São três: a página principal, a de projetos e a de baixo. Cada uma aceita imagem (`.webp`, `.jpg`, `.jpeg`, `.png`) ou vídeo (`.mp4`, `.webm`) e a extensão é descoberta sozinha. Coloque os arquivos em `public/`:

| Página | Computador | Celular |
| --- | --- | --- |
| Principal | `wallpaper-1` | `wallpaper-phone-1` |
| Projetos | `wallpaper-2` | `wallpaper-phone-2` |
| Mais (seta de baixo) | `wallpaper-3` | `wallpaper-phone-3` |

No celular (telas de até 760 px) o site procura primeiro o arquivo `phone`. Se ele não existir, usa o do computador. Sem nenhum arquivo, a página fica com o fundo padrão. Os nomes ficam em `wallpapers`, no `config.ts`.

A principal prefere vídeo. As duas outras preferem imagem, e é o que recomendo para o celular, que esquenta menos.

## Rádio

As músicas ficam em `public/` e tocam em sequência, voltando para a primeira no fim. O limite é de 10 faixas.

O arquivo de cada faixa vem da posição dela na playlist: a primeira linha toca `music-1.mp3`, a segunda `music-2.mp3`, e assim por diante.

Para adicionar uma música, coloque o arquivo em `public/` e acrescente uma linha em `playlist`:

```ts
playlist: [
  { title: 'Primeira música', artist: 'Artista', cover: '/cover-1.jpg' },
  { title: 'Segunda música', artist: 'Artista' },
],
```

`artist` e `cover` são opcionais. Sem `cover`, o player mostra um ícone de nota. Um arquivo que não existir é pulado sozinho.

Entre uma faixa e outra o volume desce nos últimos 3 segundos, fica um instante em silêncio e a próxima sobe desde o zero em 2,5 segundos. Os tempos ficam no topo de `src/audio.ts`.

## Páginas extras

A seta ao lado dos ícones de tecnologia abre a página de projetos quando é arrastada para a esquerda. Passando de 60% do caminho ela completa sozinha, antes disso volta ao lugar. A seta de baixo, arrastada para cima, abre a segunda página com a animação de livro, e solta antes de 45% ela também volta. As duas ainda não têm conteúdo e o texto fica em `index.html`. Esc ou o botão voltar fecham.

No celular o layout é outro: tudo cabe numa tela, o player vira uma barra embaixo, a seta de projetos fica no canto superior direito e as telas pequenas usam sempre o modo leve (sem blur, partículas nem brilhos animados).

## Rodar e publicar

```bash
npm install
npm run dev
```

Na Vercel basta importar o repositório. Ela detecta o Vite sozinha.
