#!/usr/bin/env node
// Funnel snapshot for the marketing Scorecard agent. Read-only; prints JSON.
// Uses Neon's SQL-over-HTTP endpoint so it needs no npm install — just Node 18+.
//
//   MARKETING_DATABASE_URL=postgresql://marketing_ro:...@host/db node marketing/scripts/funnel.mjs
//
// Founder accounts are excluded from every user-level metric: the north star is
// about customers, not Chris dialling in his own coffee. Nothing here returns
// emails or any per-user row — aggregates only.

const url = process.env.MARKETING_DATABASE_URL;
if (!url) {
  console.error("MARKETING_DATABASE_URL is not set");
  process.exit(1);
}
const host = new URL(url).hostname;

async function sql(query) {
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Neon-Connection-String": url, "Content-Type": "application/json" },
    body: JSON.stringify({ query, params: [] }),
  });
  const body = await res.json();
  if (!res.ok || body.rows === undefined) {
    throw new Error(`query failed (${res.status}): ${body.message ?? JSON.stringify(body).slice(0, 200)}`);
  }
  return body.rows;
}

// Founder = any account on the owner's domain, or a comped permanent-Pro account.
const FOUNDER = `(u.email ~ 'cannoncoffeeco' or coalesce(u.pro_permanent, false))`;
const NON_FOUNDER_USERS = `(select id from users u where not ${FOUNDER})`;

const one = async q => (await sql(q))[0];

const totals = await one(`
  with nf as (select id, created_at from users u where not ${FOUNDER}),
       b  as (select * from brews where user_id in (select id from nf))
  select
    (select count(*)::int from nf)                                                    as signups_total,
    (select count(*)::int from nf where created_at >= now() - interval '7 days')      as signups_7d,
    (select count(*)::int from nf where created_at >= now() - interval '30 days')     as signups_30d,
    (select count(distinct user_id)::int from b)                                      as ever_brewed,
    (select count(*)::int from nf n where not exists (select 1 from b where b.user_id = n.id)) as never_brewed,
    (select count(*)::int from (select user_id from b group by 1 having count(*) = 1) x)   as brewed_once,
    (select count(*)::int from (select user_id from b group by 1 having count(*) >= 3) x)  as brewed_3plus,
    (select count(distinct user_id)::int from b where created_at >= now() - interval '7 days')  as weekly_active_brewers,
    (select count(distinct user_id)::int from b where created_at >= now() - interval '28 days') as monthly_active_brewers,
    (select count(*)::int from b where created_at >= now() - interval '7 days')       as brews_7d,
    (select count(*)::int from b)                                                     as brews_total,
    (select count(*)::int from users u where is_pro and not coalesce(pro_permanent,false) and not (u.email ~ 'cannoncoffeeco')) as pro_paying,
    (select count(*)::int from referral_conversions)                                  as referral_conversions,
    (select count(*)::int from affiliates a join users u on u.id = a.user_id where not ${FOUNDER}) as affiliates_non_founder,
    (select count(*)::int from android_waitlist)                                      as android_waitlist,
    (select count(*)::int from b where was_helpful is true)                           as helpful_yes,
    (select count(*)::int from b where was_helpful is false)                          as helpful_no,
    (select count(*)::int from b where was_helpful is null)                           as helpful_unrated
`);

const weekly = await sql(`
  with wk as (select generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') as w)
  select to_char(w, 'YYYY-MM-DD') as week_start,
    (select count(distinct b.user_id)::int from brews b where b.user_id in ${NON_FOUNDER_USERS} and b.created_at >= w and b.created_at < w + interval '7 days') as active_brewers,
    (select count(*)::int from brews b where b.user_id in ${NON_FOUNDER_USERS} and b.created_at >= w and b.created_at < w + interval '7 days') as brews,
    (select count(*)::int from users u where not ${FOUNDER} and u.created_at >= w and u.created_at < w + interval '7 days') as signups
  from wk order by w
`);

const byMethod = await sql(`
  select b.method, count(distinct b.user_id)::int as users, count(*)::int as brews,
    count(distinct b.user_id) filter (where b.created_at >= now() - interval '28 days')::int as active_28d
  from brews b where b.user_id in ${NON_FOUNDER_USERS}
  group by 1 order by 2 desc
`);

// Activation by signup cohort: of the people who signed up in each of the last 8
// weeks, how many have brewed at all, and how many reached 3 brews.
const cohorts = await sql(`
  select to_char(date_trunc('week', u.created_at), 'YYYY-MM-DD') as signup_week,
    count(*)::int as signups,
    count(*) filter (where exists (select 1 from brews b where b.user_id = u.id))::int as brewed,
    count(*) filter (where (select count(*) from brews b where b.user_id = u.id) >= 3)::int as reached_3
  from users u
  where not ${FOUNDER} and u.created_at >= date_trunc('week', now()) - interval '7 weeks'
  group by 1 order by 1
`);

// Who the lifecycle agent would email, as counts only.
const lifecycle = await one(`
  with nf as (select id, created_at from users u where not ${FOUNDER})
  select
    (select count(*)::int from nf n where not exists (select 1 from brews b where b.user_id = n.id) and n.created_at < now() - interval '2 days' and n.created_at >= now() - interval '30 days') as never_brewed_2_to_30d,
    (select count(*)::int from nf n where not exists (select 1 from brews b where b.user_id = n.id) and n.created_at < now() - interval '30 days') as never_brewed_over_30d,
    (select count(*)::int from (select user_id, max(created_at) last from brews where user_id in (select id from nf) group by 1) x where last < now() - interval '14 days') as lapsed_14d,
    (select count(*)::int from (select user_id from brews where user_id in (select id from nf) group by 1 having count(*) = 1) x) as one_brew_only
`);

console.log(JSON.stringify({
  generated_at: new Date().toISOString(),
  note: "Founder accounts excluded. Aggregates only.",
  totals,
  weekly_last_12: weekly,
  by_method: byMethod,
  activation_by_signup_week: cohorts,
  lifecycle_audiences: lifecycle,
}, null, 2));
