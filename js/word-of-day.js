const WordOfDay = (function () {
  const COUNTRY_TITLE = {
    'Sweden': 'Scandi Says',
    'Denmark': 'I Hope You Dansk',
    'Norway': 'Fjord Wjords'
  };

  const WORDS = {
    'Sweden': [
      { word: 'Skål', pronunciation: 'skawl', definition: 'Cheers — said raising a glass before a drink.', use: 'Someone pours the aquavit at dinner and the whole table says "Skål!" together before drinking.' },
      { word: 'Fika', pronunciation: 'FEE-kah', definition: 'A coffee-and-pastry break, treated less as a snack and more as a small social institution.', use: '"Ska vi fika?" — shall we take a fika break? Said constantly, at all hours.' },
      { word: 'Lagom', pronunciation: 'LAH-gom', definition: 'Not too much, not too little — exactly the right amount. A whole cultural philosophy of moderation packed into one word.', use: 'Describing a portion size, a room temperature, or a work-life balance as "lagom."' },
      { word: 'Mysigt', pronunciation: 'MEW-sikt', definition: 'Cozy, snug, pleasant — the feeling of a warm café on a cold evening.', use: '"Vad mysigt!" said walking into a candlelit restaurant.' },
      { word: 'Tack', pronunciation: 'tahk', definition: 'Thanks — used constantly, and often doubled for emphasis.', use: '"Tack tack!" after someone goes out of their way to help.' },
      { word: 'Jättebra', pronunciation: 'YET-teh-brah', definition: 'Really great, awesome.', use: 'The honest answer when someone asks how the wedding was.' },
      { word: 'Smaklig måltid', pronunciation: 'SMAHK-lig MOAL-tid', definition: 'Enjoy your meal — said before digging in.', use: 'The Swedish equivalent of "bon appétit," said around the table before the first bite.' },
      { word: 'Hej då', pronunciation: 'hey daw', definition: 'Goodbye.', use: 'Leaving a shop, a café, or a very good party.' }
    ],
    'Denmark': [
      { word: 'Hygge', pronunciation: 'HOO-gah', definition: 'A cozy, contented feeling of togetherness — candles, blankets, good company, unhurried time.', use: 'A quiet dinner with friends and low lighting gets called "hyggeligt."' },
      { word: 'Skål', pronunciation: 'skawl', definition: 'Cheers — shared across all three Scandinavian languages, said raising a glass.', use: 'Before the first sip of a beer at Torvehallerne.' },
      { word: 'Tak', pronunciation: 'tahg', definition: 'Thanks.', use: 'The single most useful word in Danish — works almost everywhere on its own.' },
      { word: 'Velbekomme', pronunciation: 'vel-be-KOM-meh', definition: 'The host\'s reply to being thanked for the meal — roughly "may it do you good."', use: 'Said by whoever cooked, right after the table says thanks for the food.' },
      { word: 'Jo', pronunciation: 'yo', definition: 'A special "yes" used specifically to contradict a negative statement.', use: 'Someone says "you didn\'t book that restaurant" — you reply "Jo!" (yes I did).' },
      { word: 'Nej tak', pronunciation: 'nye tahg', definition: 'No thank you — the polite decline.', use: 'Turning down a second helping, or a street vendor\'s offer, without being rude.' },
      { word: 'Det var hyggeligt', pronunciation: 'day var HOO-guh-lee', definition: 'That was lovely / cozy — said after a nice visit or gathering.', use: 'Leaving Høst after dinner, thanking the table for the evening.' },
      { word: 'Undskyld', pronunciation: 'OON-skyul', definition: 'Excuse me / sorry — for getting past someone on Strøget or a minor bump.', use: 'Squeezing through the crowd on the pedestrian street.' }
    ],
    'Norway': [
      { word: 'Koselig', pronunciation: 'KOOSH-eh-lee', definition: 'Cozy, snug, pleasant — Norway\'s answer to Danish hygge.', use: 'A wood-fired sauna or a mountain cabin with the lights low gets called "koselig."' },
      { word: 'Skål', pronunciation: 'skawl', definition: 'Cheers — said raising a glass, shared across Scandinavia.', use: 'Before the first sip at Ægir Bryggeri.' },
      { word: 'Takk', pronunciation: 'tahk', definition: 'Thanks.', use: '"Takk skal du ha" — thank you very much, said to a guide or a host.' },
      { word: 'Tur', pronunciation: 'toor', definition: 'A trip or outing, especially into nature — hiking, walking, or a scenic ride.', use: '"Skal vi gå en tur?" — shall we go for a walk? Said before any fjord viewpoint.' },
      { word: 'Utepils', pronunciation: 'OO-teh-pilss', definition: 'Literally "outdoor beer" — specifically the pleasure of the first beer enjoyed outside once the weather turns nice.', use: 'A beer on the waterfront at Aker Brygge on a sunny evening.' },
      { word: 'Hei', pronunciation: 'hi', definition: 'Hi.', use: 'The all-purpose greeting, casual and constant.' },
      { word: 'Takk for sist', pronunciation: 'tahk for sist', definition: 'Literally "thanks for last time" — said when you next see someone you shared a good time with.', use: 'Running into someone from the Peace Center tour later in the trip.' },
      { word: 'Ja da', pronunciation: 'yah dah', definition: 'A cheerful, emphatic "yes, of course."', use: 'Answering "is it worth the walk up to Stegastein?"' }
    ]
  };

  function hashDateToIndex(dateKey, length) {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
      hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
    }
    return hash % length;
  }

  function effectiveCountry() {
    const days = TripData.itinerary.days;
    const today = todayAtMidnight();
    const first = parseISODate(days[0].date);
    const last = parseISODate(days[days.length - 1].date);
    let city;
    const activeDay = typeof findTodayDay === 'function' ? findTodayDay() : null;
    if (activeDay) city = activeDay.city;
    else if (today < first) city = days[0].city;
    else city = days[days.length - 1].city;
    return cityCountry(city) || 'Sweden';
  }

  function mount(container) {
    const country = effectiveCountry();
    const bank = WORDS[country];
    const title = COUNTRY_TITLE[country];
    const dateKey = todayAtMidnight().toISOString().slice(0, 10);
    let index = hashDateToIndex(dateKey + country, bank.length);

    function render() {
      const w = bank[index];
      container.innerHTML = `
        <div class="card">
          <h3 style="margin-top:0;">${title}</h3>
          <div class="word-of-day">
            <div class="wod-word">${w.word}</div>
            <div class="wod-pronunciation">/${w.pronunciation}/</div>
            <p class="item-notes">${w.definition}</p>
            <p class="wod-use"><strong>Use it:</strong> ${w.use}</p>
          </div>
          <button class="link-btn" id="wod-refresh-btn" style="cursor:pointer; background:none; border:none; padding:0;">🔄 Another word</button>
        </div>
      `;
      document.getElementById('wod-refresh-btn').addEventListener('click', () => {
        index = (index + 1) % bank.length;
        render();
      });
    }
    render();
  }

  return { mount };
})();

window.WordOfDay = WordOfDay;
