// Conversational prompts.
//
// This file has NO server imports, so it is safe to import from both client
// components (the Legacy Guide demo) and server code (the daily-reflection cron).
//
// Two registers live here:
//   1. CONVERSATIONAL_PROMPTS — 40 low-barrier, sensory, routine-based prompts
//      for owners who feel they have nothing important to say. Used to carry a
//      new archive owner toward their first 10 deposits (pre-Echo Layer) without
//      ever making them feel like they are failing a test. The English text is
//      the base; CONVERSATIONAL_PROMPT_TRANSLATIONS holds localized versions.
//   2. DEMO_PROMPTS — the warm prompt set the in-browser demo reads aloud, each
//      tagged with a cognitive dimension and scored in real time.

// ── 1. Conversational register (low-barrier onboarding) ──────────────────────

export type ConversationalPrompt = {
  id:     string
  prompt: string
}

export const CONVERSATIONAL_PROMPTS: ConversationalPrompt[] = [
  { id: 'home-smell',         prompt: 'What did your home smell like when you were a child?' },
  { id: 'meal-no-recipe',     prompt: 'Tell me about a meal you made so many times you stopped needing a recipe.' },
  { id: 'unnoticed-habit',    prompt: 'What is something small you do every day that no one would notice if you stopped?' },
  { id: 'young-sunday',       prompt: 'Describe what a normal Sunday looked like when your children were young.' },
  { id: 'fear-was-nothing',   prompt: 'What is something you were afraid of that turned out to be nothing?' },
  { id: 'familiar-stranger',  prompt: 'Tell me about a person you saw regularly but never really knew, like a neighbor or a shopkeeper.' },
  { id: 'sound-elsewhere',    prompt: 'What is a sound that immediately takes you somewhere else?' },
  { id: 'best-weather',       prompt: 'Describe the best weather you have ever been in.' },
  { id: 'morning-drink',      prompt: 'What did you drink first thing in the morning, and how did you make it?' },
  { id: 'walk-eyes-closed',   prompt: 'Describe a walk you have taken so many times you could do it with your eyes closed.' },
  { id: 'kitchen-window',     prompt: 'What could you see from the window of a kitchen you spent a lot of time in?' },
  { id: 'handwriting',        prompt: 'What does your handwriting look like, and has it changed over the years?' },
  { id: 'song-by-heart',      prompt: 'What is a song you know every word to without trying?' },
  { id: 'weekday-lunch',      prompt: 'What did you usually eat for lunch on an ordinary workday?' },
  { id: 'childhood-shoes',    prompt: 'What kind of shoes did you wear as a kid, and where did they take you?' },
  { id: 'comfort-spot',       prompt: 'Where in your home do you sit when you want to feel settled?' },
  { id: 'background-noise',   prompt: 'What was usually playing in the background at home, on the radio or the television?' },
  { id: 'seasonal-chore',     prompt: 'What is a small task you only do at a certain time of year?' },
  { id: 'borrowed-saying',    prompt: 'What is a phrase you picked up from someone and still say today?' },
  { id: 'quiet-hour',         prompt: 'What time of day is quietest for you, and what do you do with it?' },
  { id: 'kitchen-staple',     prompt: 'What is something you always keep in the kitchen, no matter what?' },
  { id: 'weather-day',        prompt: 'What is a kind of weather that brings a specific day back to you?' },
  { id: 'hands-busy',         prompt: 'What do your hands do when they are busy and your mind wanders?' },
  { id: 'walls-windows',      prompt: 'What sounds could you hear through the walls or windows where you grew up?' },
  { id: 'first-job-smell',    prompt: 'What did your first job smell like?' },
  { id: 'old-mug',            prompt: 'Describe a cup or mug you have used for years.' },
  { id: 'before-bed',         prompt: 'What did the last hour before bed look like in your house?' },
  { id: 'back-way',           prompt: 'What is a shortcut or back way you take that most people do not know about?' },
  { id: 'weekend-breakfast',  prompt: 'What did weekend breakfast look like when you were younger?' },
  { id: 'familiar-drive',     prompt: 'Describe a drive you have made hundreds of times.' },
  { id: 'small-fix',          prompt: 'What is something around the house you have learned to fix yourself?' },
  { id: 'season-smell',       prompt: 'What is a smell that tells you a season has changed?' },
  { id: 'waiting-place',      prompt: 'Where is a place you have spent a lot of time waiting?' },
  { id: 'your-chair',         prompt: 'Is there a chair or a seat that everyone knows is yours?' },
  { id: 'morning-light',      prompt: 'What does the light look like in your home early in the morning?' },
  { id: 'accidental-collection', prompt: 'What is something small you have ended up collecting without meaning to?' },
  { id: 'familiar-voice',     prompt: 'Whose voice could you recognize instantly, even in a crowd?' },
  { id: 'weekly-errand',      prompt: 'What is an errand you run on the same day most weeks?' },
  { id: 'rain-on-roof',       prompt: 'What does rain sound like on the roof of a place you have lived?' },
  { id: 'ordinary-good-day',  prompt: 'Describe an ordinary day that you would happily live again.' },
]

