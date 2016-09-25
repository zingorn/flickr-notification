var service = require('./service'),
    pg = require('pg');

var scheduleJobs = function (tasks) {
    var taskHealth = tasks['health'] || {schedule: "0 0 * * * *", url: 'http://flickr-wisekaa.herokuapp.com/health'};
    cron.scheduleJob(taskHealth.schedule, function () {
        http.get(taskHealth.url);
    });
    console.log('Task "health" has been registered');

    var taskNotify = tasks['notify'] || {schedule: "0 */5 * * * *"};
    cron.scheduleJob(taskNotify.schedule, function () {
        service.notify(null, function(err){
            if (err) console.err(err);
        });
    });
    console.log('Task "notify" has been registered');
};

var index = function (options) {
    scheduleJobs(options.tasks || {});
};
index.route = require('./route');

module.exports = index;