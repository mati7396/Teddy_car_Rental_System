(async () => {
  const base = 'http://localhost:5000';
  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  const log = (tag, obj) => console.log('\n==', tag, '==\n', JSON.stringify(obj, null, 2));

  try {
    console.log('Starting test in 3s to allow server boot...');
    await wait(3000);

    // Login seeded customer
    let r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@test.com', password: 'customer123' })
    });
    const customerLogin = await r.json();
    log('customerLogin', customerLogin);
    const custToken = customerLogin.token;

    // Get customer bank account before
    r = await fetch(`${base}/api/payment/local-bank/account`, { headers: { Authorization: `Bearer ${custToken}` } });
    const custAccountBefore = await r.json();
    log('custAccountBefore', custAccountBefore);

    // Create booking
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    r = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ startDate: start, endDate: end, idCardUrl: 'id.jpg', driverLicenseUrl: 'lic.jpg', totalAmount: 1000 })
    });
    const booking = await r.json();
    log('bookingCreated', booking);
    const bookingId = booking.id;

    // Pay with local bank
    r = await fetch(`${base}/api/payment/local-bank/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ bookingId })
    });
    const payRes = await r.json();
    log('payRes', payRes);

    // Get customer bank account after payment
    r = await fetch(`${base}/api/payment/local-bank/account`, { headers: { Authorization: `Bearer ${custToken}` } });
    const custAccountAfterPay = await r.json();
    log('custAccountAfterPay', custAccountAfterPay);

    // Cancel booking (customer)
    r = await fetch(`${base}/api/bookings/${bookingId}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${custToken}` } });
    const cancelRes = await r.json();
    log('cancelRes', cancelRes);

    // Get customer bank account after refund
    r = await fetch(`${base}/api/payment/local-bank/account`, { headers: { Authorization: `Bearer ${custToken}` } });
    const custAccountAfterRefund = await r.json();
    log('custAccountAfterRefund', custAccountAfterRefund);

    // Login admin and get financials
    r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@teddyrental.com', password: 'Password123!' })
    });
    const adminLogin = await r.json();
    log('adminLogin', adminLogin);
    const adminToken = adminLogin.token;

    r = await fetch(`${base}/api/reports/financials`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const financials = await r.json();
    log('financials', financials);

    console.log('Test complete');
  } catch (err) {
    console.error('Test script error', err);
  }
})();
