var path = require('path'),
    cron = require('node-schedule'),
    Flickr = require('flickrapi'),
    fs = require('fs'),
    pg = require('pg'),
    async = require("async"),
    https = require('https'),
    crypto = require('crypto'),
    request = require('request'),
    extend = require('extend'),
    connectionString = process.env.DATABASE_URL;

/**
 * 1 : Public
 * 2 : Friends only
 * 3 : Family only
 * 4 : Friends and Family
 * 5 : Private
 */
var service = function(){
    var self = this;
    this.sign_options = {};
    this.accounts_options = {};
    this.accounts_names = {};
    this.flickrs = {};
    this.info = {};

    async.series([
        function(next) {
            self.get_info(function (info) {
                self.info = info;
                next();
            });
        },
        function (next) {
            self.pg_connect(function (client, done) {
                var q = client.query('SELECT * FROM accounts');
                q.on('row', function (row) {
                    var id = row['account_id'];
                    self.accounts_options[id] = JSON.parse(row['options']);
                    self.accounts_names[id] = row['name'];
                    self.sign_options[id] = {
                        api_key: self.accounts_options[id].api_key,
                        oauth_consumer_key: self.accounts_options[id].api_key,
                        oauth_token: self.accounts_options[id].access_token
                    }
                });
                q.on('end', function () {
                    done();
                    next();
                });
            });
        },
        function (next) {
            self.init();
            next();
        }
    ]);
};

service.prototype.pg_connect = function (next) {
    console.log("connectionString", connectionString);
    pg.connect(connectionString, function (err, client, done) {
        // Handle connection errors
        if(err) {
            console.error(err);
            throw err;
        }
        next(client, done);
    });
};

service.prototype.init = function() {
    var self = this;
    async.forEach(Object.keys(this.accounts_options), function (key, callback) {
        Flickr.authenticate(self.accounts_options[key].api, function(err, flickr) {
            if (err) {
                throw err;
            }
            self.flickrs[key] = flickr;
            console.log(err,  self.accounts_options[key].api.api_key + " auth success")
        });
        callback();
    }, function () {

    });

};

service.prototype.sendNotification = function (account_id, res, topic, imageUrl) {
    console.log('send: ', res, ' topic: ', topic, 'info: ', this.info);

    var message = {
        to: '/topics/' + topic,
        data: {
            version: this.info.version,
            message: this.accounts_names[account_id],
            image: imageUrl
        }
    };
    var req1 = https.request({
        method: 'POST',
        host: 'android.googleapis.com',
        port: '443',
        path: '/gcm/send',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': this.accounts_options[account_id].gcm.authorization
        }
    }, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });
    req1.write(JSON.stringify(message));
    req1.end();
};

service.prototype.checkPhotos = function(account_id, privacy_filter, topics){
    var self = this;

    this.flickrs[account_id].people.getPhotos({
        api_key: self.accounts_options[account_id].api.api_key,
        user_id: self.accounts_options[account_id].api.user_id,
        per_page: 1,
        page: 1,
        privacy_filter: privacy_filter,
        extras: "url_q",

        oauth_consumer_key: self.accounts_options[account_id].api.api_key,
        oauth_token: self.accounts_options[account_id].api.access_token
    }, function(err, res){
        if (err) {
            console.error(err);
            throw err;
        }
        if (res.photos.photo.length == 0) {
            return;
        }
        var flickrLastId = res.photos.photo[0].id,
            imageUrl = res.photos.photo[0].url_q;
        self.pg_connect(function (client, done) {
            var q = client.query('SELECT last_id FROM topics WHERE privacy_filter = $1 and account_id = $2', [privacy_filter, account_id]);
            q.on('row', function (row) {
                if (flickrLastId != row['last_id']) {
                    q = client.query('UPDATE topics SET last_id = $1 WHERE privacy_filter = $2 and account_id = $3',
                        [flickrLastId, privacy_filter, account_id]);
                    q.on('end', function () {
                        q = client.query('UPDATE info SET value = $1 WHERE name = $2',
                            [JSON.stringify(new Date().toISOString()), "last_update"]);
                        topics.forEach(function (topic) {
                            self.sendNotification(account_id, res, topic, imageUrl);
                        });
                    });
                }
            });
            q.on('end', function () {
                q = client.query('UPDATE info SET value = $1 WHERE name = $2',
                    [JSON.stringify(new Date().toISOString()), "last_parse"]);
                done();
            });
        });
    });
};

service.prototype.notify = function(login, next){
    var self = this;
    console.log(next);
    if (login == null) {
        self.pg_connect(function (client, done) {
            var q = client.query('SELECT account_id, privacy_filter, topic FROM topics');
            q.on('row', function (row) {
                self.checkPhotos(row['account_id'], row['privacy_filter'], row['topic'].split(','));
                console.log('checkPhotos', row['account_id'], row['privacy_filter'], row['topic'].split(','))
            }).on('end', function () {
                done();
                next();
            })
        });
    } else {
        //this.get_my_topic(login);
    }
};

service.prototype.get_my_topics = function (emailOrUsername, done) {
    var self = this, topics = [], topic;
    async.forEach(Object.keys(this.accounts_options), function (key, callback) {
        self.get_my_topic(key, emailOrUsername, function(res) {
            if (res['error'] == undefined) {
                topics.push(res);
            }
            callback();
        });
    }, function () {
        done(topics);
    });
};

service.prototype.get_my_topic = function (account_id, emailOrUsername, done) {
    var self = this, names, topic;
    var api_options = self.accounts_options[account_id].api;
    function getInfo(err, res) {
        if (res == undefined || res.user == undefined) {
            return done({error: "user not found", code: 404});
        }
        var op = {
            api_key: api_options.api_key,
            user_id: res.user.id,
            oauth_consumer_key: api_options.api_key,
            oauth_token: api_options.access_token
        };
        self.flickrs[account_id].people.getInfo(op, function (err, res) {
            if (err) {
                return done({error: err, code: 500});
            }
            var person = res['person'];

            name = 'Public';
            if (person['family'] == '1' && person['friend'] == '1') {
                name = 'Friends and Family'
            } else if (person['family'] == '1') {
                name = 'Family only'
            } else if (person['friend']) {
                name = 'Friends only'
            }
            self.pg_connect(function (client, end) {
                q = client.query('SELECT topic FROM topics WHERE name = $1 and account_id = $2', [name, account_id]);
                q.on('row', function (row) {
                    topic = row['topic'];
                }).on('end', function () {
                    end();
                    done({account_id: account_id, topics: topic.split(','), level: name, name: self.accounts_names[account_id]});
                });
            });
        });
    }

    if (emailOrUsername.indexOf('@') != -1) {
        self.flickrs[account_id].people.findByEmail({api_key: api_options.api_key, find_email: emailOrUsername}, getInfo);
    } else {
        self.flickrs[account_id].people.findByUsername({api_key: api_options.api_key, username: emailOrUsername}, getInfo);
    }
};

service.prototype.get_info = function (exit) {
    this.pg_connect(function (client, done) {
        var info = {};
        q = client.query('SELECT name, value FROM info');
        q.on('row', function (row) {
            info[row['name']] = row['value'];
        }).on('end', function () {
            done();
            exit(info);
        });
    });
};



module.exports = new service();