// Localized versions of the register, keyed by language then prompt id. English
// is the base (above) and the fallback for any missing entry. Languages match
// the daily-reflection cron's supported set: zh, yue, ja, es, ko, vi, tl.
export const CONVERSATIONAL_PROMPT_TRANSLATIONS: Record<string, Record<string, string>> = {
  zh: {
    'home-smell':            '您小时候，家里是什么气味？',
    'meal-no-recipe':        '说说一道您做过很多次、已经不需要看食谱的菜。',
    'unnoticed-habit':       '您每天都会做的一件小事，如果不做了也没人会注意到的，是什么？',
    'young-sunday':          '孩子还小的时候，普通的星期天是什么样子的？',
    'fear-was-nothing':      '有什么您曾经害怕的事，后来发现根本没什么？',
    'familiar-stranger':     '说说一个您常常见到、却从未真正认识的人，比如邻居或店主。',
    'sound-elsewhere':       '有什么声音，一听到就立刻把您带到另一个地方？',
    'best-weather':          '说说您经历过最好的天气。',
    'morning-drink':         '您早上起来第一件事会喝什么？是怎么准备的？',
    'walk-eyes-closed':      '说说一条您走过无数次、闭着眼睛都能走的路。',
    'kitchen-window':        '在您常待的那个厨房，从窗户能看到什么？',
    'handwriting':           '您的字写得怎么样？这些年有变化吗？',
    'song-by-heart':         '有哪首歌，您不用刻意去记就会唱每一句？',
    'weekday-lunch':         '在普通的工作日，您午饭通常吃什么？',
    'childhood-shoes':       '小时候您穿什么样的鞋？它们带您去过哪里？',
    'comfort-spot':          '家里哪个位置，是您想安静下来时会坐的地方？',
    'background-noise':      '在家里，背景通常放着什么声音，收音机还是电视？',
    'seasonal-chore':        '有什么小事，是您只在一年中某个时候才做的？',
    'borrowed-saying':       '有什么话，是您从别人那里学来、到今天还在说的？',
    'quiet-hour':            '一天里哪个时候对您来说最安静？那段时间您会做什么？',
    'kitchen-staple':        '厨房里有什么东西，是您无论如何都会备着的？',
    'weather-day':           '有什么样的天气，会把某一个特定的日子带回到您眼前？',
    'hands-busy':            '当您的手忙着、思绪却飘走的时候，手会在做什么？',
    'walls-windows':         '在您长大的地方，透过墙壁或窗户能听到什么声音？',
    'first-job-smell':       '您的第一份工作，是什么气味？',
    'old-mug':               '说说一个您用了很多年的杯子。',
    'before-bed':            '在您家里，睡前的最后一个小时是什么样子的？',
    'back-way':              '有什么近路或小路，是大多数人都不知道、您却会走的？',
    'weekend-breakfast':     '您年轻时，周末的早餐是什么样子的？',
    'familiar-drive':        '说说一段您开过几百次的车程。',
    'small-fix':             '家里有什么东西，是您自己学会修的？',
    'season-smell':          '有什么气味，一闻到就知道季节变了？',
    'waiting-place':         '有哪个地方，是您花了很多时间在那里等待的？',
    'your-chair':            '有没有一把椅子或一个座位，是大家都知道属于您的？',
    'morning-light':         '清晨，您家里的光线是什么样子的？',
    'accidental-collection': '有什么小东西，是您不知不觉就收集起来的？',
    'familiar-voice':        '谁的声音，您在人群里也能立刻认出来？',
    'weekly-errand':         '有什么事情，是您几乎每周都在同一天去办的？',
    'rain-on-roof':          '在您住过的地方，雨打在屋顶上是什么声音？',
    'ordinary-good-day':     '说说一个您愿意再过一次的普通日子。',
  },
  yue: {
    'home-smell':            '你細個嘅時候，屋企係咩氣味？',
    'meal-no-recipe':        '講吓一道你煮過好多次、已經唔使睇食譜嘅餸。',
    'unnoticed-habit':       '你每日都會做嘅一件小事，就算唔做都冇人會察覺嘅，係咩？',
    'young-sunday':          '仔女仲細嘅時候，普通嘅星期日係點樣過嘅？',
    'fear-was-nothing':      '有啲咩嘢你以前驚過，後尾先發現根本冇嘢？',
    'familiar-stranger':     '講吓一個你成日見到、但從來冇真正認識嘅人，好似鄰居或者舖頭老闆咁。',
    'sound-elsewhere':       '有咩聲音，一聽到就即刻將你帶去另一個地方？',
    'best-weather':          '講吓你試過最好嘅天氣。',
    'morning-drink':         '你朝早起身第一件事會飲咩？係點整嘅？',
    'walk-eyes-closed':      '講吓一條你行過無數次、閉埋眼都行得到嘅路。',
    'kitchen-window':        '喺你成日留嘅嗰個廚房，由窗口望出去見到啲咩？',
    'handwriting':           '你寫字寫成點？呢啲年有冇變過？',
    'song-by-heart':         '有邊首歌，你唔使刻意記都識唱每一句？',
    'weekday-lunch':         '普通返工日，你晏晝通常食咩？',
    'childhood-shoes':       '細個你著咩鞋？對鞋帶你去過邊度？',
    'comfort-spot':          '屋企邊個位，係你想靜落嚟嘅時候會坐嘅？',
    'background-noise':      '喺屋企，背景通常播緊咩聲，收音機定電視？',
    'seasonal-chore':        '有咩小事，係你淨係喺一年入面某個時候先會做嘅？',
    'borrowed-saying':       '有咩說話，係你由人哋嗰度學返嚟、到今日仲講緊嘅？',
    'quiet-hour':            '一日入面邊個時候對你嚟講最靜？嗰段時間你會做咩？',
    'kitchen-staple':        '廚房入面有咩嘢，係你點都會擺定喺度嘅？',
    'weather-day':           '有咩天氣，會將某一個特別嘅日子帶返你眼前？',
    'hands-busy':            '當你對手忙緊、個心又飄走咗嘅時候，對手會做緊咩？',
    'walls-windows':         '喺你大個嘅地方，隔住道牆或者窗，你聽到啲咩聲？',
    'first-job-smell':       '你第一份工，係咩氣味？',
    'old-mug':               '講吓一個你用咗好多年嘅杯。',
    'before-bed':            '喺你屋企，瞓覺前最後嗰個鐘係點樣過嘅？',
    'back-way':              '有咩捷徑或者後巷，係大部分人都唔知、你卻會行嘅？',
    'weekend-breakfast':     '你後生嗰陣，週末早餐係點樣嘅？',
    'familiar-drive':        '講吓一段你揸過幾百次嘅車程。',
    'small-fix':             '屋企有咩嘢，係你自己學識整返嘅？',
    'season-smell':          '有咩氣味，一聞到就知道轉咗季？',
    'waiting-place':         '有邊個地方，係你喺度等過好耐嘅？',
    'your-chair':            '有冇一張凳或者一個位，係大家都知道係你嘅？',
    'morning-light':         '一朝早，你屋企嘅光線係點樣嘅？',
    'accidental-collection': '有咩細嘢，係你唔知唔覺咁儲落嚟嘅？',
    'familiar-voice':        '邊個嘅聲音，你喺人群入面都即刻認得出？',
    'weekly-errand':         '有咩嘢，係你差唔多每個禮拜都喺同一日去做嘅？',
    'rain-on-roof':          '喺你住過嘅地方，雨打喺屋頂上面係咩聲？',
    'ordinary-good-day':     '講吓一個你願意再過多次嘅普通日子。',
  },
  ja: {
    'home-smell':            '子どもの頃、あなたの家はどんな匂いがしましたか。',
    'meal-no-recipe':        '何度も作って、もうレシピがいらなくなった料理について教えてください。',
    'unnoticed-habit':       '毎日しているけれど、やめても誰も気づかないような小さなことは何ですか。',
    'young-sunday':          'お子さんがまだ小さかった頃、ふつうの日曜日はどんな様子でしたか。',
    'fear-was-nothing':      'こわいと思っていたのに、実際は何でもなかったことは何ですか。',
    'familiar-stranger':     'よく見かけていたけれど、本当には知らなかった人について教えてください。たとえば近所の人やお店の人などです。',
    'sound-elsewhere':       '聞いた瞬間に、どこか別の場所へ連れて行ってくれる音は何ですか。',
    'best-weather':          'これまでで一番よかった天気について教えてください。',
    'morning-drink':         '朝いちばんに飲んでいたものは何ですか。どうやって用意していましたか。',
    'walk-eyes-closed':      '何度も歩いて、目をつぶってでも歩けるような道について教えてください。',
    'kitchen-window':        'よく過ごした台所の窓からは、何が見えましたか。',
    'handwriting':           'あなたの字はどんな字ですか。長い年月で変わりましたか。',
    'song-by-heart':         '覚えようとしなくても、全部の歌詞を知っている歌は何ですか。',
    'weekday-lunch':         'ふつうの仕事の日、お昼によく食べていたものは何ですか。',
    'childhood-shoes':       '子どもの頃はどんな靴をはいていましたか。その靴でどこへ行きましたか。',
    'comfort-spot':          '落ち着きたいとき、家のどこに座りますか。',
    'background-noise':      '家ではいつも、ラジオやテレビなど、何が流れていましたか。',
    'seasonal-chore':        '一年のある時期にだけする、小さな用事は何ですか。',
    'borrowed-saying':       '誰かから受け継いで、今でも言っている言いまわしは何ですか。',
    'quiet-hour':            '一日のうちで一番静かなのはいつですか。その時間に何をしていますか。',
    'kitchen-staple':        'どんなときでも台所に欠かさず置いているものは何ですか。',
    'weather-day':           'ある特定の日を思い出させる天気は、どんな天気ですか。',
    'hands-busy':            '手が動いていて、心がよそへ向かっているとき、あなたの手は何をしていますか。',
    'walls-windows':         '育った場所では、壁や窓ごしにどんな音が聞こえましたか。',
    'first-job-smell':       '最初の仕事は、どんな匂いがしましたか。',
    'old-mug':               '何年も使っているカップやマグについて教えてください。',
    'before-bed':            'あなたの家で、寝る前の最後の一時間はどんな様子でしたか。',
    'back-way':              'ほとんどの人が知らない、あなたが通る近道や裏道はありますか。',
    'weekend-breakfast':     '若い頃、週末の朝ごはんはどんな様子でしたか。',
    'familiar-drive':        '何百回も運転したことのある道のりについて教えてください。',
    'small-fix':             '家の中で、自分で直せるようになったものは何ですか。',
    'season-smell':          '季節が変わったと教えてくれる匂いは何ですか。',
    'waiting-place':         'たくさんの時間を待って過ごした場所はどこですか。',
    'your-chair':            'みんながあなたの席だと分かっている椅子や席はありますか。',
    'morning-light':         '朝早く、あなたの家の光はどんなふうに見えますか。',
    'accidental-collection': 'そのつもりはなかったのに、いつのまにか集まっていた小さなものは何ですか。',
    'familiar-voice':        '人ごみの中でも、すぐに分かる声は誰の声ですか。',
    'weekly-errand':         'ほとんど毎週、同じ曜日にする用事は何ですか。',
    'rain-on-roof':          '住んでいた場所で、屋根に当たる雨はどんな音がしましたか。',
    'ordinary-good-day':     'もう一度過ごしたいと思える、ふつうの一日について教えてください。',
  },
  es: {
    'home-smell':            '¿A qué olía tu casa cuando eras niño?',
    'meal-no-recipe':        'Cuéntame sobre una comida que preparaste tantas veces que dejaste de necesitar la receta.',
    'unnoticed-habit':       '¿Qué cosa pequeña haces cada día que nadie notaría si dejaras de hacerla?',
    'young-sunday':          'Describe cómo era un domingo normal cuando tus hijos eran pequeños.',
    'fear-was-nothing':      '¿Qué es algo que te daba miedo y que al final resultó no ser nada?',
    'familiar-stranger':     'Cuéntame sobre una persona que veías a menudo pero que nunca llegaste a conocer de verdad, como un vecino o un tendero.',
    'sound-elsewhere':       '¿Qué sonido te lleva de inmediato a otro lugar?',
    'best-weather':          'Describe el mejor clima en el que has estado.',
    'morning-drink':         '¿Qué bebías a primera hora de la mañana, y cómo lo preparabas?',
    'walk-eyes-closed':      'Describe un camino que has recorrido tantas veces que podrías hacerlo con los ojos cerrados.',
    'kitchen-window':        '¿Qué se veía desde la ventana de una cocina donde pasaste mucho tiempo?',
    'handwriting':           '¿Cómo es tu letra, y ha cambiado con los años?',
    'song-by-heart':         '¿Qué canción te sabes de memoria sin proponértelo?',
    'weekday-lunch':         '¿Qué solías comer al mediodía en un día normal de trabajo?',
    'childhood-shoes':       '¿Qué tipo de zapatos usabas de niño, y a dónde te llevaron?',
    'comfort-spot':          '¿En qué lugar de tu casa te sientas cuando quieres sentirte tranquilo?',
    'background-noise':      '¿Qué solía sonar de fondo en casa, la radio o la televisión?',
    'seasonal-chore':        '¿Qué tarea pequeña haces solo en cierta época del año?',
    'borrowed-saying':       '¿Qué frase aprendiste de alguien y sigues diciendo hoy?',
    'quiet-hour':            '¿Qué momento del día es el más tranquilo para ti, y qué haces con él?',
    'kitchen-staple':        '¿Qué tienes siempre en la cocina, pase lo que pase?',
    'weather-day':           '¿Qué tipo de clima te trae de vuelta un día en particular?',
    'hands-busy':            '¿Qué hacen tus manos cuando están ocupadas y tu mente se va a otra parte?',
    'walls-windows':         '¿Qué sonidos se oían a través de las paredes o las ventanas donde creciste?',
    'first-job-smell':       '¿A qué olía tu primer trabajo?',
    'old-mug':               'Describe una taza que has usado durante años.',
    'before-bed':            '¿Cómo era la última hora antes de dormir en tu casa?',
    'back-way':              '¿Qué atajo o camino de atrás tomas que casi nadie conoce?',
    'weekend-breakfast':     '¿Cómo era el desayuno de fin de semana cuando eras más joven?',
    'familiar-drive':        'Describe un trayecto en coche que has hecho cientos de veces.',
    'small-fix':             '¿Qué cosa de la casa has aprendido a arreglar tú mismo?',
    'season-smell':          '¿Qué olor te avisa de que ha cambiado la estación?',
    'waiting-place':         '¿En qué lugar has pasado mucho tiempo esperando?',
    'your-chair':            '¿Hay una silla o un asiento que todos saben que es tuyo?',
    'morning-light':         '¿Cómo es la luz en tu casa temprano por la mañana?',
    'accidental-collection': '¿Qué cosa pequeña has terminado coleccionando sin proponértelo?',
    'familiar-voice':        '¿Qué voz reconocerías al instante, incluso entre una multitud?',
    'weekly-errand':         '¿Qué mandado haces casi siempre el mismo día de la semana?',
    'rain-on-roof':          '¿Qué sonido hace la lluvia en el techo de un lugar donde has vivido?',
    'ordinary-good-day':     'Describe un día corriente que vivirías de nuevo con gusto.',
  },
  ko: {
    'home-smell':            '어릴 때 살던 집에서는 어떤 냄새가 났나요?',
    'meal-no-recipe':        '너무 여러 번 만들어서 더 이상 조리법이 필요 없어진 음식에 대해 이야기해 주세요.',
    'unnoticed-habit':       '매일 하지만 그만둬도 아무도 모를 만한 작은 일은 무엇인가요?',
    'young-sunday':          '자녀가 어렸을 때 평범한 일요일은 어떤 모습이었나요?',
    'fear-was-nothing':      '두려워했지만 막상 별것 아니었던 일은 무엇인가요?',
    'familiar-stranger':     '자주 마주쳤지만 제대로 알지는 못했던 사람에 대해 이야기해 주세요. 이웃이나 가게 주인 같은 사람이요.',
    'sound-elsewhere':       '듣는 순간 다른 곳으로 데려가는 소리는 무엇인가요?',
    'best-weather':          '지금까지 경험한 가장 좋은 날씨에 대해 이야기해 주세요.',
    'morning-drink':         '아침에 일어나 가장 먼저 무엇을 마셨고, 어떻게 준비했나요?',
    'walk-eyes-closed':      '너무 여러 번 걸어서 눈을 감고도 걸을 수 있는 길에 대해 이야기해 주세요.',
    'kitchen-window':        '오래 머물던 부엌의 창문으로는 무엇이 보였나요?',
    'handwriting':           '당신의 글씨는 어떤 모습이고, 세월이 지나면서 달라졌나요?',
    'song-by-heart':         '애써 외우지 않아도 모든 가사를 아는 노래는 무엇인가요?',
    'weekday-lunch':         '평범한 근무일에 점심으로는 주로 무엇을 드셨나요?',
    'childhood-shoes':       '어릴 때 어떤 신발을 신었고, 그 신발은 당신을 어디로 데려갔나요?',
    'comfort-spot':          '마음을 가라앉히고 싶을 때 집 안 어디에 앉나요?',
    'background-noise':      '집에서는 라디오나 텔레비전 등 보통 무엇이 흘러나왔나요?',
    'seasonal-chore':        '일 년 중 특정한 때에만 하는 작은 일은 무엇인가요?',
    'borrowed-saying':       '누군가에게서 배워 지금도 쓰는 말은 무엇인가요?',
    'quiet-hour':            '하루 중 가장 조용한 때는 언제이고, 그 시간에 무엇을 하나요?',
    'kitchen-staple':        '무슨 일이 있어도 부엌에 늘 두는 것은 무엇인가요?',
    'weather-day':           '특정한 하루를 떠오르게 하는 날씨는 어떤 날씨인가요?',
    'hands-busy':            '손은 바쁜데 마음은 다른 데 가 있을 때, 당신의 손은 무엇을 하고 있나요?',
    'walls-windows':         '자란 곳에서는 벽이나 창문 너머로 어떤 소리가 들렸나요?',
    'first-job-smell':       '당신의 첫 직장에서는 어떤 냄새가 났나요?',
    'old-mug':               '여러 해 동안 써 온 컵에 대해 이야기해 주세요.',
    'before-bed':            '당신의 집에서 잠들기 전 마지막 한 시간은 어떤 모습이었나요?',
    'back-way':              '대부분의 사람은 모르지만 당신은 다니는 지름길이나 뒷길이 있나요?',
    'weekend-breakfast':     '젊었을 때 주말 아침 식사는 어떤 모습이었나요?',
    'familiar-drive':        '수백 번 운전해 본 길에 대해 이야기해 주세요.',
    'small-fix':             '집안일 중에 스스로 고칠 줄 알게 된 것은 무엇인가요?',
    'season-smell':          '계절이 바뀐 것을 알려 주는 냄새는 무엇인가요?',
    'waiting-place':         '오랜 시간 기다리며 보낸 곳은 어디인가요?',
    'your-chair':            '모두가 당신의 자리라고 아는 의자나 자리가 있나요?',
    'morning-light':         '이른 아침, 당신의 집에 드는 빛은 어떤 모습인가요?',
    'accidental-collection': '그럴 생각이 없었는데 어느새 모으게 된 작은 것은 무엇인가요?',
    'familiar-voice':        '사람들 속에서도 단번에 알아볼 수 있는 목소리는 누구의 목소리인가요?',
    'weekly-errand':         '거의 매주 같은 요일에 하는 볼일은 무엇인가요?',
    'rain-on-roof':          '당신이 살던 곳에서 지붕에 떨어지는 빗소리는 어떤 소리였나요?',
    'ordinary-good-day':     '기꺼이 다시 살아 보고 싶은 평범한 하루에 대해 이야기해 주세요.',
  },
  vi: {
    'home-smell':            'Hồi bạn còn nhỏ, nhà của bạn có mùi như thế nào?',
    'meal-no-recipe':        'Hãy kể về một món ăn bạn nấu nhiều lần đến mức không còn cần công thức nữa.',
    'unnoticed-habit':       'Có điều nhỏ nào bạn làm mỗi ngày mà nếu bạn ngừng lại thì cũng không ai để ý không?',
    'young-sunday':          'Hãy tả một ngày Chủ nhật bình thường khi các con của bạn còn nhỏ.',
    'fear-was-nothing':      'Có điều gì bạn từng sợ nhưng hóa ra chẳng có gì đáng sợ không?',
    'familiar-stranger':     'Hãy kể về một người bạn thường gặp nhưng chưa bao giờ thật sự quen, như một người hàng xóm hay một người bán hàng.',
    'sound-elsewhere':       'Có âm thanh nào vừa nghe là đưa bạn đến một nơi khác ngay lập tức không?',
    'best-weather':          'Hãy tả kiểu thời tiết đẹp nhất mà bạn từng được trải qua.',
    'morning-drink':         'Buổi sáng vừa thức dậy bạn thường uống gì, và bạn pha nó ra sao?',
    'walk-eyes-closed':      'Hãy tả một con đường bạn đã đi nhiều lần đến mức nhắm mắt cũng đi được.',
    'kitchen-window':        'Từ cửa sổ của căn bếp mà bạn hay ở, bạn nhìn thấy gì?',
    'handwriting':           'Chữ viết tay của bạn trông như thế nào, và nó có thay đổi theo năm tháng không?',
    'song-by-heart':         'Có bài hát nào bạn thuộc từng lời mà không cần cố nhớ không?',
    'weekday-lunch':         'Vào một ngày làm việc bình thường, bạn thường ăn trưa món gì?',
    'childhood-shoes':       'Hồi nhỏ bạn mang loại giày dép nào, và chúng đã đưa bạn đến những đâu?',
    'comfort-spot':          'Trong nhà, bạn hay ngồi ở chỗ nào khi muốn thấy bình yên?',
    'background-noise':      'Ở nhà, thường có âm thanh gì vang lên trong nền, radio hay tivi?',
    'seasonal-chore':        'Có việc nhỏ nào bạn chỉ làm vào một thời điểm nhất định trong năm không?',
    'borrowed-saying':       'Có câu nói nào bạn học được từ ai đó và đến nay vẫn còn nói không?',
    'quiet-hour':            'Thời điểm nào trong ngày là yên tĩnh nhất với bạn, và bạn làm gì với khoảng thời gian đó?',
    'kitchen-staple':        'Có thứ gì bạn luôn để sẵn trong bếp, dù thế nào đi nữa không?',
    'weather-day':           'Có kiểu thời tiết nào đưa một ngày cụ thể trở về với bạn không?',
    'hands-busy':            'Khi tay bạn bận rộn còn tâm trí thì lang thang, đôi tay bạn đang làm gì?',
    'walls-windows':         'Ở nơi bạn lớn lên, bạn nghe thấy những âm thanh gì qua tường hay cửa sổ?',
    'first-job-smell':       'Công việc đầu tiên của bạn có mùi như thế nào?',
    'old-mug':               'Hãy tả một cái ly hay cái cốc bạn đã dùng trong nhiều năm.',
    'before-bed':            'Ở nhà bạn, một tiếng đồng hồ cuối cùng trước khi đi ngủ trông như thế nào?',
    'back-way':              'Có lối tắt hay đường sau nào bạn hay đi mà hầu hết mọi người không biết không?',
    'weekend-breakfast':     'Hồi bạn còn trẻ, bữa sáng cuối tuần trông như thế nào?',
    'familiar-drive':        'Hãy tả một chặng đường bạn đã lái xe hàng trăm lần.',
    'small-fix':             'Có thứ gì trong nhà bạn đã tự học cách sửa lấy không?',
    'season-smell':          'Có mùi nào báo cho bạn biết mùa đã thay đổi không?',
    'waiting-place':         'Có nơi nào bạn đã dành nhiều thời gian để chờ đợi không?',
    'your-chair':            'Có cái ghế hay chỗ ngồi nào mà ai cũng biết là của bạn không?',
    'morning-light':         'Sáng sớm, ánh sáng trong nhà bạn trông như thế nào?',
    'accidental-collection': 'Có thứ nhỏ nào bạn vô tình sưu tầm mà không hề có ý định không?',
    'familiar-voice':        'Giọng của ai mà bạn có thể nhận ra ngay, dù giữa đám đông?',
    'weekly-errand':         'Có việc vặt nào bạn hầu như tuần nào cũng làm vào cùng một ngày không?',
    'rain-on-roof':          'Ở nơi bạn từng sống, mưa rơi trên mái nhà nghe như thế nào?',
    'ordinary-good-day':     'Hãy tả một ngày bình thường mà bạn sẵn lòng sống lại.',
  },
  tl: {
    'home-smell':            'Noong bata ka, anong amoy ng bahay mo?',
    'meal-no-recipe':        'Ikuwento mo ang isang pagkaing niluto mo nang napakadalas kaya hindi mo na kailangan ng resipe.',
    'unnoticed-habit':       'Ano ang maliit na bagay na ginagawa mo araw-araw na walang makakapansin kung tumigil ka?',
    'young-sunday':          'Ilarawan mo kung ano ang hitsura ng karaniwang Linggo noong maliliit pa ang mga anak mo.',
    'fear-was-nothing':      'Ano ang isang bagay na kinatakutan mo na pala-palang wala namang dapat ikatakot?',
    'familiar-stranger':     'Ikuwento mo ang isang taong madalas mong nakikita ngunit hindi mo talaga nakilala, tulad ng isang kapitbahay o tindero.',
    'sound-elsewhere':       'Ano ang tunog na agad kang dinadala sa ibang lugar?',
    'best-weather':          'Ilarawan mo ang pinakamagandang panahon na naranasan mo.',
    'morning-drink':         'Ano ang iniinom mo sa umpisa ng umaga, at paano mo ito inihahanda?',
    'walk-eyes-closed':      'Ilarawan mo ang isang daan na nalakaran mo nang napakadalas kaya kaya mo itong lakarin nang nakapikit.',
    'kitchen-window':        'Ano ang nakikita mo mula sa bintana ng kusinang madalas mong pinaglalagian?',
    'handwriting':           'Ano ang hitsura ng sulat-kamay mo, at nagbago ba ito sa paglipas ng mga taon?',
    'song-by-heart':         'Ano ang kantang alam mo ang bawat salita nang hindi mo sinusubukang tandaan?',
    'weekday-lunch':         'Ano ang madalas mong kinakain sa tanghalian sa karaniwang araw ng trabaho?',
    'childhood-shoes':       'Anong uri ng sapatos ang isinusuot mo noong bata ka, at saan ka nito dinala?',
    'comfort-spot':          'Saang bahagi ng bahay ka umuupo kapag gusto mong huminahon?',
    'background-noise':      'Ano ang kadalasang tumutugtog sa bahay, ang radyo o ang telebisyon?',
    'seasonal-chore':        'Ano ang maliit na gawaing ginagawa mo lamang sa isang panahon ng taon?',
    'borrowed-saying':       'Ano ang katagang natutunan mo sa iba na sinasabi mo pa rin hanggang ngayon?',
    'quiet-hour':            'Anong oras ng araw ang pinakatahimik para sa iyo, at ano ang ginagawa mo rito?',
    'kitchen-staple':        'Ano ang bagay na lagi mong itinatago sa kusina, kahit ano pa ang mangyari?',
    'weather-day':           'Anong uri ng panahon ang nagbabalik sa iyo ng isang tiyak na araw?',
    'hands-busy':            'Ano ang ginagawa ng mga kamay mo kapag abala ang mga ito ngunit naglalakbay ang isip mo?',
    'walls-windows':         'Anong mga tunog ang naririnig mo sa pader o bintana kung saan ka lumaki?',
    'first-job-smell':       'Anong amoy ng unang trabaho mo?',
    'old-mug':               'Ilarawan mo ang isang tasang ginamit mo nang maraming taon.',
    'before-bed':            'Ano ang hitsura ng huling oras bago matulog sa bahay mo?',
    'back-way':              'Ano ang shortcut o likurang daan na dinadaanan mo na hindi alam ng karamihan?',
    'weekend-breakfast':     'Ano ang hitsura ng almusal tuwing katapusan ng linggo noong mas bata ka?',
    'familiar-drive':        'Ilarawan mo ang isang biyaheng minaneho mo nang daan-daang beses.',
    'small-fix':             'Ano ang bagay sa bahay na natutunan mong ayusin nang mag-isa?',
    'season-smell':          'Anong amoy ang nagsasabi sa iyo na nagbago na ang panahon?',
    'waiting-place':         'Saang lugar ka gumugol ng maraming oras sa paghihintay?',
    'your-chair':            'May upuan ba o pwesto na alam ng lahat na sa iyo?',
    'morning-light':         'Ano ang hitsura ng liwanag sa bahay mo tuwing maagang umaga?',
    'accidental-collection': 'Ano ang maliit na bagay na napalikom mo nang hindi mo sinasadya?',
    'familiar-voice':        'Kaninong boses ang agad mong makikilala, kahit nasa gitna ng maraming tao?',
    'weekly-errand':         'Ano ang lakad na ginagawa mo halos tuwing pareho ang araw bawat linggo?',
    'rain-on-roof':          'Ano ang tunog ng ulan sa bubong ng isang lugar na tinirhan mo?',
    'ordinary-good-day':     'Ilarawan mo ang isang karaniwang araw na maligaya mo sanang ulitin.',
  },
}

