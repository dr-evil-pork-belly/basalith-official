export const WEEKLY_PROMPTS: Record<string, string[]> = {
  professional_philosophy: [
    "Think about the moment you knew what kind of professional you wanted to be. Not the job — the kind of person at work. What happened and when was it?",
    "What is the most important professional decision you ever made that nobody else knew was a decision?",
    "Describe your worst professional failure in specific detail. What happened, what did you do, and what did it change about how you work?",
    "What do you know about building something that took you more than ten years to truly understand?",
    "What would you do differently in your career if you were starting over with what you know now?",
    "Who taught you the most about how to work — not what to work on, how to work? What did they show you?",
    "What is the difference between how you present your professional philosophy and how you actually live it day to day?",
    "Describe a moment when you chose integrity over opportunity. What happened and do you regret it?",
  ],
  relationship_to_family: [
    "What is something your children will only understand about you after you are gone?",
    "Describe a moment when you got parenting exactly right — not a big moment, a small one you have never forgotten.",
    "What did your parents get wrong that you have tried hardest to get right?",
    "What is the thing you have never said to the person in your family you are closest to — and why have you never said it?",
    "How has your understanding of what family means changed across your life?",
    "What family tradition matters most to you and why did it start?",
    "Describe the moment you felt most proud of someone in your family. What happened?",
    "What do you want your grandchildren to know about how you loved your family?",
  ],
  core_values: [
    "What do you believe that most people around you do not — a genuine conviction that makes you the odd one out?",
    "Describe a time your values cost you something real. Would you make the same choice again?",
    "What line have you never crossed — not because you were told not to but because something in you would not allow it?",
    "How have your core beliefs changed since you were 30? What changed them?",
    "What do you believe about how to treat people that you learned the hard way?",
    "If you could instill one belief in your grandchildren — one thing to hold onto when everything is hard — what would it be?",
    "What value did you inherit from your parents that you are most grateful for?",
    "What does integrity mean to you in practice — not as a concept but as a daily decision?",
  ],
  approach_to_money: [
    "What is the first time money felt real to you — not abstract but something with actual weight?",
    "What financial mistake taught you the most? Be specific.",
    "What do you actually believe money is for — not the answer that sounds right, your real answer?",
    "What would you tell your grandchildren about money that most people never figure out?",
    "How has your relationship with money changed across your life?",
    "What is the best financial decision you ever made and why did you make it?",
    "What did growing up teach you about money that you still carry today?",
    "What do you know about wealth that took you decades to learn?",
  ],
  approach_to_people: [
    "How do you know — quickly — whether someone is trustworthy? What do you look for?",
    "Describe someone who changed how you think about people. What did they teach you?",
    "What kind of person have you learned to stay away from — not a type, a specific pattern you now recognize immediately?",
    "What do you know about people that most people around you seem to keep learning the hard way?",
    "Who is the most interesting person you have ever known and what made them interesting?",
    "What have you learned about managing people that surprised you?",
    "Describe the moment you most misjudged someone. What did you miss and why?",
    "What does loyalty mean to you and where did that definition come from?",
  ],
  defining_experiences: [
    "What is the single experience that most changed the direction of your life?",
    "Describe the hardest period of your life in specific detail. What got you through it?",
    "What did you survive that you did not think you would survive?",
    "What risk did you take that most people in your position would not have taken?",
    "If your life were divided into chapters what would they be and what ended each one?",
    "What is the experience you return to most often in your mind — the one that keeps teaching you?",
    "Describe the moment everything changed. Not a big public moment — the quiet one that shifted everything.",
    "What experience do you wish you could give your children without them having to suffer it?",
  ],
  wisdom_and_lessons: [
    "What is the single most valuable thing you have learned — the insight that has given you the most leverage across every area of your life?",
    "What do you know now that you wish someone had told you at 25?",
    "What mistake have you watched other people make repeatedly that you learned to avoid?",
    "What does success actually look like to you now — not the version you used to believe?",
    "What is the most important thing to figure out early in life?",
    "What took you the longest to learn that now seems obvious?",
    "What advice do you give that you did not follow yourself when you were young?",
    "What is the thing you know that you cannot explain — you just know it from experience?",
  ],
  early_life: [
    "Describe where you grew up — not the facts, the feeling. What was the texture of your childhood world?",
    "What did your family not have when you were young that shaped how you think today?",
    "Who was the most important person in your early life outside your immediate family?",
    "What did you want to be when you were young — the real answer?",
    "What would your childhood self think of who you became?",
    "Describe a normal Tuesday when you were ten years old. What was the sound of that house?",
    "What is the earliest memory you have and what does it tell you about who you were?",
    "What did you figure out about life before most people your age figured it out?",
  ],
  spiritual_beliefs: [
    "What do you actually believe happens when we die — your real answer in your quietest moments?",
    "Has your relationship with faith changed across your life — and if so what changed it?",
    "What gives your life meaning — the real answer, not the one that sounds right?",
    "Have you ever experienced something you could not explain?",
    "What do you want your grandchildren to know about how you made sense of the hardest things in life?",
    "What do you believe about why we are here?",
    "What spiritual or philosophical idea has most shaped how you live?",
    "What do you believe about suffering — why it happens and what it is for?",
  ],
  fears_and_vulnerabilities: [
    "What are you actually afraid of — the ones that keep you up at night?",
    "What is the version of yourself you are most afraid of becoming?",
    "Where do you feel most out of your depth — the area where confidence has never quite arrived?",
    "What do you want most that you have been afraid to say out loud?",
    "What would you want your grandchildren to know about how you handled fear?",
    "What failure are you still not over — and what does that tell you about yourself?",
    "What makes you feel most human — most fallible, most uncertain?",
    "What have you been wrong about for a long time that you have finally admitted to yourself?",
  ],
}

export function getWeekNumber(): number {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
}

export function getWeeklyPrompt(dimension: string, weekNumber: number): string {
  const prompts = WEEKLY_PROMPTS[dimension] ?? WEEKLY_PROMPTS.wisdom_and_lessons
  return prompts[weekNumber % prompts.length]
}
