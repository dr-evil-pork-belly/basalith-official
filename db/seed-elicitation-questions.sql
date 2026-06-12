-- -- Migrate CONVERSATIONAL_PROMPTS (40) into elicitation_questions, tier='onramp' --

INSERT INTO elicitation_questions (scope, domain_id, tier, text) VALUES
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What did your home smell like when you were a child?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'Tell me about a meal you made so many times you stopped needing a recipe.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What is something small you do every day that no one would notice if you stopped?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'),    'onramp', 'Describe what a normal Sunday looked like when the house was busiest.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'adversity'), 'onramp', 'What is something you were afraid of that turned out to be nothing?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'),    'onramp', 'Tell me about a person you saw regularly but never really knew, like a neighbor or a shopkeeper.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What is a sound that immediately takes you somewhere else?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'Describe the best weather you have ever been in.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What did you drink first thing in the morning, and how did you make it?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'Describe a walk you have taken so many times you could do it with your eyes closed.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What could you see from the window of a kitchen you spent a lot of time in?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What does your handwriting look like, and has it changed over the years?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'What is a song you know every word to without trying?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What did you usually eat for lunch on an ordinary workday?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'),   'onramp', 'What kind of shoes did you wear as a kid, and where did they take you?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'Where in your home do you sit when you want to feel settled?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What was usually playing in the background at home, on the radio or the television?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What is a small task you only do at a certain time of year?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'),    'onramp', 'What is a phrase you picked up from someone and still say today?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'What time of day is quietest for you, and what do you do with it?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What is something you always keep in the kitchen, no matter what?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What is a kind of weather that brings a specific day back to you?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What do your hands do when they are busy and your mind wanders?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'),   'onramp', 'What sounds could you hear through the walls or windows where you grew up?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What did your first job smell like?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'Describe a cup or mug you have used for years.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'What did the last hour before bed look like in your house?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What is a shortcut or back way you take that most people do not know about?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'What did weekend breakfast look like when you were younger?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'Describe a drive you have made hundreds of times.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What is something around the house you have learned to fix yourself?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What is a smell that tells you a season has changed?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'Where is a place you have spent a lot of time waiting?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'Is there a chair or a seat that everyone knows is yours?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What does the light look like in your home early in the morning?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'What is something small you have ended up collecting without meaning to?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'),    'onramp', 'Whose voice could you recognize instantly, even in a crowd?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'),      'onramp', 'What is an errand you run on the same day most weeks?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'),    'onramp', 'What does rain sound like on the roof of a place you have lived?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'),       'onramp', 'Describe an ordinary day that you would happily live again.');


-- -- New elicitation_questions: 44 'standard' + 20 'deep' --

INSERT INTO elicitation_questions (scope, domain_id, tier, text) VALUES

-- origins / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'standard', 'What is the earliest home you remember, and what was one room in it like?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'standard', 'Who lived in your house when you were growing up?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'standard', 'What did the street outside your childhood home look like?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'standard', 'What is a meal that always reminds you of being young?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'standard', 'What did your parents do for work, and what did you learn watching them?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'standard', 'What is a story your family told over and over?'),
-- origins / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'deep', 'Why do you think your family did things the way they did?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'origins'), 'deep', 'What is something about how you were raised that you carried into your own life, and why did it stick?'),

-- people / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'), 'standard', 'Tell me about a friend you have known for a very long time.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'), 'standard', 'Who is someone who made you feel welcome when you needed it?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'), 'standard', 'Describe a person in your family who was hard to figure out.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'), 'standard', 'Tell me about someone you used to see often but have lost touch with.'),
-- people / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'), 'deep', 'Think of someone you have stayed close to for decades. Why do you think that friendship lasted when others did not?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'people'), 'deep', 'What did someone in your life teach you about how to treat people, and why does it still matter to you?'),

-- work / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'), 'standard', 'What was the first job you ever had, and what did a normal day look like?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'), 'standard', 'Tell me about a skill you picked up on the job that nobody taught you in school.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'), 'standard', 'Describe a workplace you spent a lot of time in.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'), 'standard', 'What is a tool or piece of equipment you got really good at using?'),
-- work / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'), 'deep', 'Why did you choose the kind of work you did?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'work'), 'deep', 'What is something about how you work that you think came from one specific experience?'),