function localizedPromptText(p: ConversationalPrompt, lang: string): string {
  if (lang === 'en') return p.prompt
  return CONVERSATIONAL_PROMPT_TRANSLATIONS[lang]?.[p.id] ?? p.prompt
}

// Pick a conversational prompt for a given day, in the owner's language. Prefers
// one the owner has not already been asked (pass the prompt texts they have been
// served in `exclude`, in the same language), rotating by `seed` (typically
// day-of-year) so the prompt changes day to day. Falls back to plain rotation
// once every prompt has been seen, and to English when a translation is missing.
export function getConversationalPrompt(
  seed:    number,
  exclude: Set<string> = new Set(),
  lang     = 'en',
): ConversationalPrompt {
  const n      = CONVERSATIONAL_PROMPTS.length
  const offset = ((Math.floor(seed) % n) + n) % n
  for (let i = 0; i < n; i++) {
    const p    = CONVERSATIONAL_PROMPTS[(offset + i) % n]
    const text = localizedPromptText(p, lang)
    if (!exclude.has(text)) return { id: p.id, prompt: text }
  }
  const fallback = CONVERSATIONAL_PROMPTS[offset]
  return { id: fallback.id, prompt: localizedPromptText(fallback, lang) }
}

// ── 2. Demo prompts (in-browser Legacy Guide demo) ───────────────────────────
//
// Warm/sensory/ordinary prompts read aloud to a prospect, each carrying a
// cognitive dimension so the demo can show a real-time score and dimension tag.

