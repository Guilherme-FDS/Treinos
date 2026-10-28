// METs do Compendium of Physical Activities (Ainsworth et al., 2011; Adult Compendium 2024).
// `code` = código do Compendium mais próximo (pode repetir); `slug` = chave única (source_ref). Atividades por ritmo têm um único MET (repetido nos 3 níveis).

export const COMPENDIUM_URL = "https://pacompendium.com/adult-compendium/";

export type CompendiumEntry = {
  slug: string;
  code: string;
  name: string;
  type: "musculacao" | "cardio" | "esporte" | "mobilidade";
  muscle_group?: string;
  equipment?: string;
  light?: number;
  moderate?: number;
  vigorous?: number;
  met?: number; // único (ritmo definido)
};

export const COMPENDIUM: CompendiumEntry[] = [
  // Musculação (sessão genérica) — 02054 leve / 02052 moderada / 02050 vigorosa
  { slug: "musculacao-sessao", code: "02050", name: "Musculação (sessão)", type: "musculacao", light: 3.5, moderate: 5.0, vigorous: 6.0 },
  { slug: "treino-em-circuito", code: "02040", name: "Treino em circuito", type: "musculacao", moderate: 4.3, vigorous: 8.0 },
  { slug: "calistenia-flexoes-abdominais-polichinelos", code: "02020", name: "Calistenia (flexões, abdominais, polichinelos)", type: "musculacao", light: 2.8, moderate: 3.8, vigorous: 8.0 },
  { slug: "hiit-treino-intervalado-de-alta-intensidade", code: "02040", name: "HIIT / treino intervalado de alta intensidade", type: "cardio", moderate: 7.0, vigorous: 8.0 },

  // Corrida por ritmo (min/km)
  { slug: "corrida-6-4-km-h-9-20-km", code: "12027", name: "Corrida 6,4 km/h (9:20/km)", type: "cardio", met: 6.0 },
  { slug: "corrida-8-0-km-h-7-30-km", code: "12030", name: "Corrida 8,0 km/h (7:30/km)", type: "cardio", met: 8.3 },
  { slug: "corrida-8-4-km-h-7-10-km", code: "12040", name: "Corrida 8,4 km/h (7:10/km)", type: "cardio", met: 9.0 },
  { slug: "corrida-9-7-km-h-6-13-km", code: "12050", name: "Corrida 9,7 km/h (6:13/km)", type: "cardio", met: 9.8 },
  { slug: "corrida-10-8-km-h-5-35-km", code: "12060", name: "Corrida 10,8 km/h (5:35/km)", type: "cardio", met: 10.5 },
  { slug: "corrida-11-3-km-h-5-20-km", code: "12070", name: "Corrida 11,3 km/h (5:20/km)", type: "cardio", met: 11.0 },
  { slug: "corrida-12-1-km-h-4-58-km", code: "12080", name: "Corrida 12,1 km/h (4:58/km)", type: "cardio", met: 11.5 },
  { slug: "corrida-12-9-km-h-4-40-km", code: "12090", name: "Corrida 12,9 km/h (4:40/km)", type: "cardio", met: 11.8 },
  { slug: "corrida-13-8-km-h-4-20-km", code: "12100", name: "Corrida 13,8 km/h (4:20/km)", type: "cardio", met: 12.3 },
  { slug: "corrida-14-5-km-h-4-08-km", code: "12110", name: "Corrida 14,5 km/h (4:08/km)", type: "cardio", met: 12.8 },
  { slug: "corrida-16-1-km-h-3-44-km", code: "12120", name: "Corrida 16,1 km/h (3:44/km)", type: "cardio", met: 14.5 },
  { slug: "corrida-17-7-km-h-3-23-km", code: "12130", name: "Corrida 17,7 km/h (3:23/km)", type: "cardio", met: 16.0 },
  { slug: "corrida-trote-geral", code: "12020", name: "Corrida (trote, geral)", type: "cardio", met: 7.0 },
  { slug: "corrida-em-esteira-geral", code: "12140", name: "Corrida em esteira (geral)", type: "cardio", met: 9.0 },

  // Caminhada
  { slug: "caminhada-3-2-km-h-lenta", code: "17152", name: "Caminhada 3,2 km/h (lenta)", type: "cardio", met: 2.8 },
  { slug: "caminhada-4-0-km-h", code: "17170", name: "Caminhada 4,0 km/h", type: "cardio", met: 3.0 },
  { slug: "caminhada-4-8-km-h-moderada", code: "17190", name: "Caminhada 4,8 km/h (moderada)", type: "cardio", met: 3.5 },
  { slug: "caminhada-5-6-km-h-rapida", code: "17200", name: "Caminhada 5,6 km/h (rápida)", type: "cardio", met: 4.3 },
  { slug: "caminhada-6-4-km-h-muito-rapida", code: "17220", name: "Caminhada 6,4 km/h (muito rápida)", type: "cardio", met: 5.0 },
  { slug: "caminhada-7-2-km-h-marcha", code: "17230", name: "Caminhada 7,2 km/h (marcha)", type: "cardio", met: 7.0 },
  { slug: "trilha-caminhada-em-subida", code: "17080", name: "Trilha / caminhada em subida", type: "cardio", met: 6.0 },
  { slug: "subir-escadas", code: "17133", name: "Subir escadas", type: "cardio", moderate: 4.0, vigorous: 8.8 },

  // Bicicleta
  { slug: "bicicleta-passeio-16-km-h", code: "01010", name: "Bicicleta (passeio, < 16 km/h)", type: "cardio", met: 4.0 },
  { slug: "bicicleta-16-19-km-h-leve", code: "01030", name: "Bicicleta 16–19 km/h (leve)", type: "cardio", met: 6.8 },
  { slug: "bicicleta-19-22-km-h-moderada", code: "01040", name: "Bicicleta 19–22 km/h (moderada)", type: "cardio", met: 8.0 },
  { slug: "bicicleta-22-25-km-h-vigorosa", code: "01050", name: "Bicicleta 22–25 km/h (vigorosa)", type: "cardio", met: 10.0 },
  { slug: "bicicleta-ergometrica", code: "02010", name: "Bicicleta ergométrica", type: "cardio", light: 3.5, moderate: 6.8, vigorous: 8.8 },
  { slug: "spinning-bike-indoor-aula", code: "02015", name: "Spinning / bike indoor (aula)", type: "cardio", met: 8.5 },

  // Outros aparelhos de cardio
  { slug: "eliptico", code: "02048", name: "Elíptico", type: "cardio", moderate: 5.0 },
  { slug: "remo-ergometro", code: "02070", name: "Remo ergômetro", type: "cardio", light: 4.8, moderate: 7.0, vigorous: 8.5 },
  { slug: "simulador-de-escada-stepmill", code: "02065", name: "Simulador de escada (stepmill)", type: "cardio", met: 9.0 },
  { slug: "pular-corda", code: "15551", name: "Pular corda", type: "cardio", light: 8.8, moderate: 11.8, vigorous: 12.3 },
  { slug: "danca-aerobica-ginastica-aerobica", code: "03015", name: "Dança aeróbica / ginástica aeróbica", type: "cardio", light: 5.0, moderate: 7.3, vigorous: 9.5 },

  // Natação
  { slug: "natacao-crawl-leve-moderada", code: "18310", name: "Natação crawl (leve/moderada)", type: "cardio", light: 5.8, moderate: 8.3, vigorous: 9.8 },
  { slug: "natacao-peito", code: "18250", name: "Natação peito", type: "cardio", moderate: 5.3, vigorous: 10.3 },
  { slug: "natacao-costas", code: "18200", name: "Natação costas", type: "cardio", moderate: 4.8, vigorous: 9.5 },
  { slug: "natacao-recreativa", code: "18350", name: "Natação recreativa", type: "cardio", met: 6.0 },
  { slug: "hidroginastica", code: "18365", name: "Hidroginástica", type: "cardio", met: 5.3 },

  // Esportes
  { slug: "futebol", code: "15605", name: "Futebol", type: "esporte", moderate: 7.0, vigorous: 10.0 },
  { slug: "futsal-futebol-society", code: "15610", name: "Futsal / futebol society", type: "esporte", moderate: 7.0, vigorous: 10.0 },
  { slug: "basquete", code: "15055", name: "Basquete", type: "esporte", light: 4.5, moderate: 6.5, vigorous: 8.0 },
  { slug: "volei", code: "15711", name: "Vôlei", type: "esporte", light: 3.0, moderate: 4.0, vigorous: 6.0 },
  { slug: "volei-de-praia", code: "15725", name: "Vôlei de praia", type: "esporte", met: 8.0 },
  { slug: "tenis", code: "15675", name: "Tênis", type: "esporte", light: 6.0, moderate: 7.3, vigorous: 8.0 },
  { slug: "handebol", code: "15530", name: "Handebol", type: "esporte", met: 12.0 },
  { slug: "artes-marciais-judo-karate-jiu-jitsu", code: "15430", name: "Artes marciais (judô, karatê, jiu-jitsu)", type: "esporte", light: 5.3, moderate: 7.0, vigorous: 10.3 },
  { slug: "boxe-saco-de-pancada", code: "15100", name: "Boxe (saco de pancada)", type: "esporte", moderate: 5.5, vigorous: 7.8 },
  { slug: "boxe-sparring-luta", code: "15110", name: "Boxe (sparring/luta)", type: "esporte", met: 12.8 },
  { slug: "badminton", code: "15020", name: "Badminton", type: "esporte", moderate: 5.5, vigorous: 7.0 },
  { slug: "skate", code: "15570", name: "Skate", type: "esporte", met: 5.0 },
  { slug: "escalada-muro-de-escalada", code: "17360", name: "Escalada (muro de escalada)", type: "esporte", moderate: 5.8, vigorous: 7.5 },

  // Mobilidade
  { slug: "yoga-hatha", code: "02150", name: "Yoga (hatha)", type: "mobilidade", light: 2.5, moderate: 3.0, vigorous: 4.0 },
  { slug: "pilates", code: "02105", name: "Pilates", type: "mobilidade", light: 3.0, moderate: 3.5 },
  { slug: "alongamento", code: "02101", name: "Alongamento", type: "mobilidade", light: 2.3, moderate: 2.8 },
];
