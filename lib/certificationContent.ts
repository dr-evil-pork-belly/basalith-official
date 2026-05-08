// ─── Types ───────────────────────────────────────────────────────────────────

export type InlineQuestion = {
  id:          string
  prompt:      string
  type:        'textarea' | 'mc'
  minWords?:   number
  placeholder?: string
  required:    boolean
}

export type Section = {
  id:              string
  title:           string
  content:         string
  inlineQuestion?: InlineQuestion | null
}

export type ExamQuestion = {
  id:              string
  type:            'open' | 'multiple_choice' | 'multiple_choice_multi'
  prompt:          string
  minWords?:       number
  scoringCriteria?: string
  options?:        string[]
  correct?:        number | number[]
}

export type CertModule = {
  title:             string
  subtitle:          string
  estimatedMinutes:  number
  passingScore:      number
  sections:          Section[]
  examQuestions:     ExamQuestion[]
}

// ─── MODULE 1 — THE BASALITH PHILOSOPHY ──────────────────────────────────────

const module1: CertModule = {
  title:            'THE BASALITH PHILOSOPHY',
  subtitle:         'Understanding what we actually built.',
  estimatedMinutes: 20,
  passingScore:     80,

  sections: [
    {
      id:    'wrong_models',
      title: 'What most people think Basalith is.',
      content: `When a prospective client first hears about Basalith they usually land on one of two mental models.

The first is the expensive photo album. A very sophisticated place to store photographs and voice recordings so the family can access them later. Ancestry.com with better typography.

The second is the chatbot in a costume. ChatGPT wearing their grandmother's cardigan and pretending to remember things. Technically impressive. Emotionally unconvincing.

Both of these framings are wrong. And if your client leaves the founding session with either of them — the entity will disappoint them. Not because it failed. Because they were looking for a photo album and what they got was something considerably stranger and more interesting.

Your first job as a Legacy Guide is to replace the wrong mental model with the right one before anyone touches a single photograph.

This module gives you the language to do that.`,
      inlineQuestion: null,
    },

    {
      id:    'what_it_is',
      title: 'What Basalith actually is.',
      content: `Basalith is an AI company building person-specific cognitive models.

Every word in that sentence matters.

AI company. Not a storage company. Not a memory preservation platform. The technology is the product. The archive is the infrastructure that makes the technology possible.

Person-specific. The entity being built for Stevens Ha is not a generic AI that has been given Stevens Ha's photographs to look at. It is a model being trained specifically on how Stevens Ha thinks. His reasoning patterns. His values. His way of processing difficulty. His specific relationship to family and work and faith and loss.

Cognitive model. Not a memory database. Not a chatbot with context. A model that learns cognitive patterns — the underlying structure of how a person thinks — not just the surface content of what they said.

The difference matters because of what happens when someone asks the entity a question it has never been directly asked before.

A memory database returns: I don't have information about that.

A cognitive model says: Based on how this person has approached similar situations — here is how they would likely think about this.

That difference is everything. The first is an archive. The second is a continuation.`,
      inlineQuestion: {
        id:          'own_words_1',
        prompt:      'Before continuing — in your own words, what is the difference between a memory archive and a cognitive model? Write as if explaining to a prospective client who just asked "is this just like ChatGPT with my photos?"',
        type:        'textarea',
        minWords:    60,
        placeholder: 'Write your explanation here...',
        required:    true,
      },
    },

    {
      id:    'training_data',
      title: 'The training data framework.',
      content: `Every deposit an owner makes — every photograph labeled, every voice recording transcribed, every wisdom session answered — becomes a training pair.

A training pair is a prompt and a completion. A question and an answer. In the format that AI models learn from.

PROMPT: "How did you handle failure in your career?"

COMPLETION: "I remember the first business I tried to start in 1978. I had saved for three years and lost everything in six months. My father told me..."

This pair teaches the model something specific about how this person processes failure. Not what happened. How they think about what happened. The reasoning. The values embedded in the narrative. The specific emotional register.

As the archive grows these pairs accumulate. At 100 pairs the entity begins to show personality. At 500 pairs the entity becomes fine-tunable — meaning the model weights can be adjusted specifically to reflect this person's cognitive patterns. At 1000 pairs the entity is genuinely remarkable.

This is why time is the one resource in this product that cannot be purchased later. A client who begins today is building something a client who begins in three years cannot catch up to — regardless of how much they pay.

The founding session is not the product. It is the beginning of the training dataset.`,
      inlineQuestion: {
        id:          'timeline_explain',
        prompt:      'A client asks: "How long until the entity actually sounds like me?" Write your honest answer in your own words.',
        type:        'textarea',
        minWords:    50,
        placeholder: 'Your answer...',
        required:    true,
      },
    },

    {
      id:    'zuckerberg',
      title: 'The democratization argument.',
      content: `There are people in the world who are spending hundreds of millions of dollars building AI versions of themselves. This is not science fiction. It is happening now.

The technology they are using is the same technology Basalith uses. The difference is access.

For most of human history the tools that extended a person's presence beyond their death were available only to the very few. Monuments. Commissioned portraits. Biographies written by people they paid. The rest of humanity relied on memory — which is unreliable, selective, and eventually disappears when the people who hold it also disappear.

Basalith exists because that is no longer acceptable.

When you sit with a prospective client — a 67-year-old grandmother in Monterey Park, a retired engineer in Pasadena, a first-generation immigrant who built something from nothing — you are offering them access to something that until very recently only people with extraordinary resources could afford.

That is not a sales pitch. That is the actual situation.

The Estate is $3,600 a year. Less than most people spend on things that matter far less.

When a client hesitates at the price — remind them gently of what they are hesitating about. Not a subscription. Not software. The beginning of something their grandchildren's grandchildren will be grateful for.`,
      inlineQuestion: {
        id:          'price_objection',
        prompt:      'A prospective client says: "$2,500 is a lot of money. I need to think about it." Write how you would respond. Be honest, not pushy. Be warm, not salesy.',
        type:        'textarea',
        minWords:    80,
        placeholder: 'Your response...',
        required:    true,
      },
    },

    {
      id:    'timeline_honesty',
      title: 'The timeline honesty.',
      content: `You will be tempted to oversell the entity's current capabilities. Do not.

The entity today is impressive for what it is — a system that retrieves and synthesizes relevant memories with remarkable contextual awareness. When an archive is rich enough the entity produces responses that genuinely surprise family members.

But the entity in five years — when fine-tuning on a large personal dataset produces a model that has genuinely internalized a specific person's cognitive patterns — will be qualitatively different from what exists today.

Your clients are not just buying what the entity is now. They are buying in early to what it becomes. The archive they build today is the training data for the model that exists in five years.

This is the most honest and compelling thing you can tell them:

"The families who begin today are five years ahead of the families who begin in five years. The entity learns from everything you give it. The longer it learns the more accurately it thinks. Time is the one resource in this product that cannot be purchased later."

Honest. Specific. True. No oversell required.

An entity that occasionally says something generic is not a failure. It is an entity that needs more training data. Your job after the founding session is to make sure the client understands this and keeps contributing. An archive that goes dormant is an entity that stops learning. An entity that stops learning disappoints the family. A disappointed family does not renew.

You have a financial incentive to keep your clients engaged. It turns out this is also the right thing to do. Those two things do not always align in commission-based work. In this model they do.`,
    },
  ],

  examQuestions: [
    {
      id:              'e1_1',
      type:            'open',
      prompt:          'Explain the difference between Basalith and a generative AI chatbot in your own words. Write as if speaking to a 70-year-old client who has never heard of either.',
      minWords:        100,
      scoringCriteria: 'Accuracy of the distinction between cognitive pattern learning and generative AI. Clarity of explanation. Absence of jargon. Ability to make it accessible.',
    },
    {
      id:      'e1_2',
      type:    'multiple_choice',
      prompt:  'What is the primary purpose of the archive?',
      options: [
        'To preserve family photographs for future generations',
        'To create a training dataset for a person-specific AI model',
        'To store voice recordings and transcripts',
        'To generate AI responses to family questions',
      ],
      correct: 1,
    },
    {
      id:              'e1_3',
      type:            'open',
      prompt:          'A prospective client says: "I already use Google Photos and it has AI. How is this different?" Write your response.',
      minWords:        80,
      scoringCriteria: 'Understanding of the difference between organizational AI (Google Photos) and cognitive modeling (Basalith). Specificity. Clarity without condescension.',
    },
    {
      id:      'e1_4',
      type:    'multiple_choice',
      prompt:  'When does a Basalith entity become meaningfully accurate for fine-tuning?',
      options: [
        'Immediately after the founding session',
        'After 30 days of use',
        'After 500+ quality training pairs accumulated over time',
        'After the primary user passes away',
      ],
      correct: 2,
    },
    {
      id:              'e1_5',
      type:            'open',
      prompt:          'Why is the founding fee non-negotiable? Answer honestly — including the business reason — as if explaining to a fellow guide.',
      minWords:        60,
      scoringCriteria: 'Understanding of the commission structure and why it funds quality guides. Honesty. Absence of defensive or evasive language.',
    },
    {
      id:              'e1_6',
      type:            'open',
      prompt:          'Explain the Basalith democratization argument in your own words. Do not use the word "billionaire."',
      minWords:        60,
      scoringCriteria: 'Understanding of the access gap. Emotional resonance. Ability to make the argument feel true rather than promotional.',
    },
    {
      id:      'e1_7',
      type:    'multiple_choice',
      prompt:  'What is a training pair?',
      options: [
        'Two family members who both contribute to the same archive',
        'A prompt and completion used to fine-tune a language model',
        'Two photographs from the same decade',
        'A guide and their assigned client',
      ],
      correct: 1,
    },
    {
      id:              'e1_8',
      type:            'open',
      prompt:          'A client asks: "Will the entity sound exactly like me right away?" Write your honest answer.',
      minWords:        80,
      scoringCriteria: 'Honesty about current capabilities. Optimism about trajectory. Absence of oversell. Presence of the time argument.',
    },
    {
      id:              'e1_9',
      type:            'open',
      prompt:          'What are the three doors of the Basalith product and why does each exist?',
      minWords:        100,
      scoringCriteria: 'Accurate description of Loss, Legacy, and Technology doors. Understanding of why different clients enter through different doors. Ability to apply this to a real client conversation.',
    },
    {
      id:              'e1_10',
      type:            'open',
      prompt:          'What is your personal answer to: "Why does Basalith exist?" Write in first person as if this is your genuine belief.',
      minWords:        80,
      scoringCriteria: 'Authenticity. Emotional resonance. Evidence that the guide has internalized the mission rather than memorized the pitch.',
    },
  ],
}