export type DemoPrompt = {
  id:        string
  text:      string
  dimension: string
}

export const DEMO_PROMPTS: DemoPrompt[] = [
  { id: 'proud_decision',    dimension: 'decision_making',     text: "Think of a decision you're proud of, even a small one. What was going on in your head while you made it?" },
  { id: 'taught_you_carry',  dimension: 'wisdom_and_lessons',   text: 'Who taught you something you still carry with you? What did they actually do or say?' },
  { id: 'your_signature',    dimension: 'personal_signature',   text: 'What is a small, ordinary thing you do, a habit or a phrase, that anyone who knows you would recognize as yours?' },
  { id: 'hard_conversation', dimension: 'communication_style',  text: 'When you have to tell someone something hard, how do you usually go about it?' },
  { id: 'what_you_believe',  dimension: 'core_values',          text: 'What is something you believe that you would want the people who come after you to understand?' },
]

// Human-readable labels for the cognitive dimensions each demo prompt maps to.
export const DIMENSION_LABELS: Record<string, string> = {
  early_life:                'Early Life',
  core_values:              'Core Values',
  approach_to_people:       'How You Read People',
  professional_philosophy:  'Work and Purpose',
  wisdom_and_lessons:       'Wisdom and Lessons',
  defining_experiences:     'Defining Experiences',
  fears_and_vulnerabilities:'What You Carry',
  approach_to_money:        'Money and Security',
  relationship_to_family:   'Family',
  decision_making:          'How You Decide',
  personal_signature:       "What's Distinctly You",
  communication_style:      'How You Communicate',
}

