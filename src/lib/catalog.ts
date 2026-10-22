export type CuratedSong = {
  lrclibId: number;
  title: string;
  artist: string;
};

export type CatalogGroup = {
  id: string;
  title: string;
  songs: CuratedSong[];
};

// LRCLIB record ids checked against the live API. Lyrics are not stored here.
export const groups: CatalogGroup[] = [
  {
    id: "ataide",
    title: "Ataíde e Alexandre",
    songs: [
      { lrclibId: 12462064, title: "Deus Me Livre", artist: "Ataíde e Alexandre" },
      { lrclibId: 39107167, title: "Laço Aberto", artist: "Ataíde e Alexandre" },
      { lrclibId: 15637641, title: "Rosas e Versos", artist: "Ataíde e Alexandre" },
      { lrclibId: 28690283, title: "Estrada do Amor", artist: "Ataíde e Alexandre" },
      { lrclibId: 13645529, title: "Você Marcou pra Mim", artist: "Ataíde e Alexandre" },
      { lrclibId: 35468655, title: "Doces Palavras", artist: "Ataíde e Alexandre" },
    ],
  },
  {
    id: "teixeirinha",
    title: "Teixeirinha",
    songs: [
      { lrclibId: 12890061, title: "Coração de Luto", artist: "Teixeirinha" },
      { lrclibId: 33740571, title: "Gaúcho de Passo Fundo", artist: "Teixeirinha" },
      {
        lrclibId: 35402373,
        title: "Querência Amada",
        artist: "Teixeirinha e Mary Terezinha",
      },
      { lrclibId: 18428287, title: "Canarinho Cantador", artist: "Teixeirinha" },
      { lrclibId: 13113917, title: "Dorme Angelita", artist: "Teixeirinha" },
    ],
  },
  {
    id: "moda",
    title: "Moda de viola",
    songs: [
      {
        lrclibId: 35721234,
        title: "Pagode em Brasília",
        artist: "Tião Carreiro e Pardinho",
      },
      {
        lrclibId: 34063397,
        title: "Boi Soberano",
        artist: "Tião Carreiro e Pardinho",
      },
      {
        lrclibId: 30695538,
        title: "Rio de Lágrimas",
        artist: "Tião Carreiro e Pardinho",
      },
      { lrclibId: 34974609, title: "Chico Mineiro", artist: "Tonico e Tinoco" },
      { lrclibId: 28171520, title: "Tristeza do Jeca", artist: "Tonico e Tinoco" },
      { lrclibId: 32213737, title: "Mula Preta", artist: "Tonico e Tinoco" },
    ],
  },
  {
    id: "gauchas",
    title: "Gaúchas",
    songs: [
      { lrclibId: 18198212, title: "Prenda Minha", artist: "Caetano Veloso" },
      { lrclibId: 24754409, title: "Canto Alegretense", artist: "Os Serranos" },
      {
        lrclibId: 31712948,
        title: "Negrinho do Pastoreio",
        artist: "Luiz Carlos Borges",
      },
    ],
  },
];

export function findCurated(id: number): CuratedSong | undefined {
  for (const group of groups) {
    const song = group.songs.find((item) => item.lrclibId === id);
    if (song) return song;
  }
  return undefined;
}
