export async function handler(event) {
  const authHeader = event.headers.authorization;
  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (authHeader !== `Bearer ${ADMIN_KEY}`) {
    return { statusCode: 403, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  // Example data — integrate with storage later
  const logs = [
    { id: 1, letterType: "CP2000", status: "Analyzed", created: new Date().toISOString() },
    { id: 2, letterType: "Audit Notice", status: "Responded", created: new Date().toISOString() },
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Admin access granted", records: logs }),
  };
}
