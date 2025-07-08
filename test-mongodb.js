// Test MongoDB connection
const mongoose = require('mongoose');

// Default MongoDB URI for development
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/talqs';

// Get MongoDB URI from environment or use default
const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

console.log('Testing MongoDB connection...');
console.log('URI:', uri);

async function testConnection() {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB connected successfully!');
    
    // Create a simple test schema and model
    const TestSchema = new mongoose.Schema({
      name: String,
      createdAt: { type: Date, default: Date.now }
    });
    
    const Test = mongoose.models.Test || mongoose.model('Test', TestSchema);
    
    // Create a test document
    const testDoc = new Test({ name: 'Test Document ' + Date.now() });
    await testDoc.save();
    
    console.log('✅ Test document created successfully!');
    
    // Find all test documents
    const testDocs = await Test.find({});
    console.log(`Found ${testDocs.length} test documents:`);
    testDocs.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.name} (${doc.createdAt})`);
    });
    
    // Disconnect
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

testConnection();
