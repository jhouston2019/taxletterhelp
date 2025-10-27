// Simple test script to verify the function works
const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    text: "This is a test IRS letter for CP2000 notice.",
    fileUrl: null,
    imageUrl: null,
    userEmail: "test@example.com"
  })
};

console.log('Test event:', testEvent);
console.log('This would be sent to the analyze-letter function');
