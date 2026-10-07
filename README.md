# nero-developer

Site pessoal em TypeScript e CSS, feito com Vite. Mostra o perfil do Discord em tempo real (avatar, nome, status e RPCs), toca uma rádio com player e aponta para as redes.

## Configuração

Tudo fica em `src/config.ts`: ID do Discord, wallpaper, playlist, links e a coluna de tecnologias.

- O status vem do Lanyard. Entre em https://discord.gg/lanyard com a sua conta.
- Troque `SEU_USUARIO` nos links do LinkedIn e do Patreon.

## Wallpaper

Coloque o vídeo em `public/wallpaper.mp4`. O caminho é definido em `wallpaper` no `config.ts`.

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

## Rodar e publicar

```bash
npm install
npm run dev
```

Na Vercel basta importar o repositório. Ela detecta o Vite sozinha.
