exports.handler = async (event) => {
  console.log('Test function called at:', new Date().toISOString());
  console.log('Event method:', event.httpMethod);
  console.log('Event body:', event.body);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Test function working!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod
    })
  };
};
