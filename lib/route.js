var express = require('express');
var service = require('./service');
var router = express.Router();
var async = require("async");


router.post('/', function (req, res, next) {
    var login = req.param['login'];
    async.series([
        function (next) {
            service.notify(login, function(err){
                if (err) {
                    console.log(err);
                    return res.status(500).json({success: false, data: err});
                }
                next();
            });
        },
        function(next){
            res.send('OK');
        }
    ]);
});

router.post('/topic', function(req, res, next) {
    var params = req.body;
    var result;
    async.series([
        function (next) {
            service.get_my_topics(params.email, function(res){
                result = res;
                next();
            });
        }, function () {
            console.log('Get Topic response: ', result);
            if (result.error != undefined) {
                res.statusCode = result.code;
            }
            res.json(result);
        }
    ]);
});


router.get('/info', function (req, res, next) {
    var result;
    async.series([
        function (next) {
            service.get_info(function (obj) {
                result = obj;
                next();
            })
        },
        function () {
            res.json(result);
        }
    ])
});

// router.get('/search', function (req, res, next) {
//     var result,
//         params = req.query;
//     async.series([
//         function (next) {
//             flickr.search(params.query, function (obj) {
//                 result = obj;
//                 next();
//             })
//         },
//         function () {
//             res.json(result);
//         }
//     ])
// });
module.exports = router;
