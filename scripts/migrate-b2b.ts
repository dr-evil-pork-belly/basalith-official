import { Client } from 'pg'

const PROJECT_REF = 'zmoauexzjfjloqxrkuma'
const DB_PASSWORD = process.env.DB_PASSWORD

if (!DB_PASSWORD) {
  console.error('DB_PASSWORD env var required')
  process.exit(1)
}

const client = new Client({
  host:     `db.${PROJECT_REF}.supabase.co`,
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
})

async function run() {
  await client.connect()
  console.log('Connected.')

  // ── b2b_questions ────────────────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS b2b_questions (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      category     TEXT        NOT NULL,
      question     TEXT        NOT NULL,
      description  TEXT,
      order_index  INTEGER     DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  await client.query(`ALTER TABLE b2b_questions ENABLE ROW LEVEL SECURITY;`)
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'b2b_questions' AND policyname = 'service_role_all_b2b_questions'
      ) THEN
        CREATE POLICY "service_role_all_b2b_questions" ON b2b_questions
          FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `)
  console.log('b2b_questions table ready.')

  // ── b2b_scenario_responses ───────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS b2b_scenario_responses (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      archive_id   UUID        NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
      scenario_id  TEXT        NOT NULL,
      response     TEXT        NOT NULL,
      source_type  TEXT        DEFAULT 'scenario',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  await client.query(`ALTER TABLE b2b_scenario_responses ENABLE ROW LEVEL SECURITY;`)
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'b2b_scenario_responses' AND policyname = 'service_role_all_scenario_responses'
      ) THEN
        CREATE POLICY "service_role_all_scenario_responses" ON b2b_scenario_responses
          FOR ALL TO service_role USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `)
  console.log('b2b_scenario_responses table ready.')

  // ── Seed b2b_questions (skip if already populated) ──────────────────────────
  const { rows: existing } = await client.query('SELECT COUNT(*) AS n FROM b2b_questions')
  if (parseInt(existing[0].n, 10) > 0) {
    console.log(`b2b_questions already has ${existing[0].n} rows — skipping seed.`)
  } else {
    await client.query(`
      INSERT INTO b2b_questions (category, question, description, order_index) VALUES
      ('Decision-Making', 'Walk me through the last major business decision you made. What information did you have? What did you ignore? What did you weight most heavily?', 'Decision process', 1),
      ('Decision-Making', 'Describe a decision where the data said one thing and your instinct said another. What did you do and why?', 'Data vs instinct', 2),
      ('Decision-Making', 'How do you know when you have enough information to act?', 'Decision threshold', 3),
      ('Decision-Making', 'What is the fastest you have ever made an important decision? What gave you that confidence?', 'Speed and conviction', 4),
      ('People', 'Tell me about the best hire you ever made. What did you see in them that others missed?', 'Talent recognition', 5),
      ('People', 'Tell me about a hiring mistake. What were the signals you ignored?', 'Pattern recognition', 6),
      ('People', 'How do you handle a high performer who is corrosive to the culture?', 'Values vs performance', 7),
      ('People', 'Describe a moment when you had to let someone go who you genuinely liked. How did you decide and how did you do it?', 'Hard people decisions', 8),
      ('People', 'Who do you call when you are genuinely uncertain? Why them?', 'Trusted counsel', 9),
      ('Risk', 'What is the biggest risk you have ever taken with the business? What made it acceptable?', 'Risk tolerance', 10),
      ('Risk', 'What risks do you refuse to take? Where is your hard line?', 'Hard limits', 11),
      ('Risk', 'Describe a moment when the business was genuinely in danger. How did you think about it?', 'Crisis thinking', 12),
      ('Risk', 'How do you think about the difference between a calculated risk and a gamble?', 'Risk framework', 13),
      ('Capital', 'How do you decide when to invest versus when to conserve?', 'Capital discipline', 14),
      ('Capital', 'Walk me through how you evaluate whether something is worth the capital required.', 'ROI framework', 15),
      ('Capital', 'Describe a time you underinvested. What did it cost you?', 'Capital regret', 16),
      ('Culture', 'What is the one thing about this organization that cannot change when you leave?', 'Non-negotiables', 17),
      ('Culture', 'How do you handle a moment when the organization values are tested by a business opportunity?', 'Values under pressure', 18),
      ('Culture', 'Describe a time someone challenged your decision publicly. How did you respond?', 'Authority and dissent', 19),
      ('Strategy', 'What opportunity have you consistently passed on? Why?', 'Strategic discipline', 20),
      ('Strategy', 'How do you think about timing — when to move fast and when to be patient?', 'Timing instinct', 21),
      ('Strategy', 'If you had to describe your competitive advantage in one sentence, what would it be?', 'Core edge', 22),
      ('Adversity', 'Describe the worst moment the business has faced. Walk me through how you thought and what you did.', 'Crisis response', 23),
      ('Adversity', 'What has failure taught you that success could not?', 'Failure as data', 24),
      ('Adversity', 'How do you make decisions under time pressure with incomplete information?', 'Pressure performance', 25),
      ('Succession', 'What do you wish someone had told you when you were in the successor position?', 'Founder wisdom', 26),
      ('Succession', 'What will be hardest for a successor to learn about this organization that cannot be written down?', 'Tacit knowledge', 27),
      ('Succession', 'What decision do you hope a successor will handle differently than you did?', 'Honest reflection', 28),
      ('Succession', 'Looking back at everything you have built, what do you most want a successor to understand about why this organization exists?', 'Purpose', 29)
    `)
    console.log('Seeded 29 questions.')
  }

  // ── Verify ───────────────────────────────────────────────────────────────────
  const { rows } = await client.query(`
    SELECT COUNT(*) AS count, category
    FROM b2b_questions
    GROUP BY category
    ORDER BY category
  `)
  console.log('\nVerification:')
  console.table(rows)

  await client.end()
}

run().catch(err => { console.error(err); process.exit(1) })
