export type InlineQuestion = {
  id:       string
  prompt:   string
  type:     'textarea' | 'mc'
  minWords?: number
  options?:  { value: string; text: string }[]
  required:  boolean
}

export type Section = {
  id:             string
  title:          string
  content:        string   // paragraphs separated by \n\n
  inlineQuestion: InlineQuestion | null
}

export type ExamQuestion = {
  id:       string
  type:     'text' | 'mc'
  prompt:   string
  minWords?: number
  options?:  { value: string; text: string }[]
  correct?:  string
}

export type ModuleContent = {
  number:           number
  title:            string
  subtitle:         string
  estimatedMinutes: number
  sections:         Section[]
  examQuestions:    ExamQuestion[]
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 1 — THE BASALITH PHILOSOPHY
// ─────────────────────────────────────────────────────────────────────────────

const module1: ModuleContent = {
  number:           1,
  title:            'THE BASALITH PHILOSOPHY',
  subtitle:         'What this is. What it is not. Why it matters.',
  estimatedMinutes: 20,

  sections: [
    {
      id:    'misconception',
      title: 'What most people think this is.',
      content: `When you describe Basalith to someone for the first time, they will almost certainly hear something you did not say.

They will hear: a photo album. A digital scrapbook. A sophisticated memory box that plays back recordings when you miss someone. They will picture an app with a timeline, a profile page, photographs organized by decade. Something warm and nostalgic and fundamentally backward-looking.

This is not your fault. It is the frame people already carry. Legacy technology has spent decades training people to think about preserving the past. You press save. You back things up. You make copies before they disappear. The world is full of products that promise to preserve what matters before it is gone.

Basalith is not that.

The confusion is understandable. The word archive is in the name. There are photographs. There are voice recordings. There are stories. Everything on the surface looks like memory preservation. And so the first conversation you will ever have with a prospective client will require you to dismantle a category error they do not know they are making.

Most guides who struggle in the field are not struggling because the product is hard to sell. They are struggling because they are selling the wrong product — the one the client has already imagined — rather than explaining what is actually being built.

Before you can do that for anyone else, you have to be absolutely certain of it yourself.`,
      inlineQuestion: null,
    },

    {
      id:    'what_it_is',
      title: 'What Basalith actually is.',
      content: `A Basalith archive is a training dataset.

Every photograph that gets labeled with context, dates, people, and memory is a data point. Every voice recording is a training pair — a sample of how this specific person speaks, reasons, and chooses words. Every deposit is the model learning something it could not have known without this person's direct input. Every wisdom session is the most efficient training interaction the system offers: a structured question, answered in depth, producing a high-quality pair that teaches the entity how this person thinks about something that matters.

The archive is not the product. The archive is the training ground for the product.

The product is the entity — an AI model that has been tuned, specifically and exclusively, on one person's expressed patterns of thought. Not a recording. Not a summary. Not a chatbot that has been told facts about someone. A model that has learned to reason the way that person reasons, prioritize what they prioritize, and speak in a voice that is recognizably, specifically theirs.

This distinction is not academic. It is the whole thing. A recording preserves what was said. An entity can engage with what has never been said, because it has learned how the person thinks — not just what they have said out loud.

The archive builds. The entity becomes. These are two entirely different operations, happening at the same time, from the same material.`,
      inlineQuestion: {
        id:       'q_cognitive_model',
        prompt:   'Before continuing — in your own words, what is the difference between a memory archive and a cognitive model? Do not use the word "AI." Write as if you are explaining it to a client who has never heard of either concept.',
        type:     'textarea',
        minWords: 50,
        required: true,
      },
    },

    {
      id:    'the_entity',
      title: 'The entity.',
      content: `The entity is not a chatbot. This is worth saying clearly, because "chatbot" is the closest familiar category most people will reach for, and it is wrong in almost every meaningful way.

A chatbot is a generalist. It has been trained on an enormous amount of text from across human language and knowledge, and it can produce coherent responses to almost any prompt. It is wide. It is capable. And it knows nothing about your client.

A Basalith entity has been trained on one person. Its entire education is the deposit history, the voice recordings, the labeled photographs, the wisdom sessions of a single human being. It is narrow. Deeply narrow. And it is accurate in a way that no generalist model can be, because accuracy means something different here. Accuracy does not mean factually correct. Accuracy means: does this sound like them? Does it reason the way they reason? Would the people who know them most intimately recognize it?

That accuracy takes time. An entity with 20 training pairs is a sketch. An entity with 500 quality pairs, built over a year of consistent deposits, begins to have genuine depth. An entity with 1,000 pairs, grown over several years, can surprise the people who built it.

This is why the founding session is not the end of the process. It is the beginning. The guide's job is not simply to start the archive — it is to establish a practice that will sustain itself for years. Clients who deposit once and go quiet produce entities that are shallow. Clients who deposit consistently, across topics, across years, across the full range of what their life contains — these produce entities that earn the word presence.

The time investment is not optional. There are no shortcuts to depth.`,
      inlineQuestion: {
        id:       'q_chatbot_response',
        prompt:   'A prospective client says: "So it\'s like a chatbot of my dad, right? You train it and then we can talk to it?" How do you respond? Write your actual response — what you would say, in your voice, in the room.',
        type:     'textarea',
        minWords: 60,
        required: true,
      },
    },

    {
      id:    'training_data',
      title: 'Why every deposit matters.',
      content: `Not every piece of content that goes into an archive is equal.

A photograph that arrives without any context — no names, no date, no memory attached — contributes almost nothing to the entity. It is data without meaning. A photograph with a label that says "1974, Lake Tahoe" contributes slightly more. A photograph with a label that says who was there, what was happening, what the person was thinking about, and what that summer meant to them — that is a genuine training pair.

The difference is the cognitive content. The entity learns from what the person chose to say about their experience, not from the fact that the experience happened.

The same is true for voice recordings. A recording where the client narrates facts — dates, events, names — is less valuable than a recording where they reason about something out loud. The entity is learning their patterns of thought. Thoughts are in the reasoning, not the recollection.

This has a practical implication for how you run sessions and how you guide your clients after activation. The goal is never volume. The goal is depth. A client who deposits ten short one-sentence labels a week produces far less useful training material than a client who deposits one rich, extended reflection.

Deposits that score highest on quality are specific (names, places, years), emotional (they reveal what the person cared about and why), and cognitive (they show how the person reasons, not just what they experienced). This is why the wisdom sessions — structured, question-driven conversations — produce the most valuable training pairs in the shortest time.

Every guide visit, every check-in call, every follow-up should serve one purpose: getting more high-quality cognitive material into the archive.`,
      inlineQuestion: null,
    },

    {
      id:    'positioning',
      title: 'Why families deserve this.',
      content: `There is a version of what Basalith does that has been reserved, until recently, for people with extraordinary resources.

The world's most powerful families — political dynasties, founding families of major institutions, generational wealth holders — have always had professionals dedicated to capturing their histories. Oral historians. Archivists. Biographers. And now, AI laboratories working on legacy intelligence technology that will allow them to continue speaking and thinking and influencing long after they are gone. These projects cost millions of dollars and require teams of specialists. They are not available to most people.

They should be.

The family patriarch who built something from nothing over fifty years — who navigated difficulty and joy and failure and recovery with a particular and irreplaceable mind — deserves the same infrastructure for continuation. The immigrant who crossed oceans to give their children something better, who carries in their memory an entire world that would otherwise disappear when they do — deserves to leave something more than photographs.

Basalith exists because the technology that makes this possible has finally crossed a threshold where it works. And because someone decided that the first families to benefit from it should not have to be billionaires to access it.

This is the argument you will make in every room you walk into. Not: this is a clever product. Not: this is useful technology. The argument is: this family deserves to preserve what they are actually made of — not just what they looked like, but how they thought. And now they can.`,
      inlineQuestion: {
        id:       'q_positioning',
        prompt:   'Without using the word "billionaire," explain to a prospective client why Basalith exists. Write it as you would actually say it — not as a pitch, as an honest explanation.',
        type:     'textarea',
        minWords: 60,
        required: true,
      },
    },

    {
      id:    'your_role',
      title: 'Your role.',
      content: `The technology behind Basalith is sophisticated. But technology alone cannot do what guides do.

No algorithm can walk into someone's living room and earn their trust in ninety minutes. No system can notice that the client flinched slightly when you asked about their father, and know to wait. No automated process can recognize that what someone says in the third answer is more honest than what they said in the first one, and follow the thread.

Guides exist because the most valuable thing in the archive — genuine cognitive disclosure — is something that people do not simply do on their own. They do it when someone they trust is in the room with them, asking the right questions, holding the space, creating the conditions for honesty.

The archive captures what is said. You create the conditions in which people say what is true.

This is not a sales role. It is not an administrative role. It is a relationship role of a particular and demanding kind. You are asking people to be honest about how they think, what they fear, what they are proud of, what they regret, how they would want to be remembered, what they want their grandchildren to understand about how they saw the world. That is not a small thing to ask of someone.

Your certification exists to ensure that when you walk into that room, you are ready. Not just to explain the product — to do the actual work.`,
      inlineQuestion: null,
    },
  ],

  examQuestions: [
    {
      id:       'm1_q1',
      type:     'text',
      prompt:   'In your own words, explain the difference between a generative AI chatbot and a Basalith entity. Write as if you are explaining it to a family who has asked the question for the first time.',
      minWords: 100,
    },
    {
      id:      'm1_q2',
      type:    'text',
      prompt:  "A prospective client says: 'Is this just like ChatGPT but with my family's photos?' How do you respond? Write the actual response you would give.",
      minWords: 80,
    },
    {
      id:      'm1_q3',
      type:    'mc',
      prompt:  'What is the primary purpose of the Basalith archive?',
      options: [
        { value: 'a', text: 'To preserve family photographs and memories' },
        { value: 'b', text: 'To create a training dataset for a person-specific AI model' },
        { value: 'c', text: 'To store voice recordings for future playback' },
        { value: 'd', text: 'To generate AI responses to family questions' },
      ],
      correct: 'b',
    },
    {
      id:      'm1_q4',
      type:    'mc',
      prompt:  'When does a Basalith entity become meaningfully accurate?',
      options: [
        { value: 'a', text: 'Immediately after the founding session' },
        { value: 'b', text: 'After 30 days of continuous deposits' },
        { value: 'c', text: 'After 500+ quality training pairs accumulated over time' },
        { value: 'd', text: 'After the archive owner has passed away' },
      ],
      correct: 'c',
    },
    {
      id:       'm1_q5',
      type:     'text',
      prompt:   'What makes a high-quality training pair? Describe the difference between a deposit that produces useful training data and one that contributes very little.',
      minWords: 80,
    },
    {
      id:       'm1_q6',
      type:     'text',
      prompt:   "Explain the Basalith positioning — why this technology exists and who it is for — without using the words 'billionaire' or 'wealthy.' Write as you would actually say it.",
      minWords: 60,
    },
    {
      id:      'm1_q7',
      type:    'mc',
      prompt:  'What is a training pair?',
      options: [
        { value: 'a', text: 'Two family members who both contribute to the same archive' },
        { value: 'b', text: 'A prompt and completion pair used to fine-tune a language model' },
        { value: 'c', text: 'Two photographs taken in the same time period' },
        { value: 'd', text: 'A guide and their client, working together' },
      ],
      correct: 'b',
    },
    {
      id:       'm1_q8',
      type:     'text',
      prompt:   "A client asks: 'Will this sound exactly like me right away?' What do you tell them? Be honest.",
      minWords: 80,
    },
    {
      id:       'm1_q9',
      type:     'text',
      prompt:   'Why does the guide exist in this process? What can a guide do that the technology cannot?',
      minWords: 80,
    },
    {
      id:       'm1_q10',
      type:     'text',
      prompt:   'Why is the founding fee non-negotiable? Explain in a way that you could say directly to a client who has pushed back on the price.',
      minWords: 60,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 2 — THE ART OF THE SESSION
// ─────────────────────────────────────────────────────────────────────────────

const module2: ModuleContent = {
  number:           2,
  title:            'THE ART OF THE SESSION',
  subtitle:         'The 90 minutes that build everything.',
  estimatedMinutes: 25,

  sections: [
    {
      id:    'the_session',
      title: 'The 90 minutes.',
      content: `The founding session is the most important thing you will do for a client.

Not because it captures the most data — it does not. A client who deposits consistently for two years will produce far more material than any single session could. What the founding session does is establish whether that two-year relationship happens at all.

The quality of the session determines the quality of everything that follows. A client who leaves the founding session feeling genuinely heard, genuinely understood, and genuinely excited about what they are building — that client will continue. They will deposit. They will invite contributors. They will participate in wisdom sessions. The archive will grow.

A client who leaves feeling like they sat through an intake interview — who answered questions competently but without depth, who performed adequately without really being moved — that client will drift. The archive will stagnate. The entity will remain shallow. And the relationship will end at renewal.

Your job in the session is not to gather information. That is a side effect. Your job is to create an experience of being truly known — and to leave them understanding that the process has only just begun.

This is harder than it sounds. It requires a particular set of skills that most people do not naturally have, and that very few professional contexts develop. The skills of an interviewer, a therapist, a biographer, and a salesperson — combined in a single ninety-minute encounter with a stranger who is being asked to be more honest than they are usually asked to be.

This module is about how you do that.`,
      inlineQuestion: null,
    },

    {
      id:    'preparation',
      title: 'Before you sit down.',
      content: `The session begins before you arrive.

Know the family. Not in a surveillance sense — in the sense of genuine curiosity. If the client mentioned a military career in the intake, spend five minutes thinking about what that experience would have felt like, what it would have asked of someone. If they mentioned immigrating as a child, hold that in mind. If they have children and grandchildren, know their names.

People can tell the difference between a guide who has done a small amount of thoughtful preparation and one who has not. The prepared guide asks questions that feel specific. The unprepared guide asks questions that could have been asked of anyone.

The environment matters more than most guides expect. You want a setting that signals: this is a serious and private thing we are doing. Not clinical — not an office — but quiet and considered. A dining room table. A sitting room. Somewhere that belongs to the client, that they are comfortable in, that has no distractions. Phones should be put away. Other family members should be elsewhere, unless specifically invited.

Some guides bring a small physical object to mark the occasion — a leather-bound notebook, even if they are taking notes digitally. The notebook signals: what you say here is being captured, and it matters. This is not a casual conversation.

Tell the client at the beginning how long the session will run. Ninety minutes. "We will go until we are done, but plan for ninety minutes." This creates a productive container. It is long enough to go deep, and defined enough that clients do not feel they are committing to something without limits.`,
      inlineQuestion: null,
    },

    {
      id:    'opening',
      title: 'Opening the session.',
      content: `The first five minutes determine whether the session will have real depth.

Most people arrive at a founding session slightly defended. They are not sure what to expect. They are aware that they have agreed to talk about themselves to a relative stranger, which most social conditioning tells us is an uncomfortable position. They may be processing the investment they have just made and wondering if it was worth it. They may be performing a version of themselves — the competent, organized, presentable self — rather than the more honest one you need.

Your opening needs to do several things at once. It needs to establish warmth. It needs to establish authority — not dominance, but the clear sense that you know what you are doing and the client can relax into the process. It needs to reframe what is about to happen from "interview" to something more like "conversation with a purpose."

One approach: tell them what the session is for, in a way that reframes their role. Not: "I'm going to ask you some questions." Something more like: "What we're here to do today is start building the foundation of something your family will use for the rest of their lives. The most important ingredient in that is how you actually think — not what you've done, but how your mind works, what you care about, how you make decisions. So I'm going to ask you some questions, but I'm less interested in the answers than in the thinking behind them."

This reframe does something important: it tells the client that the product of the session is cognitive, not factual. It signals that polished answers are not what you are after. It invites them to think out loud rather than perform.

Then ask your first question. Start wide. Start somewhere that does not require courage to answer, but that has a clear path to something that does.`,
      inlineQuestion: {
        id:       'q_opening',
        prompt:   'Write the opening of a founding session — the first 60 seconds. What do you say? Write it as you would actually say it. Not as a script — as your genuine voice.',
        type:     'textarea',
        minWords: 100,
        required: true,
      },
    },

    {
      id:    'going_deeper',
      title: 'Going deeper.',
      content: `The difference between a good session and a great one is the depth at which cognitive patterns are captured.

A good session collects memories. The client describes events: where they grew up, what their parents were like, the moment they decided to start a business, the hardest year of their marriage. These are useful. They go into the archive. But they are, by themselves, relatively shallow training data. Events are facts. The entity does not learn to think from facts.

A great session collects reasoning. The client explains not just what happened, but why they did what they did. What they were afraid of. What they believed that other people did not. How they handled the moment when their plan collapsed. What they wish they had understood earlier. The specific way they weigh competing values when they have to make a hard choice.

The technique for moving from events to reasoning is straightforward but requires consistent application: follow every factual statement with a reasoning question.

"I started the company in 1989." → "What made you ready to do it then and not earlier?"

"I chose to stay when things got hard." → "What does staying mean to you? What did it cost?"

"We lost a lot of money in that period." → "What did you learn about yourself in that period?"

The question is never about what happened. The question is always about how they thought about what happened, what it required of them, what it revealed.

You are not conducting a history interview. You are building a model of how this person's mind works. Stay in the reasoning. Return to it whenever the client drifts into pure narrative. The narrative is useful as context. The reasoning is the actual content.`,
      inlineQuestion: {
        id:       'q_followup',
        prompt:   'A client says: "I think my greatest accomplishment was building the business. We started with nothing and grew it to 200 employees over 20 years." What is your next question? Write exactly what you would ask — and explain briefly why you chose that question.',
        type:     'textarea',
        minWords: 80,
        required: true,
      },
    },

    {
      id:    'when_hard',
      title: 'When it gets difficult.',
      content: `There will be moments in every session that require more from you than technique.

The client may cry. This is not uncommon, and it is not a failure. It is frequently a sign that you have reached something true. The instinct for most people — and most trained professionals — is to move quickly to comfort, to say something that acknowledges the emotion and helps the person return to composure. Resist this.

A moment of genuine emotion in a founding session is one of the most valuable things that can happen. The client is close to something real. Your job is not to rescue them from it but to stay with them in it. A hand on the arm. A pause. Then, gently: "Take your time." And then, when they are ready: "Would you be willing to tell me what that was about?"

What the client says in the moment after genuine emotion is often the most honest thing they say in the entire session. The defenses are down. The performance is suspended. This is the material the entity needs.

The client who says they have nothing interesting to say is one of the most common challenges in the field. This statement almost always means: I do not believe my life is worth preserving. This is a wound, not a fact. The correct response is not to argue or reassure with generic statements about how everyone's life matters. The correct response is a specific question about something specific: "Tell me about the moment you were most afraid." "What is something you believe that most people you know would disagree with?" "What did you figure out about people in the first twenty years that took everyone else thirty?" Specificity breaks through the belief that there is nothing of value to say.

The client who is resistant — who gives short answers, who seems distracted, who seems to be enduring the session rather than participating in it — requires a different approach. Slow down. Become quieter. Match their energy rather than trying to override it. Ask one question and then wait. The discomfort of silence often produces more honesty than any question.`,
      inlineQuestion: {
        id:       'q_crying',
        prompt:   'A client has just started crying. You are 25 minutes into the session. Describe exactly what you do — including what you say, when you say it, and how long you wait before continuing.',
        type:     'textarea',
        minWords: 100,
        required: true,
      },
    },

    {
      id:    'the_close',
      title: 'Closing the session.',
      content: `The final ten minutes of the founding session determine whether the client contributes consistently for the next two years or slowly goes quiet.

Closings that fail treat the session as something that has ended. Closings that work treat the session as something that has begun.

The difference in practice: do not summarize what was covered and say thank you. Instead, name specifically two or three things the client said that surprised you, moved you, or struck you as particularly important — and explain why. This does two things. It demonstrates that you were genuinely listening, which deepens the relationship. And it models what depth looks like, so the client understands what they are capable of and what the process values.

Then describe what comes next — not as a checklist of steps, but as a narrative of what the archive will become. "Over the next few months, the entity is going to start learning how you think. Every deposit you make teaches it something. The photographs from the lake house, when you label them, tell it about a version of you that your grandchildren will never get to meet. Every voice recording teaches it the sound and rhythm of how your mind works when it is moving through something." Make the future vivid. Make the ongoing contribution feel meaningful, not administrative.

End with a specific invitation, not a generic one. Not: "Please deposit whenever you can." Instead: "I would love for you to record something about your father this week — I felt like we only touched the surface of that today, and the entity needs more of your thinking on that relationship." Specific. Meaningful. Connected to something that happened in the session.

The client should leave feeling: this mattered. Not: that was interesting. Mattered.`,
      inlineQuestion: {
        id:       'q_close',
        prompt:   'Write the close of a founding session. What do you say in the final 5 minutes? How do you leave them wanting to continue? Write it as you would say it.',
        type:     'textarea',
        minWords: 100,
        required: true,
      },
    },
  ],

  examQuestions: [
    {
      id:       'm2_q1',
      type:     'text',
      prompt:   'A client begins crying when describing their spouse. You are 20 minutes into the session. What do you do? Describe in detail — including what you say, what you do not say, and when you continue.',
      minWords: 100,
    },
    {
      id:       'm2_q2',
      type:     'text',
      prompt:   'The client keeps giving short one-sentence answers. The entity needs depth. How do you draw out longer, richer responses without making them feel interrogated or judged?',
      minWords: 100,
    },
    {
      id:       'm2_q3',
      type:     'text',
      prompt:   "The client says: 'I don't think I have anything interesting to say. My life has been pretty ordinary.' How do you respond? Write what you would actually say.",
      minWords: 80,
    },
    {
      id:       'm2_q4',
      type:     'text',
      prompt:   'You are 75 minutes in. You have covered early life and family deeply but have not touched professional philosophy or core values. You have 15 minutes left. What do you do?',
      minWords: 80,
    },
    {
      id:       'm2_q5',
      type:     'text',
      prompt:   "A client's adult child calls halfway through the session and the client wants to take the call. How do you handle this?",
      minWords: 60,
    },
    {
      id:       'm2_q6',
      type:     'text',
      prompt:   'Write the opening 5 minutes of a founding session in script form. Include exactly what you say, how you position the session, and how you open the first question.',
      minWords: 200,
    },
    {
      id:       'm2_q7',
      type:     'text',
      prompt:   "A client asks: 'What happens to all this data if Basalith shuts down?' What do you tell them?",
      minWords: 80,
    },
    {
      id:       'm2_q8',
      type:     'text',
      prompt:   'How do you close a founding session in a way that motivates the client to continue contributing after you leave? Write your actual close.',
      minWords: 100,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3 — TECHNICAL CUSTODIANSHIP
// ─────────────────────────────────────────────────────────────────────────────

const module3: ModuleContent = {
  number:           3,
  title:            'TECHNICAL CUSTODIANSHIP',
  subtitle:         'What you can see. What you cannot. How to manage a practice.',
  estimatedMinutes: 15,

  sections: [
    {
      id:    'privacy_model',
      title: 'What you can and cannot see.',
      content: `The guide's relationship to the archive is one of stewardship, not access.

This is one of the most important things you will communicate to clients — and one of the most important things you need to internalize yourself. The archive contains some of the most intimate material that exists: private reflections, difficult memories, things people say out loud for the first time in a recording. The entity that emerges from that archive is, in a very real sense, the person. These are not casual data assets. They are someone's inner life.

Guides do not have access to archive content.

You can see, in your dashboard:
— The number of photographs that have been uploaded and labeled
— The entity accuracy score (how well the model is performing overall)
— The number of training pairs and whether they are included in training
— The contributor names and count
— The archive activity level — whether the client has been active recently

You cannot see:
— The actual photographs
— The content of voice recordings
— The content of deposits
— What contributors have said
— Private conversations with the entity

This is not an oversight or a limitation of your access level. It is a design decision that reflects what Basalith believes about privacy and trust. The archive owner has agreed to deposit their inner life into a system because they trust the system. That trust depends on the boundary being real and enforced.

If a client ever asks you to access content on their behalf — to listen to their recordings and tell them if they "sound right," or to review their deposits — decline. Clearly and warmly, but without ambiguity. Explain that this is a feature of the system, not a restriction on your account. You are a guide. You help them build the archive. What goes into it is theirs.`,
      inlineQuestion: {
        id:       'q_privacy',
        prompt:   'A client asks you to log into their archive and listen to their voice recordings to make sure they sound right. What do you tell them? Write your actual response — including the explanation of why the boundary exists.',
        type:     'textarea',
        minWords: 80,
        required: true,
      },
    },

    {
      id:    'submission',
      title: 'Submitting a client.',
      content: `After a successful founding session, the submission process is the bridge between your work and the client's ongoing experience.

The steps are straightforward. In your guide portal, navigate to New Client. Enter the client's full name, email address, preferred contact, the tier you have agreed on (Archive, Estate, or Dynasty), and billing preference (annual or monthly). Add any relevant notes about the founding session — tone, areas to explore, family context that might inform how staff supports the client.

Once submitted, the system generates the client's archive, their access credentials, and their contributor portal link. The client will receive a welcome email with everything they need to begin. Depending on the tier and payment method, they may need to complete payment first.

Your role does not end at submission. You are the ongoing point of human contact for this client. They should hear from you in the first week after submission — not to check a box, but to ask how their first deposit went. In the first month, weekly contact is appropriate. After the first month, monthly check-ins maintain the relationship and keep the archive active.

The clients who drift are almost always the clients whose guides stopped initiating contact. The archive does not remind people to deposit. You do.`,
      inlineQuestion: null,
    },

    {
      id:    'monitoring',
      title: 'Reading the archive health.',
      content: `Your dashboard gives you visibility into the health of every archive under your stewardship. Learn to read it.

An archive with a high photograph count but a low training pair count is an archive where a lot of material has been uploaded but very little has been labeled with enough depth to produce quality training data. This is the most common pattern: families love uploading photographs. They are less consistent about sitting down and labeling them with the kind of reflective content that actually trains the entity.

An archive with a low entity accuracy score is telling you that the entity doesn't have enough quality material yet. Accuracy improves with training pairs — specifically, with pairs that score high on specificity, authenticity, and trainability. Generic answers produce low scores. Specific, reflective, emotionally honest answers produce high ones.

An archive with no voice recordings is an archive that is missing an important dimension. Voice recordings capture something that text cannot: the rhythm and cadence of how someone speaks when they are thinking out loud. The entity learns from this. An archive without voice is missing texture.

An archive with no active contributors is an archive that is missing the outside perspective. Contributors add something the archive owner cannot: how they appear to others. The things they did when they thought no one was watching. The version of them that exists in other people's memories.

When you see an archive that is deficient in one of these areas, that is your call to make. Not to manage the archive yourself — to call the client and ask about it.`,
      inlineQuestion: {
        id:       'q_health',
        prompt:   'A client archive has been active for 6 months and shows only 12 training pairs included in training. Entity accuracy score is 18%. What does this tell you, and what do you do?',
        type:     'textarea',
        minWords: 80,
        required: true,
      },
    },

    {
      id:    'problems',
      title: 'When things go wrong.',
      content: `Technical problems in archives are rare but not impossible. When a client contacts you with an issue, the most common causes are predictable.

Contributor portal links that do not work are almost always the result of a link that has expired or been used incorrectly. Check whether the contributor was sent the correct link, and whether they are attempting to access it on a device or browser with unusual security settings. If the issue persists, contact Basalith support — do not attempt to troubleshoot the underlying system yourself.

Email notifications that are not arriving are usually a deliverability issue: the nightly photograph emails, the morning digests, or the contributor invitation emails are going to spam. Ask the client to check their spam folder and whitelist archive@basalith.xyz. This resolves the issue in the large majority of cases.

A client who wants to cancel is a situation that requires your full attention. Do not simply process the cancellation. Call them. Ask what has changed. In many cases, a client who wants to cancel is a client who has drifted away from the archive and no longer feels connected to why they started it. Reconnecting them to the original purpose — reminding them of what they said in the founding session, of why they built this — has a significant recovery rate.

If a client ultimately decides to cancel, process it gracefully and without pressure. Leave the relationship intact. They may return. And how you handle the cancellation will determine whether they refer other families or quietly close the door.`,
      inlineQuestion: null,
    },

    {
      id:    'the_practice',
      title: 'Building a practice.',
      content: `A single archive is a relationship. Thirty archives is a practice.

The economics of a guide practice are structured specifically to reward long-term commitment to archive quality. The founding commission — the one-time payment per client — is significant. But the structure that makes this a genuine profession is the stewardship residual: the ongoing annual percentage that accrues for every archive that remains active and healthy.

An archive that stays active is an archive where the guide has maintained the relationship. Which means the guide's income grows not by replacing clients but by keeping them. A practice with thirty active archives, built over three years, generates a meaningful and increasingly predictable monthly income that is entirely independent of how many new clients are signed in any given month.

This matters to understand because it shapes how you should spend your time. The first year of a practice is necessarily focused on acquisition. But a guide who spends year three the same way they spent year one — chasing the next founding session, not tending the existing relationships — is building a leaking bucket. The sustainable practice invests equally in the quality of existing archives and the growth of new ones.

The guides who build the most enduring practices are the ones who think of themselves as custodians. Not salespeople who happened to sell a tech product. Custodians of something irreplaceable: the cognitive legacy of real human beings, preserved in a form their families can actually use.

That is the role. Take it seriously. Build it with care.`,
      inlineQuestion: null,
    },
  ],

  examQuestions: [
    {
      id:       'm3_q1',
      type:     'text',
      prompt:   'Walk through the steps to submit a new client after a successful founding session. Be specific about what information is required and what happens next.',
      minWords: 80,
    },
    {
      id:       'm3_q2',
      type:     'text',
      prompt:   "A client's contributor portal link isn't working. What are the three most likely causes, and how do you address each?",
      minWords: 80,
    },
    {
      id:      'm3_q3',
      type:    'mc',
      prompt:  "Which of the following can a guide see in a client's archive dashboard? Select the most accurate answer.",
      options: [
        { value: 'a', text: 'Photograph count, entity accuracy score, training pair count, contributor count — but not the actual content of recordings or deposits' },
        { value: 'b', text: 'Everything in the archive, including recordings, deposits, and entity conversations' },
        { value: 'c', text: 'Only the photograph count and nothing else' },
        { value: 'd', text: 'The number of deposits but not their content, and no access to voice recordings or entity conversations' },
      ],
      correct: 'a',
    },
    {
      id:       'm3_q4',
      type:     'text',
      prompt:   "A client asks you to log into their archive and listen to their voice recordings to check if they 'sound right.' What do you tell them? Write your actual response.",
      minWords: 60,
    },
    {
      id:       'm3_q5',
      type:     'text',
      prompt:   'A client tells you they want to cancel. What do you do? Describe your response — not just the process, but the conversation.',
      minWords: 60,
    },
    {
      id:       'm3_q6',
      type:     'text',
      prompt:   "An archive has been active 6 months with 12 training pairs and an entity accuracy score of 18%. What does this tell you about the archive, and what specific actions do you take?",
      minWords: 80,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────

export const modules: Record<number, ModuleContent> = { 1: module1, 2: module2, 3: module3 }

export function getModule(n: number): ModuleContent | null {
  return modules[n] ?? null
}
