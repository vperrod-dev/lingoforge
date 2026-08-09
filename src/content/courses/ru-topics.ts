import type { VocabItem, Unit } from '../types'

/**
 * Themed practical vocabulary for real situations — travel, shopping, small talk, etc.
 * These carry the extra `literal` (etymology) and `note` (usage) fields used by the
 * Flashcards study mode. Merged into ruCourse.vocab / .units by ru.ts.
 */
export const topicVocab: VocabItem[] = [
  // --- Travelling ---
  { id: 't_puteshestvie', lemma: 'путешествие', translation: 'journey / trip', hint: 'put-i-shést-vi-ye', literal: 'a way-going', note: 'Root «путь» = path/way.' },
  { id: 't_aeroport', lemma: 'аэропорт', translation: 'airport', hint: 'a-e-ra-pórt' },
  { id: 't_samolyot', lemma: 'самолёт', translation: 'airplane', hint: 'sa-ma-lyót', literal: 'self-flyer', note: '«сам» self + «летать» to fly.' },
  { id: 't_poyezd', lemma: 'поезд', translation: 'train', hint: 'pó-yezt' },
  { id: 't_bilet', lemma: 'билет', translation: 'ticket', hint: 'bi-lyét' },
  { id: 't_pasport', lemma: 'паспорт', translation: 'passport', hint: 'pás-part' },
  { id: 't_bagazh', lemma: 'багаж', translation: 'luggage', hint: 'ba-gásh' },

  // --- Shopping ---
  { id: 't_pokupki', lemma: 'покупки', translation: 'shopping / purchases', hint: 'pa-kúp-ki' },
  { id: 't_kassa', lemma: 'касса', translation: 'checkout / cash desk', hint: 'kás-sa', note: 'Also the ticket office / box office.' },
  { id: 't_skidka', lemma: 'скидка', translation: 'discount', hint: 'skít-ka' },
  { id: 't_razmer', lemma: 'размер', translation: 'size', hint: 'raz-myér' },
  { id: 't_odezhda', lemma: 'одежда', translation: 'clothes', hint: 'a-dyézh-da' },
  { id: 't_podarok', lemma: 'подарок', translation: 'gift', hint: 'pa-dá-rak', literal: 'a giving', note: 'Root «дар» = gift; «подарить» = to give a gift.' },
  { id: 't_platit', lemma: 'платить', translation: 'to pay', hint: 'pla-tít', forms: ['плачу', 'платишь', 'платит'] },

  // --- Talking with friends ---
  { id: 't_kak_dela', lemma: 'как дела', translation: "how are you / how's it going", hint: 'kak di-lá', literal: 'how are [your] affairs', note: 'Casual greeting. «дела» = affairs.' },
  { id: 't_normalno', lemma: 'нормально', translation: 'fine / normal', hint: 'nar-mál-na', note: 'The standard reply to «как дела».' },
  { id: 't_klass', lemma: 'класс', translation: 'cool / awesome', hint: 'klass', note: 'Slang for "great!". Literally also means "class".' },
  { id: 't_davay', lemma: 'давай', translation: "come on / let's / (casual) bye", hint: 'da-váy', literal: 'give!', note: 'Imperative of «давать». Ultra-common filler.' },
  { id: 't_konechno', lemma: 'конечно', translation: 'of course', hint: 'ka-nyésh-na', note: '«ч» is pronounced "sh" here.' },
  { id: 't_pravda', lemma: 'правда', translation: 'true / really', hint: 'práv-da', note: '«Правда?» = "Really?".' },
  { id: 't_druzhba', lemma: 'дружба', translation: 'friendship', hint: 'drúzh-ba', literal: 'from «друг» (friend)' },

  // --- Restaurant / café ---
  { id: 't_menyu', lemma: 'меню', translation: 'menu', hint: 'mi-nyú' },
  { id: 't_ofitsiant', lemma: 'официант', translation: 'waiter', hint: 'a-fi-tsi-ánt' },
  { id: 't_schyot', lemma: 'счёт', translation: 'the bill / check', hint: 'shchyot', note: 'Also means "count / score".' },
  { id: 't_zakaz', lemma: 'заказ', translation: 'order', hint: 'za-kás' },
  { id: 't_stolik', lemma: 'столик', translation: 'table (at a café)', hint: 'stó-lik', literal: 'little table', note: 'Diminutive of «стол» (table).' },
  { id: 't_zavtrak', lemma: 'завтрак', translation: 'breakfast', hint: 'záft-rak', literal: 'the morning meal', note: 'Linked to «за-утра» / «завтра».' },
  { id: 't_uzhin', lemma: 'ужин', translation: 'dinner / supper', hint: 'ú-zhyn' },

  // --- Directions ---
  { id: 't_nalevo', lemma: 'налево', translation: 'to the left', hint: 'na-lyé-va' },
  { id: 't_napravo', lemma: 'направо', translation: 'to the right', hint: 'na-prá-va' },
  { id: 't_pryamo', lemma: 'прямо', translation: 'straight ahead', hint: 'pryá-ma', note: 'Also "directly / honestly".' },
  { id: 't_daleko', lemma: 'далеко', translation: 'far', hint: 'da-li-kó' },
  { id: 't_blizko', lemma: 'близко', translation: 'near / close', hint: 'blís-ka' },
  { id: 't_karta', lemma: 'карта', translation: 'map', hint: 'kár-ta', note: 'Also "playing card" or "bank card".' },
  { id: 't_ostanovka', lemma: 'остановка', translation: '(bus) stop', hint: 'a-sta-nóf-ka', literal: 'a stopping', note: 'From «остановить» = to stop.' },

  // --- Hotel ---
  { id: 't_otel', lemma: 'отель', translation: 'hotel', hint: 'a-tél' },
  { id: 't_nomer', lemma: 'номер', translation: 'hotel room / number', hint: 'nó-mir', note: 'Same word for "room" and "number".' },
  { id: 't_klyuch', lemma: 'ключ', translation: 'key', hint: 'klyuch' },
  { id: 't_bronirovat', lemma: 'бронировать', translation: 'to book / reserve', hint: 'bra-ní-ra-vat' },
  { id: 't_dush', lemma: 'душ', translation: 'shower', hint: 'dush' },
  { id: 't_polotentse', lemma: 'полотенце', translation: 'towel', hint: 'pa-la-tyén-tse' },
  { id: 't_wifi', lemma: 'вай-фай', translation: 'wifi', hint: 'vay-fáy', note: 'Borrowed straight from English.' },

  // --- Health & emergency ---
  { id: 't_pomogite', lemma: 'помогите', translation: 'help!', hint: 'pa-ma-gí-tye', literal: 'help! (formal imperative)', note: 'What you shout in an emergency. «помочь» = to help.' },
  { id: 't_bolnitsa', lemma: 'больница', translation: 'hospital', hint: 'bal-ní-tsa', literal: 'place for the sick', note: 'Root «боль» = pain.' },
  { id: 't_apteka', lemma: 'аптека', translation: 'pharmacy', hint: 'ap-tyé-ka' },
  { id: 't_bolit', lemma: 'болит', translation: 'hurts', hint: 'ba-lít', note: '«У меня болит…» = "My … hurts".' },
  { id: 't_golova', lemma: 'голова', translation: 'head', hint: 'ga-la-vá' },
  { id: 't_lekarstvo', lemma: 'лекарство', translation: 'medicine', hint: 'li-kárst-va' },

  // --- Time & plans ---
  { id: 't_minuta', lemma: 'минута', translation: 'minute', hint: 'mi-nú-ta' },
  { id: 't_vstrecha', lemma: 'встреча', translation: 'meeting', hint: 'fstryé-cha', literal: 'an encounter', note: 'From «встретить» = to meet.' },
  { id: 't_svobodny', lemma: 'свободен', translation: 'free / available (m.)', hint: 'sva-bó-din', forms: ['свободна'] },
  { id: 't_zanyat', lemma: 'занят', translation: 'busy (m.)', hint: 'zá-nit', forms: ['занята'] },
  { id: 't_pozdno', lemma: 'поздно', translation: 'late', hint: 'póz-na' },
  { id: 't_rano', lemma: 'рано', translation: 'early', hint: 'rá-na' },
  { id: 't_plan', lemma: 'план', translation: 'plan', hint: 'plan' },
]

