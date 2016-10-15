var service = require('./service'),
    pg = require('pg'),
    http = require('http'),
    cron = require('node-schedule');

var scheduleJobs = function (tasks) {

    var taskNotify = tasks['notify'] || {schedule: "0 */5 * * * *"};
    cron.scheduleJob(taskNotify.schedule, function () {
        service.notify(null, function(err){
            if (err) console.err(err);
        });
    });
    console.log('Task "notify" has been registered');
};

var index = function (o) {
    var options = o || {};
    scheduleJobs(options['tasks'] || {});
};
index.route = require('./route');

module.exports = index;