var pg = require('pg');
var fs = require('fs');
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/flickr';
var env = process.env.ENV || 'local';
var client = new pg.Client(connectionString);
client.connect();

var sql = fs.readFileSync('./data/' + env + '-flickr.db.sql', "utf8");
console.log(sql.split("\n"));
var query = client.query(sql);
query.on('end', function() { client.end(); });