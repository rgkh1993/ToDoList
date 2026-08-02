import nodemailer from 'nodemailer';

const SB_URL = 'https://lasypudqtqxostkzujnu.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhc3lwdWRxdHF4b3N0a3p1am51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzcwNjQsImV4cCI6MjA5MTMxMzA2NH0.xu3b4553sa9Dxm1liz_aSLFzAUOfcBuOxm_9kzKnPpA';

const RECIPIENTS = {
  rishab: { email: 'rishabkhemka@gmail.com', name: 'Rishab', hour: 8 },
  kimi: { email: 'Kampolu@gmail.com', name: 'Kimi', hour: 10 },
};

function nyNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type).value;
  return { hour: parseInt(get('hour'), 10), dateKey: `${get('year')}-${get('month')}-${get('day')}` };
}

async function fetchUndoneTodos(owner, dateKey) {
  const url = `${SB_URL}/rest/v1/todos?select=*&date=eq.${dateKey}&done=eq.false&owner=in.(${owner},both)&order=created_at.asc`;
  const res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!res.ok) throw new Error(`Supabase query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sendDigest(owner, todos) {
  const { email, name } = RECIPIENTS[owner];
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  const listHtml = todos.map(t => `<li>${t.text}</li>`).join('');
  const listText = todos.map(t => `- ${t.text}`).join('\n');
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: `${name}, you have ${todos.length} task${todos.length === 1 ? '' : 's'} today`,
    text: `Today's undone tasks:\n\n${listText}`,
    html: `<p>Today's undone tasks:</p><ul>${listHtml}</ul>`,
  });
  console.log(`Sent digest to ${name} (${email}): ${todos.length} task(s).`);
}

async function main() {
  const { hour, dateKey } = nyNow();
  const owner = Object.keys(RECIPIENTS).find(k => RECIPIENTS[k].hour === hour);
  if (!owner) {
    console.log(`NY local hour is ${hour}, not a reminder hour (8 or 10). Skipping.`);
    return;
  }
  const todos = await fetchUndoneTodos(owner, dateKey);
  if (todos.length === 0) {
    console.log(`${RECIPIENTS[owner].name} has no undone tasks for ${dateKey}. Skipping send.`);
    return;
  }
  await sendDigest(owner, todos);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
