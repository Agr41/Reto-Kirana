const { MongoClient } = require('mongodb');


const uri = "mongodb+srv://admin:admin@serviciosti.nvard.mongodb.net/?retryWrites=true&w=majority";
//const url = 'mongodb://localhost:27017';

const client = new MongoClient(uri);


const dbName = 'Kirana';

module.exports = {client, dbName}; 