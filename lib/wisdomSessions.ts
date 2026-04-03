export type WisdomQuestion = {
  id:               string
  question:         string
  prompt:           string
  dimension_weight: number
}

export type WisdomSession = {
  title:             string
  intro:             string
  estimatedMinutes:  number
  questions:         WisdomQuestion[]
}

export const WISDOM_SESSIONS: Record<string, WisdomSession> = {

  professional_philosophy: {
    title: 'Professional Philosophy',
    intro: 'How you think about work, leadership, and building things. Five questions. Your answers go directly into your entity.',
    estimatedMinutes: 15,
    questions: [
      {
        id: 'pp_1',
        question: 'Think about the hardest professional decision you ever made. Not the biggest — the hardest. The one where you genuinely did not know what the right answer was. What was it and what did you do?',
        prompt: 'Take your time. Specific details matter more than a polished answer.',
        dimension_weight: 0.25,
      },
      {
        id: 'pp_2',
        question: 'What did that decision teach you about how you make hard decisions?',
        prompt: 'Not what you wish it had taught you. What it actually taught you.',
        dimension_weight: 0.20,
      },
      {
        id: 'pp_3',
        question: 'What do you believe about hard work that most people around you do not believe?',
        prompt: 'The thing you have learned from experience that sounds wrong until you have lived it.',
        dimension_weight: 0.20,
      },
      {
        id: 'pp_4',
        question: 'What is the most important thing you know about building something — a business, a team, a career — that took you more than ten years to truly understand?',
        prompt: 'The thing that compounds. The insight that changed everything.',
        dimension_weight: 0.20,
      },
      {
        id: 'pp_5',
        question: 'If your grandchildren came to you at the beginning of their careers and asked for the one thing you most wished someone had told you — what would you say?',
        prompt: 'Not general wisdom. The specific thing. In your actual words.',
        dimension_weight: 0.15,
      },
    ],
  },

  relationship_to_family: {
    title: 'Relationship to Family',
    intro: 'How you think about family, love, and belonging. The things your family knows about you and the things they do not.',
    estimatedMinutes: 20,
    questions: [
      {
        id: 'rf_1',
        question: 'Who in your family has shaped you most deeply — not who you love most, but who changed how you see the world?',
        prompt: 'Be specific. What did they do or say that changed something in you?',
        dimension_weight: 0.25,
      },
      {
        id: 'rf_2',
        question: 'What is something your family knows about you that you have never said out loud but they have understood anyway?',
        prompt: 'The thing that does not need words between you.',
        dimension_weight: 0.20,
      },
      {
        id: 'rf_3',
        question: 'What do you want your children to understand about your life that they do not currently understand?',
        prompt: 'Not what you want them to be proud of. What you want them to understand.',
        dimension_weight: 0.20,
      },
      {
        id: 'rf_4',
        question: 'What did your parents get right that you did not appreciate until you were older?',
        prompt: 'The thing that irritated you at the time and now you see clearly.',
        dimension_weight: 0.20,
      },
      {
        id: 'rf_5',
        question: 'What do you most want your grandchildren to know about what family meant to you?',
        prompt: 'Not the lesson. The feeling. What it actually meant.',
        dimension_weight: 0.15,
      },
    ],
  },

  core_values: {
    title: 'Core Values',
    intro: 'What you believe most deeply about how to live. Not the values you profess — the ones you actually live by when it costs you something.',
    estimatedMinutes: 15,
    questions: [
      {
        id: 'cv_1',
        question: 'Tell me about a time you did the right thing when it cost you something real — money, a relationship, an opportunity. What happened?',
        prompt: 'The specific situation. What it cost. Whether you regret it.',
        dimension_weight: 0.25,
      },
      {
        id: 'cv_2',
        question: 'What is something you believe is true about how to live that the people around you mostly disagree with?',
        prompt: 'The conviction that makes you the odd one out sometimes.',
        dimension_weight: 0.25,
      },
      {
        id: 'cv_3',
        question: 'What have you never been willing to compromise on — not because you were told not to, but because something in you would not allow it?',
        prompt: 'The line that has held across every version of your life.',
        dimension_weight: 0.20,
      },
      {
        id: 'cv_4',
        question: 'What value did you hold strongly when you were younger that you now see differently — not abandoned, but understood more completely?',
        prompt: 'How your beliefs have matured not just changed.',
        dimension_weight: 0.15,
      },
      {
        id: 'cv_5',
        question: 'If you could leave your grandchildren with one belief about how to live — one thing to hold onto when everything is hard — what would it be?',
        prompt: 'The bedrock. What has held for you.',
        dimension_weight: 0.15,
      },
    ],
  },

  approach_to_money: {
    title: 'Approach to Money',
    intro: 'What money actually means to you. Not what you are supposed to believe — what you have learned from actually living with it and without it.',
    estimatedMinutes: 15,
    questions: [
      {
        id: 'am_1',
        question: 'Tell me about the first time money felt real to you — not as an abstract concept but as something with actual weight in your life.',
        prompt: 'The specific moment. How old you were. What it meant.',
        dimension_weight: 0.25,
      },
      {
        id: 'am_2',
        question: 'What is the most important thing you know about money that you wish you had understood twenty years earlier?',
        prompt: 'The insight that came from experience not from reading about it.',
        dimension_weight: 0.25,
      },
      {
        id: 'am_3',
        question: 'What do you actually believe money is for — not the answer that sounds right, the answer that reflects how you actually live?',
        prompt: 'Your real philosophy. Not the professed one.',
        dimension_weight: 0.20,
      },
      {
        id: 'am_4',
        question: 'What financial mistake taught you the most — what happened and what did it change about how you think?',
        prompt: 'Specific situation. Real numbers if you are comfortable. What shifted.',
        dimension_weight: 0.15,
      },
      {
        id: 'am_5',
        question: 'What do you want your grandchildren to understand about money that most people never figure out?',
        prompt: 'The thing that took you decades to learn. The cheat code.',
        dimension_weight: 0.15,
      },
    ],
  },

  approach_to_people: {
    title: 'Approach to People',
    intro: 'How you read people, build trust, and understand what makes someone worth knowing.',
    estimatedMinutes: 15,
    questions: [
      {
        id: 'ap_1',
        question: 'How do you know — quickly, before much time has passed — whether someone is trustworthy? What do you look for?',
        prompt: 'The specific signals. The things you notice that others often miss.',
        dimension_weight: 0.25,
      },
      {
        id: 'ap_2',
        question: 'Tell me about someone who changed how you think about people — not a family member, someone outside your immediate circle. What did they teach you?',
        prompt: 'Who they were. What specifically shifted.',
        dimension_weight: 0.25,
      },
      {
        id: 'ap_3',
        question: 'What do you know about people that most people around you do not seem to understand?',
        prompt: 'The thing your experience has shown you that others keep having to learn the hard way.',
        dimension_weight: 0.20,
      },
      {
        id: 'ap_4',
        question: 'What kind of person have you learned to stay away from — not a type, but a specific pattern of behavior that you now recognize immediately?',
        prompt: 'What the pattern looks like and how you spotted it.',
        dimension_weight: 0.15,
      },
      {
        id: 'ap_5',
        question: 'What do you want your grandchildren to understand about people — the one thing that would save them the most pain?',
        prompt: 'From your actual experience with actual people.',
        dimension_weight: 0.15,
      },
    ],
  },

  defining_experiences: {
    title: 'Defining Experiences',
    intro: 'The moments that shaped who you became. The years that changed the direction of everything.',
    estimatedMinutes: 20,
    questions: [
      {
        id: 'de_1',
        question: 'What is the single experience that most changed the direction of your life — the moment where everything before and after it is different?',
        prompt: 'What happened. How old you were. What changed.',
        dimension_weight: 0.30,
      },
      {
        id: 'de_2',
        question: 'Tell me about the hardest period of your life — not the saddest, the hardest. The time that required the most from you.',
        prompt: 'What it demanded. How you got through it. What it left behind.',
        dimension_weight: 0.25,
      },
      {
        id: 'de_3',
        question: 'What opportunity did you take that most people in your position would not have — the risk that defined something?',
        prompt: 'What made you say yes when others would have said no.',
        dimension_weight: 0.20,
      },
      {
        id: 'de_4',
        question: 'What did you survive that you did not think you would survive — and what did surviving it teach you about yourself?',
        prompt: 'The specific thing. The specific lesson.',
        dimension_weight: 0.15,
      },
      {
        id: 'de_5',
        question: 'If your life were a book — what would the chapter titles be? What are the distinct periods and what ended each one?',
        prompt: 'Not a resume. The real chapters. What each one was about.',
        dimension_weight: 0.10,
      },
    ],
  },

  wisdom_and_lessons: {
    title: 'Wisdom and Lessons',
    intro: 'What you know now that you wish you had known earlier. The things that only come from having actually lived.',
    estimatedMinutes: 15,
    questions: [
      {
        id: 'wl_1',
        question: 'What is the single most valuable thing you have learned — the insight that has given you the most leverage across every area of your life?',
        prompt: 'Not wisdom you read. Wisdom you earned.',
        dimension_weight: 0.30,
      },
      {
        id: 'wl_2',
        question: 'What do you know now that you wish someone had told you at 25 — the thing that would have changed the next decade?',
        prompt: 'Specific. Actionable. Real.',
        dimension_weight: 0.25,
      },
      {
        id: 'wl_3',
        question: 'What mistake have you watched other people make repeatedly that you stopped making — and when did you stop?',
        prompt: 'The pattern you learned to avoid and how.',
        dimension_weight: 0.20,
      },
      {
        id: 'wl_4',
        question: 'What does success actually look like to you — not the version you used to believe, the version you have arrived at from actually living?',
        prompt: 'How your definition has changed.',
        dimension_weight: 0.15,
      },
      {
        id: 'wl_5',
        question: 'What would you tell the next generation is the most important thing to figure out early — the thing that makes everything else easier?',
        prompt: 'The foundation. The thing that compounds.',
        dimension_weight: 0.10,
      },
    ],
  },

  early_life: {
    title: 'Early Life',
    intro: 'Where you came from and what formed you. The years that most people in your current life know nothing about.',
    estimatedMinutes: 20,
    questions: [
      {
        id: 'el_1',
        question: 'Describe where you grew up — not the facts, the feeling. What was the texture of your childhood world?',
        prompt: 'The specific details. What it smelled like. What it felt like to be young there.',
        dimension_weight: 0.25,
      },
      {
        id: 'el_2',
        question: 'What did your family not have when you were young that shaped how you think today?',
        prompt: 'Money, stability, presence, safety — whatever it actually was. How it shaped you.',
        dimension_weight: 0.25,
      },
      {
        id: 'el_3',
        question: 'Who was the most important person in your early life outside your immediate family — a teacher, a neighbor, a coach, a friend? What did they give you?',
        prompt: 'The specific person. The specific gift.',
        dimension_weight: 0.20,
      },
      {
        id: 'el_4',
        question: 'What did you want to be when you were young — the real answer, not the socially acceptable one — and how did that want shape what you became?',
        prompt: 'The dream and what happened to it.',
        dimension_weight: 0.15,
      },
      {
        id: 'el_5',
        question: 'What would your childhood self think of who you became — what would surprise them, what would disappoint them, what would make them proud?',
        prompt: 'Honest answer. All three.',
        dimension_weight: 0.15,
      },
    ],
  },

  spiritual_beliefs: {
    title: 'Spiritual Beliefs',
    intro: 'What you believe about meaning, purpose, and what happens after. The things you rarely say out loud.',
    estimatedMinutes: 20,
    questions: [
      {
        id: 'sb_1',
        question: 'What do you actually believe happens when we die — not what you are supposed to believe, what you actually believe in your quietest moments?',
        prompt: 'Your real answer. Whatever it is.',
        dimension_weight: 0.25,
      },
      {
        id: 'sb_2',
        question: 'Has your relationship with faith or spirituality changed across your life — and if so what changed it?',
        prompt: 'The specific experiences that moved you toward or away from belief.',
        dimension_weight: 0.25,
      },
      {
        id: 'sb_3',
        question: 'What gives your life meaning — the real answer, not the one that sounds right?',
        prompt: 'What actually gets you up. What actually matters.',
        dimension_weight: 0.20,
      },
      {
        id: 'sb_4',
        question: 'Have you ever experienced something you could not explain — a moment of grace, a coincidence too large, a presence you could not account for?',
        prompt: 'What happened. What you made of it.',
        dimension_weight: 0.15,
      },
      {
        id: 'sb_5',
        question: 'What do you want your grandchildren to know about how you made sense of the hardest things in life?',
        prompt: 'The framework that held. Whatever it was.',
        dimension_weight: 0.15,
      },
    ],
  },

  fears_and_vulnerabilities: {
    title: 'Fears and Vulnerabilities',
    intro: 'What you are afraid of and where you feel most human. The things that do not go away with success or age.',
    estimatedMinutes: 20,
    questions: [
      {
        id: 'fv_1',
        question: 'What are you afraid of — not the fears that are socially acceptable to name, the ones that actually keep you up at night?',
        prompt: 'The real ones. Specific.',
        dimension_weight: 0.30,
      },
      {
        id: 'fv_2',
        question: 'What is the version of yourself you are most afraid of becoming — the failure mode that you watch for?',
        prompt: 'The shadow self. What it looks like.',
        dimension_weight: 0.25,
      },
      {
        id: 'fv_3',
        question: 'Where do you feel most out of your depth — the area of life where confidence has never quite arrived?',
        prompt: 'Honest answer. Everyone has one.',
        dimension_weight: 0.20,
      },
      {
        id: 'fv_4',
        question: 'What do you want most that you have been afraid to say out loud — even to yourself?',
        prompt: 'Take your time. This one matters.',
        dimension_weight: 0.15,
      },
      {
        id: 'fv_5',
        question: 'What would you want your grandchildren to know about how you handled fear — not that you were fearless, but how you moved through it?',
        prompt: 'The real answer. What actually helped.',
        dimension_weight: 0.10,
      },
    ],
  },
}
