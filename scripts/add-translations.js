const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  zh: {
    tagline: { quote_1: '您从未真正离去', quote_2: '只要您留下了', quote_3: '足够多的自己。', scroll: '开始' },
    door: { families_loss: '为面临失去的家庭', intentional: '为有意建设的人', forward: '为有远见的人' },
    legacy: {
      eyebrow: '为那些有意建设的人', headline_1: '您的孙子们会认识', headline_2: '两个版本中的一个。',
      body_1: '一个是被告知的版本。', body_2: '或是您留给他们的版本。',
      body_3: '大多数人一生都在建造事物。', body_4: '很少有人花时间确保这些事物能够延续。',
      body_5: 'Basalith 适合这两种人。', body_6: '但对早起步的人效果最好。',
      cta: '在不得不之前开始'
    },
    closing: {
      eyebrow: '为有远见的人', headline_1: '世界上最复杂的 AI', headline_2: '可以学习像您一样思考。',
      sub: '问题是，当您还有机会时，您是否给了它足够多的内容来学习。',
      tagline_1: '您从未真正离去', tagline_2: '只要您留下了', tagline_3: '足够多的自己。',
      cta: '开始', price: '庄园档案起价 $2,500'
    }
  },
  yue: {
    tagline: { quote_1: '你從未真正離去', quote_2: '只要你留低咗', quote_3: '足夠嘅自己。', scroll: '開始' },
    door: { families_loss: '為面對失去嘅家庭', intentional: '為有心建設嘅人', forward: '為有遠見嘅人' },
    legacy: {
      eyebrow: '為有心建設嘅人', headline_1: '你嘅孫子將會認識', headline_2: '兩個版本中嘅一個。',
      body_1: '一個係被告知嘅版本。', body_2: '或係你留俾佢哋嘅版本。',
      body_3: '大多數人一生都在建造事物。', body_4: '好少人花時間確保呢啲事物可以延續。',
      body_5: 'Basalith 適合呢兩種人。', body_6: '但對早開始嘅人效果最好。',
      cta: '喺必須之前開始'
    },
    closing: {
      eyebrow: '為有遠見嘅人', headline_1: '世界上最複雜嘅 AI', headline_2: '可以學習像你咁思考。',
      sub: '問題係，當你仲有機會嘅時候，你係咪俾咗佢足夠多嘅內容嚟學習。',
      tagline_1: '你從未真正離去', tagline_2: '只要你留低咗', tagline_3: '足夠嘅自己。',
      cta: '開始', price: '庄園檔案起價 $2,500'
    }
  },
  ja: {
    tagline: { quote_1: '真に逝った人はいません', quote_2: '十分な自分を', quote_3: '残しておけば。', scroll: '始める' },
    door: { families_loss: '喪失に直面するご家族へ', intentional: '意図的に築く方へ', forward: '先を見据えた方へ' },
    legacy: {
      eyebrow: '意図的に築く方へ', headline_1: 'お孫さんは、あなたの', headline_2: '二つのうちのどちらかの姿を知ることになります。',
      body_1: '伝えられた姿。', body_2: 'あるいは、あなたが遺した姿。',
      body_3: 'ほとんどの人は、生涯をかけて何かを築きます。',
      body_4: 'それが長く続くよう時間をかける人は、ほとんどいません。',
      body_5: 'Basalithは、どちらの方にも。', body_6: 'ただ、早く始めた方により効果的です。',
      cta: 'やむを得なくなる前に始める'
    },
    closing: {
      eyebrow: '先を見据えた方へ', headline_1: '世界で最も洗練されたAIは', headline_2: 'あなたのように考えることを学べます。',
      sub: '問題は、まだ時間があるうちに、十分な素材を与えられるかどうかです。',
      tagline_1: '真に逝った人はいません', tagline_2: '十分な自分を', tagline_3: '残しておけば。',
      cta: '始める', price: 'エステートは $2,500 から'
    }
  },
  es: {
    tagline: { quote_1: 'Nunca se va del todo', quote_2: 'si deja suficiente', quote_3: 'de usted mismo.', scroll: 'Comenzar' },
    door: { families_loss: 'Para familias que enfrentan una pérdida', intentional: 'Para constructores intencionales', forward: 'Para quienes piensan en el futuro' },
    legacy: {
      eyebrow: 'Para quienes construyen con intención', headline_1: 'Sus nietos conocerán', headline_2: 'una de dos versiones suyas.',
      body_1: 'La que les contaron.', body_2: 'O la que usted les dejó.',
      body_3: 'La mayoría de las personas pasan su vida construyendo cosas.',
      body_4: 'Muy pocos dedican tiempo a asegurarse de que perduren.',
      body_5: 'Basalith es para ambos tipos de personas.', body_6: 'Pero funciona mejor para quienes empiezan temprano.',
      cta: 'Empiece antes de tener que hacerlo'
    },
    closing: {
      eyebrow: 'Para quienes piensan en el futuro', headline_1: 'La IA más sofisticada del mundo', headline_2: 'puede aprender a pensar como usted.',
      sub: 'La pregunta es si le da suficiente material para aprender mientras todavía puede.',
      tagline_1: 'Nunca se va del todo', tagline_2: 'si deja suficiente', tagline_3: 'de usted mismo.',
      cta: 'Comenzar', price: 'El Estate comienza en $2,500'
    }
  },
  vi: {
    tagline: { quote_1: 'Bạn không bao giờ thực sự rời đi', quote_2: 'nếu bạn để lại đủ', quote_3: 'chính mình.', scroll: 'Bắt đầu' },
    door: { families_loss: 'Dành cho các gia đình đang đối mặt với mất mát', intentional: 'Dành cho những người xây dựng có chủ đích', forward: 'Dành cho những người nhìn xa' },
    legacy: {
      eyebrow: 'Dành cho những người xây dựng có chủ đích', headline_1: 'Các cháu của bạn sẽ biết đến', headline_2: 'một trong hai phiên bản của bạn.',
      body_1: 'Phiên bản được kể lại cho họ nghe.', body_2: 'Hoặc phiên bản bạn để lại cho họ.',
      body_3: 'Hầu hết mọi người dành cả đời để xây dựng những thứ.',
      body_4: 'Rất ít người dành thời gian để đảm bảo những thứ đó tồn tại lâu dài.',
      body_5: 'Basalith dành cho cả hai loại người.', body_6: 'Nhưng hoạt động tốt nhất với những người bắt đầu sớm.',
      cta: 'Bắt đầu trước khi phải làm vậy'
    },
    closing: {
      eyebrow: 'Dành cho những người nhìn xa', headline_1: 'AI tinh vi nhất thế giới', headline_2: 'có thể học cách suy nghĩ như bạn.',
      sub: 'Câu hỏi là liệu bạn có cho nó đủ thứ để học trong khi bạn còn có thể không.',
      tagline_1: 'Bạn không bao giờ thực sự rời đi', tagline_2: 'nếu bạn để lại đủ', tagline_3: 'chính mình.',
      cta: 'Bắt đầu', price: 'Estate bắt đầu từ $2,500'
    }
  },
  tl: {
    tagline: { quote_1: 'Hindi ka talaga aalis', quote_2: 'kung mag-iiwan ka ng sapat na', quote_3: 'bahagi ng iyong sarili.', scroll: 'Simulan' },
    door: { families_loss: 'Para sa mga pamilyang nahaharap sa pagkawala', intentional: 'Para sa mga taong nagtatayo nang may layunin', forward: 'Para sa mga may malalim na pananaw' },
    legacy: {
      eyebrow: 'Para sa mga taong nagtatayo nang may layunin', headline_1: 'Malalaman ng iyong mga apo', headline_2: 'ang isa sa dalawang bersyon mo.',
      body_1: 'Ang sinabi sa kanila tungkol sa iyo.', body_2: 'O ang iniwan mo para sa kanila.',
      body_3: 'Karamihan sa mga tao ay gumastos ng buhay sa pagtatayo ng mga bagay.',
      body_4: 'Iilan lang ang gumagugol ng panahon upang matiyak na magtatagal ang mga ito.',
      body_5: 'Ang Basalith ay para sa dalawang uri ng tao.', body_6: 'Ngunit pinakamabuti para sa mga nagsisimula nang maaga.',
      cta: 'Magsimula bago mo kailanganin'
    },
    closing: {
      eyebrow: 'Para sa mga may malalim na pananaw', headline_1: 'Ang pinaka-sopistikadong AI sa mundo', headline_2: 'ay matututo na mag-isip tulad mo.',
      sub: 'Ang tanong ay kung bibigyan mo ito ng sapat para matuto habang maari ka pa.',
      tagline_1: 'Hindi ka talaga aalis', tagline_2: 'kung mag-iiwan ka ng sapat na', tagline_3: 'bahagi ng iyong sarili.',
      cta: 'Simulan', price: 'Nagsisimula ang Estate sa $2,500'
    }
  },
  ko: {
    tagline: { quote_1: '당신은 결코 진정으로 떠나지 않습니다', quote_2: '충분한 자신을', quote_3: '남겨두기만 한다면.', scroll: '시작하기' },
    door: { families_loss: '상실을 마주한 가족을 위해', intentional: '의도적으로 쌓아가는 분들을 위해', forward: '앞을 내다보는 분들을 위해' },
    legacy: {
      eyebrow: '의도적으로 쌓아가는 분들을 위해', headline_1: '당신의 손자녀들은', headline_2: '두 가지 버전 중 하나의 당신을 알게 됩니다.',
      body_1: '전해들은 버전.', body_2: '아니면 당신이 남긴 버전.',
      body_3: '대부분의 사람들은 평생 무언가를 쌓는 데 보냅니다.',
      body_4: '그것이 지속되도록 시간을 쏟는 사람은 극히 드뭅니다.',
      body_5: 'Basalith는 두 종류의 사람 모두를 위한 것입니다.', body_6: '하지만 일찍 시작하는 분에게 가장 효과적입니다.',
      cta: '어쩔 수 없게 되기 전에 시작하세요'
    },
    closing: {
      eyebrow: '앞을 내다보는 분들을 위해', headline_1: '세상에서 가장 정교한 AI는', headline_2: '당신처럼 생각하는 법을 배울 수 있습니다.',
      sub: '문제는 아직 할 수 있는 동안 충분한 자료를 남겨주느냐입니다.',
      tagline_1: '당신은 결코 진정으로 떠나지 않습니다', tagline_2: '충분한 자신을', tagline_3: '남겨두기만 한다면.',
      cta: '시작하기', price: 'Estate는 $2,500부터'
    }
  }
};

for (const [code, data] of Object.entries(TRANSLATIONS)) {
  const filePath = path.join(__dirname, '..', 'messages', code + '.json');
  const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.assign(obj, data);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(code + ': done');
}
console.log('All 7 files updated.');
