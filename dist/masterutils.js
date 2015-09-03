(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var round = require('./round');
var du = require('./date_utils');

var Price = function(lines) {
    if (!lines) lines =[];

    // If another price (has lines)
    if (lines.lines) {
        lines = lines.lines;
    }
    var self = this;

// Clone the array;
    self.lines = _.map(lines, _.clone);

    self.toJSON = function() {
        var obj = {};
        obj.lines = _.map(self.lines, _.clone);
        _.each(obj.lines, function(l) {
            if (typeof l.from === "number") l.from = du.int2date(l.from);
            if (typeof l.to === "number") l.to = du.int2date(l.to);
        });
        return obj;
    };

    self.lineImport = function(line, options) {
        options = options || {};
        options = _.extend({
            withTaxes: true,
            withDiscounts: true,
            rounded: true,
            base: 0
        }, options);

        var price;
        if (typeof line.price === "number") {
            price = line.price;
        } else if ( (line.price==="object") && (line.price.type === 'ESC') ) {
            price = options.base * line.price.pricePC;
            if (price<line.price.priceMin) price = line.price.priceMin;
        } else if ( (line.price==="object") && (line.price.type === 'ESC') ) {
            price=Number.MAX_VALUE;
            _.each(line.price.scalePrices, function(sp) {
                if ((base <= sp.stayPriceMax) && (sp.price < price)) {
                    price = sp.price;
                }
            });
            if (price === Number.MAX_VALUE) {
                price = NaN;
            }
        }

        var lineImport = price * line.quantity;
        if (!isNaN(line.periods)) {
            lineImport = lineImport * line.periods;
        }

        if (options.withDiscounts) {
            var base = lineImport;
            _.each(line.discounts, function(discount) {
                if (discount.type === "PC") {
                    lineImport = lineImport - base * discount.PC/100;
                }
            });
        }

        if (options.withTaxes) {
            _.each(line.taxes, function(tax) {
                if (tax.type=== "VAT") {
                    lineImport = lineImport * (1 + tax.PC/100);
                }
            });
        }

        if (options.rounded) {
            lineImport = round(lineImport, "ROUND", 0.01);
        }

        return lineImport;
    };

    self.getImport = function(options) {
        options = options || {};
        options = _.extend({
            withTaxes: true,
            withDiscounts: true,
            rounded: true
        }, options);

        var oldRounded = options.rounded;

        options.rounded = false;
        var ac = _.reduce(self.lines, function(memo, line) {
            return memo + self.lineImport(line, options);
        },0);

        if (oldRounded) {
            ac = round(ac, "ROUND", 0.01);
        }

        return ac;
    };

    self.addPrice = function(p) {
        if (!p) return;
        _.each(p.lines, function(l) {
            self.lines.push(_.clone(l));
        });
    };

};

module.exports = Price;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils":2,"./round":4}],2:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";


var moment = (typeof window !== "undefined" ? window['moment'] : typeof global !== "undefined" ? global['moment'] : null);

var virtualTime = null;
exports.now = function() {
    if (virtualTime) {
        return virtualTime;
    } else {
        return new Date();
    }
};

exports.setVirtualTime = function(t) {
    virtualTime = t;
};

exports.date2str = function (d) {
        return d.toISOString().substring(0,10);
};

exports.date2int = function(d) {
        return Math.floor(d.getTime() / 86400000);
};

exports.intDate2str = function(d) {
    var dt = new Date(d*86400000);
    return dt.toISOString().substring(0,10);
};

exports.int2date = function(d) {
    var dt = new Date(d*86400000);
    return dt;
};

exports.today = function(tz) {
    tz = tz || 'UTC';

    var dt = moment(exports.now()).tz(tz);
    var dateStr = dt.format('YYYY-MM-DD');
    var dt2 = new Date(dateStr+'T00:00:00.000Z');

    return dt2.getTime() / 86400000;
};





/// CRON IMPLEMENTATION

function matchNumber(n, filter) {
    n = parseInt(n);
    if (typeof filter === "undefined") return true;
    if (filter === '*') return true;
    if (filter === n) return true;
    var f = filter.toString();
    var options = f.split(',');
    for (var i=0; i<options; i+=1) {
        var arr = options[i].split('-');
        if (arr.length === 1) {
            if (parseInt(arr[0],10) === n) return true;
        } else if (arr.length ===2) {
            var from = parseInt(arr[0],10);
            var to = parseInt(arr[1],10);
            if ((n>=from ) && (n<= to)) return true;
        }
    }
    return false;
}


function matchJob(job, cronDate) {
    if (!matchNumber(cronDate.substr(0,2), job.minute)) return false;
    if (!matchNumber(cronDate.substr(2,2), job.hour)) return false;
    if (!matchNumber(cronDate.substr(4,2), job.dayOfMonth)) return false;
    if (!matchNumber(cronDate.substr(6,2), job.month)) return false;
    if (!matchNumber(cronDate.substr(8,1), job.dayOfWeek)) return false;
    return true;
}

var cronJobs = [];
exports.addCronJob = function(job) {


    job.tz = job.tz || 'UTC';

    var dt = moment(exports.now()).tz(job.tz);
    var cronDate = dt.format('mmHHDDMMd');
    job.last = cronDate;
    job.executing = false;
    cronJobs.push(job);
    return cronJobs.length -1;
};

exports.deleteCronJob = function(idJob) {
    delete cronJobs[idJob];
};

// This function is called one a minute in the begining of each minute.
// it is used to cron any function
var onMinute = function() {


    cronJobs.forEach(function(job) {
        if (!job) return;

        var dt = moment(exports.now()).tz(job.tz);
        var cronDate = dt.format('mmHHDDMMd');

        if ((cronDate !== job.last) && (matchJob(job, cronDate))) {
            if (job.executing) {
                console.log("Job takes too long to execute: " + job.name);
            } else {
                job.last = cronDate;
                job.executing = true;
                job.cb(function() {
                    job.executing = false;
                });
            }
        }
    });

    var now = exports.now().getTime();
    var millsToNextMinute = 60000 - now % 60000;
    setTimeout(function() {
        onMinute();
    }, millsToNextMinute);
};

onMinute();

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
(function (global){
/*jslint node: true */

(function() {
    "use strict";

    var masterUtils = {
        dateUtils: require('./date_utils.js'),
        round: require('./round.js'),
        Price:  require('./Price.js')
    };

    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = masterUtils;
        }
        exports.masterUtils = masterUtils;
    } else {
        root.masterUtils = masterUtils;
    }

    if (window) {
        window.masterUtils = masterUtils;
    }

}());

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Price.js":1,"./date_utils.js":2,"./round.js":4}],4:[function(require,module,exports){
/*jslint node: true */
"use strict";

module.exports = function round(val, roundingType, rounding) {
    var v;
    if ((!roundingType) || (roundingType === "NONE")) {
        v = Math.round(val / 0.01) * 0.01;
    } else if ((roundingType === 1) || (roundingType === "FLOOR")) {
        v= Math.floor(val / rounding) * rounding;
    } else if ((roundingType === 2) || (roundingType === "ROUND")) {
        v= Math.round(val / rounding) * rounding;
    } else if ((roundingType === 3) || (roundingType === "CEIL")) {
        v= Math.ceil(val / rounding) * rounding;
    } else {
        throw new Error("Invalid roundingType: roundingType");
    }
    return +(Math.round(v + "e+2")  + "e-2");
};

},{}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvUHJpY2UuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9kYXRlX3V0aWxzLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvZmFrZV84NzY3ZDk2LmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcm91bmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIHJvdW5kID0gcmVxdWlyZSgnLi9yb3VuZCcpO1xudmFyIGR1ID0gcmVxdWlyZSgnLi9kYXRlX3V0aWxzJyk7XG5cbnZhciBQcmljZSA9IGZ1bmN0aW9uKGxpbmVzKSB7XG4gICAgaWYgKCFsaW5lcykgbGluZXMgPVtdO1xuXG4gICAgLy8gSWYgYW5vdGhlciBwcmljZSAoaGFzIGxpbmVzKVxuICAgIGlmIChsaW5lcy5saW5lcykge1xuICAgICAgICBsaW5lcyA9IGxpbmVzLmxpbmVzO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbi8vIENsb25lIHRoZSBhcnJheTtcbiAgICBzZWxmLmxpbmVzID0gXy5tYXAobGluZXMsIF8uY2xvbmUpO1xuXG4gICAgc2VsZi50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmoubGluZXMgPSBfLm1hcChzZWxmLmxpbmVzLCBfLmNsb25lKTtcbiAgICAgICAgXy5lYWNoKG9iai5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBsLmZyb20gPT09IFwibnVtYmVyXCIpIGwuZnJvbSA9IGR1LmludDJkYXRlKGwuZnJvbSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGwudG8gPT09IFwibnVtYmVyXCIpIGwudG8gPSBkdS5pbnQyZGF0ZShsLnRvKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcblxuICAgIHNlbGYubGluZUltcG9ydCA9IGZ1bmN0aW9uKGxpbmUsIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIG9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgICAgICB3aXRoRGlzY291bnRzOiB0cnVlLFxuICAgICAgICAgICAgcm91bmRlZDogdHJ1ZSxcbiAgICAgICAgICAgIGJhc2U6IDBcbiAgICAgICAgfSwgb3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHByaWNlO1xuICAgICAgICBpZiAodHlwZW9mIGxpbmUucHJpY2UgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHByaWNlID0gbGluZS5wcmljZTtcbiAgICAgICAgfSBlbHNlIGlmICggKGxpbmUucHJpY2U9PT1cIm9iamVjdFwiKSAmJiAobGluZS5wcmljZS50eXBlID09PSAnRVNDJykgKSB7XG4gICAgICAgICAgICBwcmljZSA9IG9wdGlvbnMuYmFzZSAqIGxpbmUucHJpY2UucHJpY2VQQztcbiAgICAgICAgICAgIGlmIChwcmljZTxsaW5lLnByaWNlLnByaWNlTWluKSBwcmljZSA9IGxpbmUucHJpY2UucHJpY2VNaW47XG4gICAgICAgIH0gZWxzZSBpZiAoIChsaW5lLnByaWNlPT09XCJvYmplY3RcIikgJiYgKGxpbmUucHJpY2UudHlwZSA9PT0gJ0VTQycpICkge1xuICAgICAgICAgICAgcHJpY2U9TnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgICAgIF8uZWFjaChsaW5lLnByaWNlLnNjYWxlUHJpY2VzLCBmdW5jdGlvbihzcCkge1xuICAgICAgICAgICAgICAgIGlmICgoYmFzZSA8PSBzcC5zdGF5UHJpY2VNYXgpICYmIChzcC5wcmljZSA8IHByaWNlKSkge1xuICAgICAgICAgICAgICAgICAgICBwcmljZSA9IHNwLnByaWNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHByaWNlID09PSBOdW1iZXIuTUFYX1ZBTFVFKSB7XG4gICAgICAgICAgICAgICAgcHJpY2UgPSBOYU47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGluZUltcG9ydCA9IHByaWNlICogbGluZS5xdWFudGl0eTtcbiAgICAgICAgaWYgKCFpc05hTihsaW5lLnBlcmlvZHMpKSB7XG4gICAgICAgICAgICBsaW5lSW1wb3J0ID0gbGluZUltcG9ydCAqIGxpbmUucGVyaW9kcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLndpdGhEaXNjb3VudHMpIHtcbiAgICAgICAgICAgIHZhciBiYXNlID0gbGluZUltcG9ydDtcbiAgICAgICAgICAgIF8uZWFjaChsaW5lLmRpc2NvdW50cywgZnVuY3Rpb24oZGlzY291bnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGlzY291bnQudHlwZSA9PT0gXCJQQ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0IC0gYmFzZSAqIGRpc2NvdW50LlBDLzEwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLndpdGhUYXhlcykge1xuICAgICAgICAgICAgXy5lYWNoKGxpbmUudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgICAgIGlmICh0YXgudHlwZT09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0ICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnJvdW5kZWQpIHtcbiAgICAgICAgICAgIGxpbmVJbXBvcnQgPSByb3VuZChsaW5lSW1wb3J0LCBcIlJPVU5EXCIsIDAuMDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxpbmVJbXBvcnQ7XG4gICAgfTtcblxuICAgIHNlbGYuZ2V0SW1wb3J0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb3B0aW9ucyA9IF8uZXh0ZW5kKHtcbiAgICAgICAgICAgIHdpdGhUYXhlczogdHJ1ZSxcbiAgICAgICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgICAgICByb3VuZGVkOiB0cnVlXG4gICAgICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBvbGRSb3VuZGVkID0gb3B0aW9ucy5yb3VuZGVkO1xuXG4gICAgICAgIG9wdGlvbnMucm91bmRlZCA9IGZhbHNlO1xuICAgICAgICB2YXIgYWMgPSBfLnJlZHVjZShzZWxmLmxpbmVzLCBmdW5jdGlvbihtZW1vLCBsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gbWVtbyArIHNlbGYubGluZUltcG9ydChsaW5lLCBvcHRpb25zKTtcbiAgICAgICAgfSwwKTtcblxuICAgICAgICBpZiAob2xkUm91bmRlZCkge1xuICAgICAgICAgICAgYWMgPSByb3VuZChhYywgXCJST1VORFwiLCAwLjAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhYztcbiAgICB9O1xuXG4gICAgc2VsZi5hZGRQcmljZSA9IGZ1bmN0aW9uKHApIHtcbiAgICAgICAgaWYgKCFwKSByZXR1cm47XG4gICAgICAgIF8uZWFjaChwLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2U7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cblxudmFyIG1vbWVudCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wydtb21lbnQnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ21vbWVudCddIDogbnVsbCk7XG5cbnZhciB2aXJ0dWFsVGltZSA9IG51bGw7XG5leHBvcnRzLm5vdyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh2aXJ0dWFsVGltZSkge1xuICAgICAgICByZXR1cm4gdmlydHVhbFRpbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5zZXRWaXJ0dWFsVGltZSA9IGZ1bmN0aW9uKHQpIHtcbiAgICB2aXJ0dWFsVGltZSA9IHQ7XG59O1xuXG5leHBvcnRzLmRhdGUyc3RyID0gZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmRhdGUyaW50ID0gZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihkLmdldFRpbWUoKSAvIDg2NDAwMDAwKTtcbn07XG5cbmV4cG9ydHMuaW50RGF0ZTJzdHIgPSBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgcmV0dXJuIGR0LnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsMTApO1xufTtcblxuZXhwb3J0cy5pbnQyZGF0ZSA9IGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgZHQgPSBuZXcgRGF0ZShkKjg2NDAwMDAwKTtcbiAgICByZXR1cm4gZHQ7XG59O1xuXG5leHBvcnRzLnRvZGF5ID0gZnVuY3Rpb24odHopIHtcbiAgICB0eiA9IHR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KHR6KTtcbiAgICB2YXIgZGF0ZVN0ciA9IGR0LmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgIHZhciBkdDIgPSBuZXcgRGF0ZShkYXRlU3RyKydUMDA6MDA6MDAuMDAwWicpO1xuXG4gICAgcmV0dXJuIGR0Mi5nZXRUaW1lKCkgLyA4NjQwMDAwMDtcbn07XG5cblxuXG5cblxuLy8vIENST04gSU1QTEVNRU5UQVRJT05cblxuZnVuY3Rpb24gbWF0Y2hOdW1iZXIobiwgZmlsdGVyKSB7XG4gICAgbiA9IHBhcnNlSW50KG4pO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSAnKicpIHJldHVybiB0cnVlO1xuICAgIGlmIChmaWx0ZXIgPT09IG4pIHJldHVybiB0cnVlO1xuICAgIHZhciBmID0gZmlsdGVyLnRvU3RyaW5nKCk7XG4gICAgdmFyIG9wdGlvbnMgPSBmLnNwbGl0KCcsJyk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG9wdGlvbnM7IGkrPTEpIHtcbiAgICAgICAgdmFyIGFyciA9IG9wdGlvbnNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgaWYgKGFyci5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGlmIChwYXJzZUludChhcnJbMF0sMTApID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChhcnIubGVuZ3RoID09PTIpIHtcbiAgICAgICAgICAgIHZhciBmcm9tID0gcGFyc2VJbnQoYXJyWzBdLDEwKTtcbiAgICAgICAgICAgIHZhciB0byA9IHBhcnNlSW50KGFyclsxXSwxMCk7XG4gICAgICAgICAgICBpZiAoKG4+PWZyb20gKSAmJiAobjw9IHRvKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpIHtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigwLDIpLCBqb2IubWludXRlKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDIsMiksIGpvYi5ob3VyKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDQsMiksIGpvYi5kYXlPZk1vbnRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDYsMiksIGpvYi5tb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig4LDEpLCBqb2IuZGF5T2ZXZWVrKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG52YXIgY3JvbkpvYnMgPSBbXTtcbmV4cG9ydHMuYWRkQ3JvbkpvYiA9IGZ1bmN0aW9uKGpvYikge1xuXG5cbiAgICBqb2IudHogPSBqb2IudHogfHwgJ1VUQyc7XG5cbiAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuICAgIGpvYi5sYXN0ID0gY3JvbkRhdGU7XG4gICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgIGNyb25Kb2JzLnB1c2goam9iKTtcbiAgICByZXR1cm4gY3JvbkpvYnMubGVuZ3RoIC0xO1xufTtcblxuZXhwb3J0cy5kZWxldGVDcm9uSm9iID0gZnVuY3Rpb24oaWRKb2IpIHtcbiAgICBkZWxldGUgY3JvbkpvYnNbaWRKb2JdO1xufTtcblxuLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25lIGEgbWludXRlIGluIHRoZSBiZWdpbmluZyBvZiBlYWNoIG1pbnV0ZS5cbi8vIGl0IGlzIHVzZWQgdG8gY3JvbiBhbnkgZnVuY3Rpb25cbnZhciBvbk1pbnV0ZSA9IGZ1bmN0aW9uKCkge1xuXG5cbiAgICBjcm9uSm9icy5mb3JFYWNoKGZ1bmN0aW9uKGpvYikge1xuICAgICAgICBpZiAoIWpvYikgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eihqb2IudHopO1xuICAgICAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuXG4gICAgICAgIGlmICgoY3JvbkRhdGUgIT09IGpvYi5sYXN0KSAmJiAobWF0Y2hKb2Ioam9iLCBjcm9uRGF0ZSkpKSB7XG4gICAgICAgICAgICBpZiAoam9iLmV4ZWN1dGluZykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSm9iIHRha2VzIHRvbyBsb25nIHRvIGV4ZWN1dGU6IFwiICsgam9iLm5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGpvYi5jYihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbm93ID0gZXhwb3J0cy5ub3coKS5nZXRUaW1lKCk7XG4gICAgdmFyIG1pbGxzVG9OZXh0TWludXRlID0gNjAwMDAgLSBub3cgJSA2MDAwMDtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBvbk1pbnV0ZSgpO1xuICAgIH0sIG1pbGxzVG9OZXh0TWludXRlKTtcbn07XG5cbm9uTWludXRlKCk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbWFzdGVyVXRpbHMgPSB7XG4gICAgICAgIGRhdGVVdGlsczogcmVxdWlyZSgnLi9kYXRlX3V0aWxzLmpzJyksXG4gICAgICAgIHJvdW5kOiByZXF1aXJlKCcuL3JvdW5kLmpzJyksXG4gICAgICAgIFByaWNlOiAgcmVxdWlyZSgnLi9QcmljZS5qcycpXG4gICAgfTtcblxuICAgIHZhciByb290ID0gdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnICYmIHNlbGYuc2VsZiA9PT0gc2VsZiAmJiBzZWxmIHx8XG4gICAgICAgICAgICB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwuZ2xvYmFsID09PSBnbG9iYWwgJiYgZ2xvYmFsIHx8XG4gICAgICAgICAgICB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBtYXN0ZXJVdGlscztcbiAgICAgICAgfVxuICAgICAgICBleHBvcnRzLm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcm9vdC5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH1cblxuICAgIGlmICh3aW5kb3cpIHtcbiAgICAgICAgd2luZG93Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJvdW5kKHZhbCwgcm91bmRpbmdUeXBlLCByb3VuZGluZykge1xuICAgIHZhciB2O1xuICAgIGlmICgoIXJvdW5kaW5nVHlwZSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJOT05FXCIpKSB7XG4gICAgICAgIHYgPSBNYXRoLnJvdW5kKHZhbCAvIDAuMDEpICogMC4wMTtcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDEpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiRkxPT1JcIikpIHtcbiAgICAgICAgdj0gTWF0aC5mbG9vcih2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDIpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiUk9VTkRcIikpIHtcbiAgICAgICAgdj0gTWF0aC5yb3VuZCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDMpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiQ0VJTFwiKSkge1xuICAgICAgICB2PSBNYXRoLmNlaWwodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCByb3VuZGluZ1R5cGU6IHJvdW5kaW5nVHlwZVwiKTtcbiAgICB9XG4gICAgcmV0dXJuICsoTWF0aC5yb3VuZCh2ICsgXCJlKzJcIikgICsgXCJlLTJcIik7XG59O1xuIl19
