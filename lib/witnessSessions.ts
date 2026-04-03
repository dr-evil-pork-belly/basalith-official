export type WitnessQuestion = {
  id:                string
  question:          string
  prompt:            string
  what_it_captures:  string
}

export type WitnessSessionDef = {
  title:            string
  relationship:     string
  intro:            string
  estimatedMinutes: number
  questions:        WitnessQuestion[]
}

export const WITNESS_SESSIONS: Record<string, WitnessSessionDef> = {

  child: {
    title:            'As Their Child',
    relationship:     'child',
    intro:            'You have known [Name] longer than almost anyone in their adult life. You have seen them in moments they do not remember and versions of themselves they have forgotten. Your observations matter enormously to this archive.',
    estimatedMinutes: 20,
    questions: [
      {
        id:               'ch_1',
        question:         'Describe a moment when you watched [Name] handle something difficult. Not a big public difficulty — a quiet one. What did you observe?',
        prompt:           'The specific situation. What they did. What you understood about them from watching it.',
        what_it_captures: 'Character under pressure',
      },
      {
        id:               'ch_2',
        question:         'What did [Name] do or say when you were young that you did not understand at the time but understand now?',
        prompt:           'The thing that seemed strange or unfair then and makes sense now.',
        what_it_captures: 'Parenting philosophy',
      },
      {
        id:               'ch_3',
        question:         'What is something [Name] taught you without ever sitting you down to teach it — something you absorbed just from watching them live?',
        prompt:           'Not a lesson they gave you. Something you caught rather than were taught.',
        what_it_captures: 'Values transmitted',
      },
      {
        id:               'ch_4',
        question:         'Describe [Name] in a moment of genuine joy — not performed happiness, real joy. What were they doing? What did they look like?',
        prompt:           'The specific memory. What you remember most about how they were in that moment.',
        what_it_captures: 'What brings them alive',
      },
      {
        id:               'ch_5',
        question:         'What do you know about [Name] that you think they do not know you know — something you observed that they were not aware you were watching?',
        prompt:           'The private moment you witnessed. What it told you about them.',
        what_it_captures: 'The unseen self',
      },
    ],
  },

  spouse: {
    title:            'As Their Partner',
    relationship:     'spouse',
    intro:            'You know [Name] in ways no one else does. The private self. The person at the end of the day when there is no performance left. What you know is irreplaceable to this archive.',
    estimatedMinutes: 20,
    questions: [
      {
        id:               'sp_1',
        question:         'Describe how [Name] behaves when something goes wrong — specifically. What do they do first? What do they need?',
        prompt:           'Not how you think they should handle it. How they actually do.',
        what_it_captures: 'Stress response',
      },
      {
        id:               'sp_2',
        question:         'What does [Name] do when they think no one is watching — the habits, the rituals, the private version of them?',
        prompt:           'The small things. The things only you see.',
        what_it_captures: 'Private self',
      },
      {
        id:               'sp_3',
        question:         'Tell me about a moment when [Name] surprised you — when they did or said something that showed you a part of them you had not seen before.',
        prompt:           'The specific moment. What surprised you about it.',
        what_it_captures: 'Hidden dimensions',
      },
      {
        id:               'sp_4',
        question:         'What is [Name] most afraid of — not what they say they are afraid of, what you have seen actually frighten them?',
        prompt:           'What you have observed over years of watching someone closely.',
        what_it_captures: 'Real fears',
      },
      {
        id:               'sp_5',
        question:         'What do you want their grandchildren to know about [Name] that they will never see in any public version of this person?',
        prompt:           'The private truth. What you alone know.',
        what_it_captures: 'The true self',
      },
    ],
  },

  colleague: {
    title:            'As Their Colleague',
    relationship:     'colleague',
    intro:            'You have seen [Name] make decisions under pressure. You know how they lead, how they think, how they behave when something is at stake. Your professional observations are a unique record.',
    estimatedMinutes: 15,
    questions: [
      {
        id:               'co_1',
        question:         'Describe a moment when you watched [Name] make a difficult decision under pressure. What did they do and how did they do it?',
        prompt:           'The specific situation. Their process. What you observed about how they think.',
        what_it_captures: 'Decision-making',
      },
      {
        id:               'co_2',
        question:         'What does [Name] do that you have tried to learn from — a specific behavior or approach that you noticed and wanted to adopt?',
        prompt:           'The thing they do that others do not. Why it works.',
        what_it_captures: 'Distinctive strengths',
      },
      {
        id:               'co_3',
        question:         'Tell me about a moment when [Name] handled a person or situation in a way that struck you — something you still think about.',
        prompt:           'What happened. What they did. Why it stayed with you.',
        what_it_captures: 'Leadership in action',
      },
      {
        id:               'co_4',
        question:         'What do people who work with [Name] not understand about them that you do — something about how they think or work that is not obvious?',
        prompt:           'The thing you figured out from working closely with them.',
        what_it_captures: 'Professional depth',
      },
      {
        id:               'co_5',
        question:         'What would be lost if [Name] had never been part of your professional life — what specifically did they contribute that no one else could have?',
        prompt:           'Their specific irreplaceable contribution.',
        what_it_captures: 'Legacy of work',
      },
    ],
  },

  childhood_friend: {
    title:            'As a Childhood Friend',
    relationship:     'childhood_friend',
    intro:            'You knew [Name] before they became who they are now. You remember the original version. What you carry is a record that no one else has.',
    estimatedMinutes: 20,
    questions: [
      {
        id:               'cf_1',
        question:         'Describe [Name] as you knew them when you were both young — not who they were trying to be, who they actually were. What comes to mind first?',
        prompt:           'The specific person. What you remember most about them at that age.',
        what_it_captures: 'Original self',
      },
      {
        id:               'cf_2',
        question:         'What did you know about [Name] then that predicted who they became — the thing that was always there even when they were young?',
        prompt:           'The quality that was present at the beginning and never changed.',
        what_it_captures: 'Core character',
      },
      {
        id:               'cf_3',
        question:         'Tell me about a specific memory of [Name] from when you were young — something that captures who they were at that time.',
        prompt:           'The specific moment. What it reveals about them.',
        what_it_captures: 'Early memories',
      },
      {
        id:               'cf_4',
        question:         'What did you and [Name] go through together that shaped both of you — what was that experience and what did it show you about them?',
        prompt:           'The shared history. What it revealed.',
        what_it_captures: 'Formative experiences',
      },
      {
        id:               'cf_5',
        question:         'What is something about [Name] that the people in their current life probably do not know — something only someone who knew them then would understand?',
        prompt:           'The origin story. What came before.',
        what_it_captures: 'Hidden history',
      },
    ],
  },

  sibling: {
    title:            'As Their Sibling',
    relationship:     'sibling',
    intro:            'You share origin with [Name]. The same family, the same rooms, the same stories told from different angles. What you know about them starts before memory.',
    estimatedMinutes: 20,
    questions: [
      {
        id:               'si_1',
        question:         'What role did [Name] play in your family — not their official role, the actual role they played in how the family worked?',
        prompt:           'The peacemaker, the rebel, the one who held things together. What they actually were.',
        what_it_captures: 'Family role',
      },
      {
        id:               'si_2',
        question:         'What did you observe about how [Name] was treated by your parents — what did they receive that shaped them?',
        prompt:           'What you saw from your vantage point. What it did to them.',
        what_it_captures: 'Family dynamics',
      },
      {
        id:               'si_3',
        question:         'Tell me about a moment between you and [Name] that captures something essential about who they are — a memory that comes to mind when you think of them.',
        prompt:           'The specific memory. What it says about them.',
        what_it_captures: 'Sibling truth',
      },
      {
        id:               'si_4',
        question:         'What did [Name] carry from your family that you wish they could have put down — and what did they carry that you are glad they kept?',
        prompt:           'Both honestly.',
        what_it_captures: 'Inheritance',
      },
      {
        id:               'si_5',
        question:         'What do you understand about [Name] now that you did not understand when you were both young?',
        prompt:           'What time has clarified.',
        what_it_captures: 'Grown understanding',
      },
    ],
  },
}

export const RELATIONSHIP_LABELS: Record<string, string> = {
  child:            'My child or grandchild',
  spouse:           'My spouse or partner',
  colleague:        'A close colleague',
  childhood_friend: 'A childhood friend',
  sibling:          'My sibling',
}
