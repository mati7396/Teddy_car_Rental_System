(async function(){
  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    const base = 'http://localhost:5000/api';

    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@teddyrental.com', password: 'Password123!' })
    });
    const login = await loginRes.json();
    if (!login.token) { console.error('Login failed', login); process.exit(1); }
    const token = login.token;

    const notRes = await fetch(base + '/reports/my-notifications', { headers: { 'Authorization': 'Bearer ' + token } });
    const nots = await notRes.json();
    console.log('\nBEFORE NOTIFICATIONS SAMPLE:\n', JSON.stringify((nots||[]).slice(0,5), null, 2));

    if (!nots || nots.length === 0) { console.log('No notifications to test'); process.exit(0); }

    const nid = nots[0].id;
    const idNum = (typeof nid === 'string' && nid.startsWith('db-')) ? parseInt(nid.replace('db-',''), 10) : nid;
    console.log('Attempting to mark notification id ->', idNum);

    const patchRes = await fetch(`${base}/reports/notifications/${idNum}/read`, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + token } });
    const patchJson = await patchRes.json();
    console.log('PATCH RESULT:', patchRes.status, patchJson);

    const after = await (await fetch(base + '/reports/my-notifications', { headers: { 'Authorization': 'Bearer ' + token } })).json();
    console.log('\nAFTER NOTIFICATIONS SAMPLE:\n', JSON.stringify((after||[]).slice(0,5), null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
