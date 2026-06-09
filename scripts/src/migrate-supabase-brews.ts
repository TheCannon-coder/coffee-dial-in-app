import pg from "pg";

const { Pool } = pg;

const SUPABASE_URL = "https://bdfkpchjvsbsbkdyjflo.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const EXCLUDE_EMAIL = "chris@cannoncoffeeco.com";

if (!SUPABASE_KEY) { console.error("SUPABASE_SERVICE_ROLE_KEY not set"); process.exit(1); }
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

interface SupabaseBrew {
  id: string;
  user_email?: string;
  created_at: string;
  method?: string;
  coffee?: string;
  dose?: string;
  water?: string;
  brew_time?: string;
  water_temp?: string;
  grinder_notes?: string;
  tasting_notes?: string;
  free_notes?: string;
  advice?: string;
  adjustment?: string;
  adjustment_history?: string[];
  [key: string]: unknown;
}

async function fetchAllBrews(): Promise<SupabaseBrew[]> {
  const rows: SupabaseBrew[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/brews?limit=${pageSize}&offset=${offset}&order=created_at.asc`,
      { headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) throw new Error(`Supabase fetch failed (${res.status}): ${await res.text()}`);
    const page: SupabaseBrew[] = await res.json();
    if (page.length === 0) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function main() {
  console.log("Fetching brews from Supabase...");
  const all = await fetchAllBrews();
  console.log(`Total rows fetched: ${all.length}`);

  if (all.length > 0) {
    console.log("All columns:", Object.keys(all[0]).join(", "));
    console.log("Sample row:", JSON.stringify(all[0], null, 2));
  }

  const filtered = all.filter(b => b.user_email?.toLowerCase() !== EXCLUDE_EMAIL);
  console.log(`\nRows after excluding ${EXCLUDE_EMAIL}: ${filtered.length} (skipped ${all.length - filtered.length})`);

  const pool = new Pool({ connectionString: DATABASE_URL });

  let inserted = 0;
  let skipped = 0;

  for (const brew of filtered) {
    // Resolve userId from users table
    const userRes = await pool.query<{ id: number }>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [brew.user_email?.toLowerCase() ?? null]
    );
    const userId = userRes.rows[0]?.id ?? null;

    const tastingNotes = brew.tasting_notes ?? brew.free_notes ?? "(migrated)";
    const advice = brew.advice ?? "(migrated — no advice recorded)";
    const adjustment = brew.adjustment ?? "none";

    try {
      await pool.query(
        `INSERT INTO brews
          (user_id, session_id, method, coffee_name, dose, water, brew_time, water_temp,
           grinder_notes, tasting_notes, free_notes, adjustment_history, advice, adjustment,
           ai_model, was_helpful, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT DO NOTHING`,
        [
          userId,
          `supabase-${brew.id}`,
          brew.method ?? null,
          brew.coffee ?? null,
          brew.dose ?? null,
          brew.water ?? null,
          brew.brew_time ?? null,
          brew.water_temp ?? null,
          brew.grinder_notes ?? null,
          tastingNotes,
          brew.free_notes ?? null,
          brew.adjustment_history ?? null,
          advice,
          adjustment,
          null,
          null,
          new Date(brew.created_at),
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`Failed to insert brew ${brew.id}:`, (err as Error).message);
      skipped++;
    }
  }

  const totalRes = await pool.query<{ count: string }>("SELECT COUNT(*) FROM brews");
  console.log(`\nMigration complete: ${inserted} inserted, ${skipped} failed`);
  console.log(`Total rows now in Replit brews table: ${totalRes.rows[0].count}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
