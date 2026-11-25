module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({error:'Method not allowed'}); }
  const {onRequestGet} = await import('../functions/api/health.js');
  const result = await onRequestGet({env:process.env});
  return res.status(result.status).json(await result.json());
};