-- decisions / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'decisions'), 'standard', 'Tell me about a time you had to choose between two places to live.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'decisions'), 'standard', 'Describe a decision that took you a long time to make.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'decisions'), 'standard', 'What is something you decided not to do, and what happened instead?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'decisions'), 'standard', 'Tell me about a purchase you thought hard about before making.'),
-- decisions / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'decisions'), 'deep', 'Think of a decision you would make again exactly the same way. What made it right?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'decisions'), 'deep', 'What is a choice you made that changed the direction of your life, and why did you make it?'),

-- values / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'values'), 'standard', 'What is a rule you have always followed, even when it was inconvenient?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'values'), 'standard', 'Tell me about something you refuse to do, no matter what.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'values'), 'standard', 'Describe a time you stood up for something small but important to you.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'values'), 'standard', 'What is something you were taught to never waste?'),
-- values / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'values'), 'deep', 'What is a belief you have actually tested in your own life? What convinced you it was right?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'values'), 'deep', 'Where did your sense of right and wrong come from? Name a person or a moment that shaped it.'),

-- adversity / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'adversity'), 'standard', 'Tell me about a time things did not go the way you planned.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'adversity'), 'standard', 'Describe a period when money was tight.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'adversity'), 'standard', 'What is something that scared you that you had to do anyway?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'adversity'), 'standard', 'Tell me about a time you had to start over.'),
-- adversity / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'adversity'), 'deep', 'When life knocked you down, what did you reach for first to get back up?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'adversity'), 'deep', 'What is something a hard time taught you that an easy time never could?'),

-- joy / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'), 'standard', 'Tell me about a day that felt easy and good for no special reason.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'), 'standard', 'What is something that always makes you laugh?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'), 'standard', 'Describe a place that makes you feel calm just thinking about it.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'), 'standard', 'Tell me about a small thing you look forward to.'),
-- joy / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'), 'deep', 'What is something simple that reliably makes you happy? Why do you think it works on you every time?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'joy'), 'deep', 'What makes a day feel well spent to you, and why that instead of something else?'),

-- senses / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'), 'standard', 'What is a smell that brings back a specific memory?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'), 'standard', 'Describe a sound you have not heard in years but would recognize instantly.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'), 'standard', 'What does the air feel like in a place you love?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'), 'standard', 'Tell me about a texture you find satisfying to touch.'),
-- senses / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'), 'deep', 'What is a smell or sound from years ago that has never left you? Why do you think it stayed?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'senses'), 'deep', 'What do you notice that other people seem to walk right past?'),

-- worldview / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'standard', 'Tell me about something that surprised you about how the world actually works.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'standard', 'Describe a time your opinion about something changed.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'standard', 'What is something you used to believe as a kid that you do not believe anymore?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'standard', 'Tell me about a place you visited that changed how you saw things.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'standard', 'What is some advice people give all the time that you would never give?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'standard', 'What has changed in your lifetime that nobody seems to talk about?'),
-- worldview / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'deep', 'What is an opinion you held for years and then dropped? What changed your mind?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'worldview'), 'deep', 'What is something you think most people get wrong, and why do you see it differently?'),

-- forward / standard
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'forward'), 'standard', 'What is something you hope stays the same for the people who come after you?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'forward'), 'standard', 'Tell me about a habit you hope someone else picks up from you.'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'forward'), 'standard', 'What is something you would want someone to know about you, even if they only had a few minutes?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'forward'), 'standard', 'Describe a place you would want someone you love to visit someday.'),
-- forward / deep
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'forward'), 'deep', 'What do you want to be remembered for, and why that instead of everything else?'),
('b2c', (SELECT id FROM cognitive_domains WHERE scope = 'b2c' AND slug = 'forward'), 'deep', 'What is something you have not said to someone that you find yourself thinking about saying?');


-- -- Verification: run after both INSERTs --
-- select tier, count(*) from elicitation_questions group by tier order by tier;
-- Expected: onramp 40, standard 44, deep 20.