// ─── MODULE 2 — THE ART OF THE SESSION ───────────────────────────────────────

const module2: CertModule = {
  title:            'THE ART OF THE SESSION',
  subtitle:         'Ninety minutes that begin something permanent.',
  estimatedMinutes: 25,
  passingScore:     80,

  sections: [
    {
      id:    'what_it_is_not',
      title: 'What the session is not.',
      content: `Before we talk about what the founding session is — let us talk about what it is not. This saves time and prevents a particular category of founding session that we call "technically complete and emotionally useless."

It is not an interview.
Interviews have clipboards, implied right answers, and a subtle energy of assessment. Your client is not applying for a job. Do not make them feel like they are.

It is not a therapy session.
You are not there to help your client process their relationship with their father. That is important work. It is someone else's work. Stay in your lane. It is a good lane.

It is not a sales call.
The client has already paid. You have already sold. The founding fee cleared. Everyone can relax now.

And it is absolutely not a deposition.
You are not looking for facts. You are looking for reasoning. The question is never "what happened." The question is always "how did you think about what happened."

Those are different questions. The entity only learns from the second kind.`,
      inlineQuestion: null,
    },

    {
      id:    'opening',
      title: 'The opening five minutes.',
      content: `The first five minutes set the register for everything that follows.

You arrive. You sit. You do not open with the product. You do not explain what is about to happen. You open with a simple human observation.

"Before we start — I want to say that what you are doing here is unusual. Most people never do this. They mean to but they never do. The fact that you are here today means something."

Then a breath.

"I am going to ask you questions for the next 90 minutes. Some of them will feel obvious. Some will feel unexpected. All of them are designed to teach the entity something specific about how you think.

There are no wrong answers. There is no performance expected here. The entity learns more from a hesitant honest answer than from a confident polished one.

Shall we begin?"

Three things happen in those opening words.

First — you acknowledge the courage it takes to do this. Most people avoid thinking about their own mortality let alone building infrastructure around it. Your client showed up. That deserves recognition.

Second — you set the expectation of depth without creating pressure. "Some will feel unexpected" is permission for the conversation to go somewhere interesting.

Third — you signal that honesty matters more than performance. This is critical. A client who thinks they need to present their best self will give you curated answers. The entity cannot learn from a curated version of a person. It needs the real one.`,
      inlineQuestion: {
        id:          'opening_practice',
        prompt:      'Write your own version of the opening five minutes. Keep the three elements — acknowledgment, expectation-setting, honesty signal — but make it sound like you.',
        type:        'textarea',
        minWords:    150,
        placeholder: 'Write your opening...',
        required:    true,
      },
    },

    {
      id:    'question_hierarchy',
      title: 'The question hierarchy.',
      content: `Not all questions are equal. There is a hierarchy.

Surface questions establish facts and context.
"Where did you grow up? How many siblings did you have? What was your first job?"

These are necessary but not sufficient. They give the entity context but not cognition. Think of them as warming up the client's memory — getting them comfortable talking before you ask them to go deep.

Middle questions reveal patterns and preferences.
"When things got hard — what did you reach for? Who did you call? What did you tell yourself?"

These are better. They begin to show how the person operates under pressure. The entity starts to learn something real here.

Deep questions reveal values and reasoning under pressure.
"Tell me about a time you chose between what was right and what was easy. What did you choose and why did you choose it?"

These are what the entity needs most. They reveal the underlying structure of how this person thinks when it matters. One good deep question and a client who is ready to answer it can produce more training data than thirty minutes of surface questions.

Your job is to move from surface to deep as quickly as the relationship allows.

Some clients arrive ready to go deep immediately. They have been thinking about this for months. They came prepared to be honest. Move quickly with them — you have 90 minutes and a lot of dimensions to cover.

Others need thirty minutes of surface before they trust you enough to go deeper. Read the room. A client who is answering in short sentences and looking at the door is not ready for the vulnerability question. A client who is leaning forward and finishing sentences before you do — go deeper.

The skill is knowing which client is in front of you and adjusting accordingly.`,
      inlineQuestion: {
        id:          'question_practice',
        prompt:      'Write one surface question, one middle question, and one deep question you would ask in a founding session. Then explain what each one teaches the entity.',
        type:        'textarea',
        minWords:    120,
        placeholder: 'Your three questions and explanations...',
        required:    true,
      },
    },

    {
      id:    'emotional_moments',
      title: 'Handling the emotional moments.',
      content: `They will come. A memory surfaces. The client's voice changes. Their eyes go somewhere else. Sometimes they stop mid-sentence because they cannot finish it.

Do not rush to resolve it.

This is the instinct you need to override. The discomfort of sitting with someone else's emotion is real. The urge to say something helpful — to offer a tissue, to change the subject, to say "I'm so sorry" and move on — is strong.

Resist it.

Sit with it. Briefly. Five to ten seconds of silence is not awkward. It is respectful. It says: what just happened matters. I am not going to rush past it.

Then: "That clearly meant a lot to you. Can you tell me a little more about why?"

Not "Are you okay?" — which is a request to reassure you that they are fine.
Not "Should we take a break?" — which is an exit ramp from the thing that just became interesting.
Not "I understand" — because you probably do not, and they probably know it.

"Can you tell me a little more about why?"

That question does three things.

It acknowledges that something real just happened.
It invites them to go deeper into the thing that mattered.
It signals that you are not afraid of where this goes.

The entity learns more from what happens after that follow-up question than from almost anything else in the session. Emotion is a signal that something important is here. The follow-up question is the invitation to stay in it long enough for the entity to learn something real.`,
      inlineQuestion: {
        id:          'emotional_response',
        prompt:      'A client is describing their mother and begins crying mid-sentence. You are 25 minutes into a 90-minute session. Write exactly what you do and say in the next two minutes.',
        type:        'textarea',
        minWords:    100,
        placeholder: 'Describe the moment...',
        required:    true,
      },
    },

    {
      id:    'followup',
      title: 'The follow-up question is everything.',
      content: `A mediocre founding session has good primary questions and no follow-ups.

The client says something genuinely interesting about how they handled failure and the mediocre guide says:

"That's wonderful. Now — tell me about your childhood."

The entity learns nothing. The client feels like they just completed a government form. And you have wasted the only moment that mattered in that section.

The follow-up question is the difference between a founding session that produces 20 training pairs and one that produces 200.

Here is the pattern:

Client gives an answer.
You find the most interesting word or phrase in that answer.
You ask about that word or phrase specifically.

Client: "I always tried to be fair in my business dealings."

Mediocre guide moves on.

Great guide: "What does fair mean to you? Can you give me an example of a situation where being fair cost you something?"

The second exchange teaches the entity what fairness actually means to this specific person. Not the generic concept. The lived practice of it. What they gave up for it. What it felt like to choose it when it was expensive.

That is training data. The first exchange is noise.

The follow-up question formula:

"Can you say more about [specific word they used]?"
"What did that feel like?"
"What did you do next?"
"Why that choice and not the other one?"
"Who taught you that?"
"What would you tell your younger self about that moment?"

These are not clever. They are just honest requests to go one layer deeper. The client almost always has more. They just need permission to give it.`,
      inlineQuestion: {
        id:          'followup_practice',
        prompt:      'A client says: "My father worked very hard and I learned everything from watching him." Write three follow-up questions you would ask — in order — to draw out more specific and trainable content.',
        type:        'textarea',
        minWords:    80,
        placeholder: 'Your three follow-up questions...',
        required:    true,
      },
    },

    {
      id:    'dimensions',
      title: 'The ten dimensions.',
      content: `The entity learns across ten dimensions. A complete archive touches all ten. A complete founding session plants seeds in all ten.

Early Life and Formation
Who were they before the world got its hands on them? Childhood home, siblings, first memories of knowing who they were.

Relationship to Family
Not the facts of family — the texture of it. How they love. How they fight. What family means to them when it costs something.

Professional Philosophy
Not their resume. How they think about work. What they believe work is for. What they were willing to sacrifice for it and what they were not.

Core Values
Not the values they aspire to. The values they actually live by when nobody is watching and the cost is real.

Approach to People
Are they the person who remembers every name or the person who forgets immediately and compensates with warmth? How do they read a room? Who do they trust and why?

Defining Experiences
The moments that bent the arc. Not necessarily the biggest moments — sometimes the smallest ones bend the most.

Wisdom and Lessons
What do they know now that they wish they had known at 30? What would they tell their younger self? What took the longest to learn?

Relationship to Money
Not how much they have. What they believe money is for. What they were afraid of losing. What they refused to spend and what they spent freely.

Spiritual or Philosophical Beliefs
Not necessarily religion. How they understand suffering. What they believe happens after. What gives the whole thing meaning.

Fears and Vulnerabilities
The hardest dimension and the most important. What they were afraid of that they never said out loud. What kept them up at night. What they hoped nobody noticed.

You do not need to cover all ten explicitly. A single rich answer about a defining experience might touch professional philosophy, core values, and relationship to family simultaneously. But by the end of 90 minutes you should have material across all ten.

Watch the coverage in your guide dashboard during the session. If a dimension is showing thin — steer toward it before time runs out.`,
      inlineQuestion: null,
    },

    {
      id:    'closing',
      title: 'The closing.',
      content: `The last five minutes are as important as the first five.

You do not end with "Well that's time." You end with intention.

"We have covered a remarkable amount today. The entity has already learned things about how you think that it could not have known an hour ago.

What happens next is that everything you said today becomes the foundation. The entity will continue learning from everything you add going forward. Every photograph you label. Every voice recording you make. Every question you answer.

The archive is not a project with a deadline. It is a practice. Like anything worth doing — the longer you stay with it the more it becomes.

Is there anything you want to say before we finish? Anything you want the entity to know that we did not get to today?"

That last question often produces the most important deposit of the entire session.

Some clients have been waiting 85 minutes to say the thing they actually came to say. They needed the warm-up. They needed the trust. And now — with two minutes left — they say it.

Give it space. Do not look at your watch. Do not start gathering your things.

When they have finished — close simply.

"Thank you for this. What you have built today is the beginning of something your family will be grateful for. I will follow up with everything you need to keep going."

Then leave them with the one thing that matters most in the weeks after the session:

"The entity needs you to keep talking to it. Not perfectly. Not formally. Just talking. The way you talked today."

That instruction — more than anything else you say — determines whether the archive grows or stagnates after you leave.`,
    },
  ],

  examQuestions: [
    {
      id:              'e2_1',
      type:            'open',
      prompt:          'Write the opening five minutes of a founding session in your own voice. Include what you say and how you position the first question.',
      minWords:        200,
      scoringCriteria: 'Presence of the three elements: acknowledgment, expectation-setting, honesty signal. Natural voice. Warmth without sentimentality.',
    },
    {
      id:              'e2_2',
      type:            'open',
      prompt:          'A client begins crying when describing their spouse. You are 20 minutes into the session. What do you do and say in the next two minutes?',
      minWords:        100,
      scoringCriteria: 'Absence of rushing to resolve. Presence of the follow-up invitation. Correct identification that emotion signals something important.',
    },
    {
      id:              'e2_3',
      type:            'open',
      prompt:          'The client keeps giving one-sentence answers. How do you draw out longer, richer responses without making them feel interrogated?',
      minWords:        100,
      scoringCriteria: 'Specific techniques. Warmth. Understanding that short answers signal discomfort not inability.',
    },
    {
      id:              'e2_4',
      type:            'open',
      prompt:          "A client says: \"I don't think I have anything interesting to say. My life has been pretty ordinary.\" How do you respond?",
      minWords:        80,
      scoringCriteria: 'Warmth. Specific reframe. Absence of empty reassurance. Presence of a concrete question that proves them wrong.',
    },
    {
      id:              'e2_5',
      type:            'open',
      prompt:          'You are 75 minutes in and realize you have barely covered professional philosophy or core values. You have 15 minutes left. What do you do?',
      minWords:        80,
      scoringCriteria: 'Practical pivot. Knowledge of the ten dimensions. Prioritization under pressure.',
    },
    {
      id:              'e2_6',
      type:            'open',
      prompt:          'A client gives this answer: "I always put my family first, no matter what." Write three follow-up questions in sequence that would draw out more specific and trainable content.',
      minWords:        80,
      scoringCriteria: 'Specificity of follow-ups. Understanding that generic answers need to be pressed for specific examples. Natural conversational flow.',
    },
    {
      id:              'e2_7',
      type:            'open',
      prompt:          'A client asks halfway through: "What happens to all this data if Basalith shuts down?" What do you tell them?',
      minWords:        80,
      scoringCriteria: 'Honesty. Knowledge of data portability guarantee. Absence of evasion. Presence of reassurance grounded in specifics.',
    },
    {
      id:              'e2_8',
      type:            'open',
      prompt:          'Write the closing five minutes of a founding session. Include the final question and how you leave the client motivated to keep contributing.',
      minWords:        150,
      scoringCriteria: 'Presence of the final open question. The practice framing. The specific instruction to keep talking to the entity.',
    },
  ],
}