export function dimensionLabel(dimension: string): string {
  return DIMENSION_LABELS[dimension] ?? dimension.replace(/_/g, ' ')
}

// Select `count` demo prompts for a single run, preferring distinct dimensions
// so the questions feel varied. Shuffled per call so each demo is fresh.
export function pickDemoPrompts(count = 5): DemoPrompt[] {
  const pool = [...DEMO_PROMPTS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const picked:   DemoPrompt[] = []
  const usedDims = new Set<string>()

  for (const p of pool) {
    if (picked.length >= count) break
    if (usedDims.has(p.dimension)) continue
    usedDims.add(p.dimension)
    picked.push(p)
  }
  // Top up if we ran short on distinct dimensions.
  for (const p of pool) {
    if (picked.length >= count) break
    if (!picked.includes(p)) picked.push(p)
  }

  return picked.slice(0, count)
}

// Instant, heuristic quality score (0-100) for a spoken answer the Guide is
// typing in real time. No API call: it reads length, sensory/concrete detail,
// and specificity, so the number climbs as the prospect gives a richer answer.
export function scoreAnswer(text: string): number {
  const trimmed = (text || '').trim()
  if (!trimmed) return 0

  const words = trimmed.split(/\s+/).filter(Boolean)
  const wc    = words.length

  // Length: up to 50 points, reaching full weight around 55 words.
  const lengthScore = Math.min(wc / 55, 1) * 50

  // Sensory and concrete detail: up to 28 points.
  const sensoryRe = /\b(saw|see|seen|heard|hear|sound|sounds|smell|smelled|scent|taste|tasted|touch|felt|feel|warm|cold|cool|bright|dark|loud|quiet|soft|rough|hands|kitchen|morning|evening|night|rain|sun|light|window|door|table|garden|street|road|voice|laugh|laughed|music|color|colour)\b/gi
  const sensoryHits = (trimmed.match(sensoryRe) ?? []).length
  const sensoryScore = Math.min(sensoryHits / 4, 1) * 28

  // Specificity: numbers, years, and proper nouns (capitalized mid-sentence).
  const numbers = (trimmed.match(/\b\d{1,4}\b/g) ?? []).length
  const propers = (trimmed.match(/(?!^)\b[A-Z][a-z]{2,}\b/g) ?? []).length
  const specificity = Math.min((numbers + propers) / 3, 1) * 22

  return Math.max(0, Math.min(100, Math.round(lengthScore + sensoryScore + specificity)))
}