export const topicUnits: Unit[] = [
  {
    id: 'tt1',
    title: 'Topic: Travelling',
    description: 'Airports, trains, tickets and passports',
    level: 'A2',
    skills: [
      {
        id: 'tt1s1',
        title: 'On the move',
        icon: 'map-pin',
        lessons: [
          {
            id: 'tt1s1l1',
            title: 'Travelling',
            vocabIds: ['t_puteshestvie', 't_aeroport', 't_samolyot', 't_poyezd', 't_bilet', 't_pasport', 't_bagazh'],
            sentences: [
              { text: 'Где мой паспорт?', translation: 'Where is my passport?', vocabIds: ['gde', 'moy', 't_pasport'] },
              { text: 'Я хочу билет на поезд.', translation: 'I want a ticket for the train.', vocabIds: ['ya', 'khochu', 't_bilet', 't_poyezd'] },
              { text: 'Самолёт большой.', translation: 'The plane is big.', vocabIds: ['t_samolyot', 'bolshoy'] },
              { text: 'Это моё путешествие.', translation: 'This is my journey.', vocabIds: ['eto', 'moy', 't_puteshestvie'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tt2',
    title: 'Topic: Shopping',
    description: 'Prices, sizes, discounts and paying',
    level: 'A2',
    skills: [
      {
        id: 'tt2s1',
        title: 'At the shop',
        icon: 'package',
        lessons: [
          {
            id: 'tt2s1l1',
            title: 'Shopping',
            vocabIds: ['t_pokupki', 't_kassa', 't_skidka', 't_razmer', 't_odezhda', 't_podarok', 't_platit'],
            sentences: [
              { text: 'Где касса?', translation: 'Where is the checkout?', vocabIds: ['gde', 't_kassa'] },
              { text: 'Есть скидка?', translation: 'Is there a discount?', vocabIds: ['t_skidka'] },
              { text: 'Это подарок.', translation: 'This is a gift.', vocabIds: ['eto', 't_podarok'] },
              { text: 'Я хочу купить одежду.', translation: 'I want to buy clothes.', vocabIds: ['ya', 'khochu', 'kupit', 't_odezhda'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tt3',
    title: 'Topic: Talking with friends',
    description: 'Small talk, slang and everyday replies',
    level: 'A2',
    skills: [
      {
        id: 'tt3s1',
        title: 'Small talk',
        icon: 'message-circle',
        lessons: [
          {
            id: 'tt3s1l1',
            title: 'With friends',
            vocabIds: ['t_kak_dela', 't_normalno', 't_klass', 't_davay', 't_konechno', 't_pravda', 't_druzhba'],
            sentences: [
              { text: 'Привет! Как дела?', translation: 'Hi! How are you?', vocabIds: ['privet', 't_kak_dela'] },
              { text: 'Нормально, спасибо!', translation: 'Fine, thanks!', vocabIds: ['t_normalno', 'spasibo'] },
              { text: 'Это класс!', translation: 'This is cool!', vocabIds: ['eto', 't_klass'] },
              { text: 'Давай! Пока!', translation: 'Come on! Bye!', vocabIds: ['t_davay', 'poka'] },
              { text: 'Конечно, я знаю.', translation: 'Of course, I know.', vocabIds: ['t_konechno', 'ya', 'znayu'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tt4',
    title: 'Topic: At the restaurant',
    description: 'Menus, ordering, meals and the bill',
    level: 'A2',
    skills: [
      {
        id: 'tt4s1',
        title: 'Café & restaurant',
        icon: 'coffee',
        lessons: [
          {
            id: 'tt4s1l1',
            title: 'Eating out',
            vocabIds: ['t_menyu', 't_ofitsiant', 't_schyot', 't_zakaz', 't_stolik', 't_zavtrak', 't_uzhin'],
            sentences: [
              { text: 'Меню, пожалуйста.', translation: 'The menu, please.', vocabIds: ['t_menyu', 'pozhaluysta'] },
              { text: 'Можно счёт?', translation: 'May I have the bill?', vocabIds: ['mozhno', 't_schyot'] },
              { text: 'Официант! Меню, пожалуйста.', translation: 'Waiter! The menu, please.', vocabIds: ['t_ofitsiant', 't_menyu', 'pozhaluysta'] },
              { text: 'Где мой столик?', translation: 'Where is my table?', vocabIds: ['gde', 'moy', 't_stolik'] },
              { text: 'Завтрак вкусный.', translation: 'Breakfast is tasty.', vocabIds: ['t_zavtrak', 'vkusny'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tt5',
    title: 'Topic: Directions',
    description: 'Left, right, straight — finding your way',
    level: 'A2',
    skills: [
      {
        id: 'tt5s1',
        title: 'Getting around',
        icon: 'map-pin',
        lessons: [
          {
            id: 'tt5s1l1',
            title: 'Which way?',
            vocabIds: ['t_nalevo', 't_napravo', 't_pryamo', 't_daleko', 't_blizko', 't_karta', 't_ostanovka'],
            sentences: [
              { text: 'Иди прямо, потом налево.', translation: 'Go straight, then left.', vocabIds: ['idi', 't_pryamo', 'potom', 't_nalevo'] },
              { text: 'Метро далеко?', translation: 'Is the metro far?', vocabIds: ['metro', 't_daleko'] },
              { text: 'Нет, близко.', translation: 'No, close.', vocabIds: ['net', 't_blizko'] },
              { text: 'Магазин направо.', translation: 'The shop is on the right.', vocabIds: ['magazin', 't_napravo'] },
              { text: 'Где карта?', translation: 'Where is the map?', vocabIds: ['gde', 't_karta'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tt6',
    title: 'Topic: At the hotel',
    description: 'Rooms, keys, booking and wifi',
    level: 'A2',
    skills: [
      {
        id: 'tt6s1',
        title: 'Checking in',
        icon: 'home',
        lessons: [
          {
            id: 'tt6s1l1',
            title: 'The hotel',
            vocabIds: ['t_otel', 't_nomer', 't_klyuch', 't_bronirovat', 't_dush', 't_polotentse', 't_wifi'],
            sentences: [
              { text: 'Где мой номер?', translation: 'Where is my room?', vocabIds: ['gde', 'moy', 't_nomer'] },
              { text: 'Это ключ.', translation: 'This is the key.', vocabIds: ['eto', 't_klyuch'] },
              { text: 'Где душ?', translation: 'Where is the shower?', vocabIds: ['gde', 't_dush'] },
              { text: 'Можно полотенце?', translation: 'May I have a towel?', vocabIds: ['mozhno', 't_polotentse'] },
              { text: 'Здесь есть вай-фай?', translation: 'Is there wifi here?', vocabIds: ['zdes', 't_wifi'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tt7',
    title: 'Topic: Health & emergencies',
    description: 'Help, pharmacy, hospital, what hurts',
    level: 'A2',
    skills: [
      {
        id: 'tt7s1',
        title: 'When you need help',
        icon: 'users',
        lessons: [
          {
            id: 'tt7s1l1',
            title: 'Health',
            vocabIds: ['t_pomogite', 't_bolnitsa', 't_apteka', 't_bolit', 't_golova', 't_lekarstvo'],
            sentences: [
              { text: 'Помогите!', translation: 'Help!', vocabIds: ['t_pomogite'] },
              { text: 'Где больница?', translation: 'Where is the hospital?', vocabIds: ['gde', 't_bolnitsa'] },
              { text: 'У меня болит голова.', translation: 'My head hurts.', vocabIds: ['t_bolit', 't_golova'] },
              { text: 'Мне нужно лекарство.', translation: 'I need medicine.', vocabIds: ['mne', 'nuzhno', 't_lekarstvo'] },
              { text: 'Где аптека?', translation: 'Where is the pharmacy?', vocabIds: ['gde', 't_apteka'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tt8',
    title: 'Topic: Time & plans',
    description: 'Meetings, being free or busy, early or late',
    level: 'A2',
    skills: [
      {
        id: 'tt8s1',
        title: 'Making plans',
        icon: 'clock',
        lessons: [
          {
            id: 'tt8s1l1',
            title: 'Plans',
            vocabIds: ['t_minuta', 't_vstrecha', 't_svobodny', 't_zanyat', 't_pozdno', 't_rano', 't_plan'],
            sentences: [
              { text: 'У меня встреча.', translation: 'I have a meeting.', vocabIds: ['t_vstrecha'] },
              { text: 'Ты свободен завтра?', translation: 'Are you free tomorrow?', vocabIds: ['ty', 't_svobodny', 'zavtra'] },
              { text: 'Нет, я занят.', translation: "No, I'm busy.", vocabIds: ['net', 'ya', 't_zanyat'] },
              { text: 'Сейчас поздно.', translation: "It's late now.", vocabIds: ['seychas', 't_pozdno'] },
              { text: 'Какой план?', translation: "What's the plan?", vocabIds: ['kakoy', 't_plan'] },
            ],
          },
        ],
      },
    ],
  },
]