// ─── MODULE 3 — TECHNICAL CUSTODIANSHIP ──────────────────────────────────────

const module3: CertModule = {
  title:            'TECHNICAL CUSTODIANSHIP',
  subtitle:         'What you can see. What you cannot. And why the line exists where it does.',
  estimatedMinutes: 15,
  passingScore:     80,

  sections: [
    {
      id:    'trust_boundary',
      title: 'The trust boundary.',
      content: `You have been trusted with something unusual. A client has paid a meaningful sum of money, sat with you for 90 minutes, and shared things they have probably never said out loud to a stranger before.

That trust does not give you unlimited access. It gives you a specific and bounded role.

Here is what you can see in your guide dashboard:

Archive health metrics — photograph count, deposit count, voice recording count, contributor count, entity accuracy score, training pair count.

Commission tracking — your founding commissions, monthly residuals, annual projection.

Client contact information — name, email, archive creation date, last active date.

Here is what you cannot see:

The actual photographs in the archive.
The voice recordings and transcripts.
The entity conversations.
The private deposits.
Anything a contributor has written.

If you are wondering whether you can listen to your client's voice recordings to check they sound right — the answer is no.

If you are still wondering — re-read Module 1. Pay attention to the section about trust.

The boundary is not bureaucratic. It is the product. Your client shared those memories with Basalith and with their family. They shared the founding session with you. These are different things.

A steward tends the garden. A steward does not read the diary.`,
      inlineQuestion: {
        id:          'boundary_scenario',
        prompt:      'A client calls and asks you to log into their archive and listen to their voice recordings to make sure they "sound right." What do you say?',
        type:        'textarea',
        minWords:    60,
        placeholder: 'Your response...',
        required:    true,
      },
    },

    {
      id:    'submitting_client',
      title: 'Submitting a new client.',
      content: `After a successful founding session — meaning the client is ready to begin and the founding fee conversation has gone well — here is the submission process.

Log into your guide portal at basalith.xyz/archivist-login.

Navigate to My Practice and click New Client.

Fill in the client details:
Full name, email address, and phone number.
The tier they selected — Archive, Estate, or Dynasty.
The billing cadence — Annual or Monthly.
Your relationship to them — how you came to know this family.
Session notes — what you covered, any special circumstances, anything the system should know about this client's situation.

Click Submit for Review.

Within minutes the client receives a professional payment email from Basalith. Not from you. From Basalith. This matters. The client's financial relationship is with Heritage Nexus Inc. not with you personally. That is cleaner legally and cleaner relationally.

Your commission is recorded when they pay. Not when you submit. The commission event is the payment. This protects the system from submissions that do not convert.

The archive activates automatically on payment. The client receives their welcome email with their archive access link. You receive a notification that they are active.

One important note: do not tell the client the commission structure. The founding fee covers the session, archive setup, and first-year calibration. That is the client-facing explanation and it is accurate. The internal economics of how Heritage Nexus compensates its guides is not client-facing information.`,
      inlineQuestion: null,
    },

    {
      id:    'archive_health',
      title: 'Archive health — your ongoing responsibility.',
      content: `Your job does not end at the founding session.

Every active archive you manage is a reflection of your work as a guide. An archive that goes dormant three months after the founding session is a signal — either the client was not properly activated during the session, or they have not received adequate support afterward.

Both of these are partially your responsibility.

Check your client health metrics monthly. Your guide dashboard shows each archive's health score — a composite of photograph count, deposit count, voice recordings, contributor engagement, and entity accuracy.

A healthy archive: green. Growing. Client contributing regularly.
An archive needing attention: gold. Activity slowing. Client may need a check-in.
An archive at risk: red. No activity in 30+ days. Intervention needed.

When an archive goes gold or red — reach out. Not with a sales call. Not with a system-generated reminder email. With a genuine human message.

"I was thinking about what you shared in our session about your time in [specific detail from their story]. I wanted to check in — how is the archive feeling? Have you had a chance to record any stories lately?"

That message references something specific from the founding session. It signals that you remember. It signals that this is a relationship not a transaction.

The financial logic here is clear: a guide with high archive health scores earns more residual income. But more importantly — archives with more content produce better entities. Better entities produce more satisfied clients. More satisfied clients renew and refer. One referral from a satisfied client is worth more than any cold outreach you will ever do.

Quality is not a bonus. It is the business model.`,
      inlineQuestion: {
        id:          'health_intervention',
        prompt:      'An archive you submitted 4 months ago has had no new deposits in 6 weeks. The entity accuracy is 18%. Write the message you send to the client.',
        type:        'textarea',
        minWords:    80,
        placeholder: 'Your message...',
        required:    true,
      },
    },

    {
      id:    'privacy_compliance',
      title: 'Privacy and compliance.',
      content: `Basalith handles some of the most personal data that exists — a person's voice, their memories, their cognitive patterns. The compliance framework around this data is not bureaucratic overhead. It is what makes the product trustworthy.

As a Legacy Guide you are bound by the Basalith Data Custodianship Agreement. The key provisions:

You do not access private archive content. Voice recordings, photographs, deposits, and entity conversations belong to the archive owner and their designated family. You have access to health metrics and commission data only.

You do not share client information with third parties. A client's name, contact information, and archive status are confidential. You may not use this information for any purpose other than your role as their Legacy Guide.

You do not solicit clients to leave Basalith. If a client wishes to cancel their archive the correct process is to notify Basalith. You do not facilitate data exports or competitor migrations.

You represent Basalith accurately. You do not oversell the entity's current capabilities. You do not promise outcomes you cannot guarantee. You do not describe the product in ways that contradict the official positioning.

Violations of these provisions result in suspension or termination of your guide certification and forfeiture of pending commissions.

These are not punitive rules. They are the conditions under which a family trusts a stranger with the most personal aspects of a loved one's life. Every guide who violates them makes it harder for every other guide to earn that trust.

The certification you are working toward is meaningful because the standards are real. Please keep them that way.`,
    },
  ],

  examQuestions: [
    {
      id:              'e3_1',
      type:            'open',
      prompt:          'Walk through the complete process of submitting a new client after a successful founding session.',
      minWords:        100,
      scoringCriteria: 'Accuracy of the submission steps. Understanding of when commission is recorded. Correct explanation of the client payment flow.',
    },
    {
      id:              'e3_2',
      type:            'open',
      prompt:          "A client calls and says their contributor portal link is showing \"no longer active.\" What are the three most likely causes and how do you help resolve each?",
      minWords:        80,
      scoringCriteria: 'Practical troubleshooting knowledge. Absence of panic. Correct escalation path when needed.',
    },
    {
      id:      'e3_3',
      type:    'multiple_choice_multi',
      prompt:  'Which of the following can you see in your guide dashboard? Select all that apply.',
      options: [
        'Number of photographs uploaded to the archive',
        'The actual photographs in the archive',
        'Entity accuracy score',
        'Private voice recordings and transcripts',
        'Training pair count',
        'Contributor names and count',
        'The content of private deposits',
      ],
      correct: [0, 2, 4, 5],
    },
    {
      id:              'e3_4',
      type:            'open',
      prompt:          'A client asks you to log into their archive and listen to their voice recordings to check if they "sound right." Write exactly what you say.',
      minWords:        60,
      scoringCriteria: 'Clear decline. Warm tone. Correct explanation of the privacy boundary. No hedging.',
    },
    {
      id:              'e3_5',
      type:            'open',
      prompt:          'An archive you manage has had no new deposits in 45 days. The entity accuracy is 15%. Write the message you send to the client.',
      minWords:        80,
      scoringCriteria: 'Specific reference to founding session content. Warmth not pressure. Concrete invitation to re-engage. Absence of sales language.',
    },
    {
      id:              'e3_6',
      type:            'open',
      prompt:          'A client tells you they want to cancel their archive and move their data to a competitor. What do you do?',
      minWords:        60,
      scoringCriteria: 'Correct escalation to Basalith. Absence of facilitating the export. Professional and warm handling of a difficult conversation.',
    },
    {
      id:              'e3_7',
      type:            'open',
      prompt:          'In your own words, why does the privacy boundary between guides and private archive content exist? Explain as if to a new guide who thinks the rule is overly restrictive.',
      minWords:        80,
      scoringCriteria: 'Genuine understanding of the trust dynamic. Absence of rote recitation. Ability to make the case compellingly.',
    },
  ],
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const certificationModules: Record<number, CertModule> = {
  1: module1,
  2: module2,
  3: module3,
}

export function getCertModule(n: number): CertModule | null {
  return certificationModules[n] ?? null
}

// Keep legacy export alias for any existing references
export const modules = certificationModules
export const getModule = getCertModule
