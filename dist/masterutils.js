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

// Clone the array;
    this.lines = _.map(lines, _.clone);
};

Price.prototype.toJSON = function() {
    var obj = {};
    obj.lines = _.map(this.lines, _.clone);
    _.each(obj.lines, function(l) {
        if (typeof l.from === "number") l.from = du.int2date(l.from);
        if (typeof l.to === "number") l.to = du.int2date(l.to);
    });
    return obj;
};

Price.prototype.lineImport = function(line, options) {
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
    } else if ( (typeof line.price==="object") && (line.price.type === 'PER') ) {
        price = options.base * line.price.pricePC;
        if (price<line.price.priceMin) price = line.price.priceMin;
    } else if ( (typeof line.price==="object") && (line.price.type === 'ESC') ) {
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

Price.prototype.getImport = function(options) {
    var self = this;
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

Price.prototype.addPrice = function(p) {
        var self = this;
        if (!p) return;
        _.each(p.lines, function(l) {
            self.lines.push(_.clone(l));
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvUHJpY2UuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9kYXRlX3V0aWxzLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvZmFrZV80MjIxZjVjZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3JvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIHJvdW5kID0gcmVxdWlyZSgnLi9yb3VuZCcpO1xudmFyIGR1ID0gcmVxdWlyZSgnLi9kYXRlX3V0aWxzJyk7XG5cbnZhciBQcmljZSA9IGZ1bmN0aW9uKGxpbmVzKSB7XG4gICAgaWYgKCFsaW5lcykgbGluZXMgPVtdO1xuXG4gICAgLy8gSWYgYW5vdGhlciBwcmljZSAoaGFzIGxpbmVzKVxuICAgIGlmIChsaW5lcy5saW5lcykge1xuICAgICAgICBsaW5lcyA9IGxpbmVzLmxpbmVzO1xuICAgIH1cblxuLy8gQ2xvbmUgdGhlIGFycmF5O1xuICAgIHRoaXMubGluZXMgPSBfLm1hcChsaW5lcywgXy5jbG9uZSk7XG59O1xuXG5QcmljZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9iai5saW5lcyA9IF8ubWFwKHRoaXMubGluZXMsIF8uY2xvbmUpO1xuICAgIF8uZWFjaChvYmoubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsLmZyb20gPT09IFwibnVtYmVyXCIpIGwuZnJvbSA9IGR1LmludDJkYXRlKGwuZnJvbSk7XG4gICAgICAgIGlmICh0eXBlb2YgbC50byA9PT0gXCJudW1iZXJcIikgbC50byA9IGR1LmludDJkYXRlKGwudG8pO1xuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5QcmljZS5wcm90b3R5cGUubGluZUltcG9ydCA9IGZ1bmN0aW9uKGxpbmUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWUsXG4gICAgICAgIGJhc2U6IDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBwcmljZTtcbiAgICBpZiAodHlwZW9mIGxpbmUucHJpY2UgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgcHJpY2UgPSBsaW5lLnByaWNlO1xuICAgIH0gZWxzZSBpZiAoICh0eXBlb2YgbGluZS5wcmljZT09PVwib2JqZWN0XCIpICYmIChsaW5lLnByaWNlLnR5cGUgPT09ICdQRVInKSApIHtcbiAgICAgICAgcHJpY2UgPSBvcHRpb25zLmJhc2UgKiBsaW5lLnByaWNlLnByaWNlUEM7XG4gICAgICAgIGlmIChwcmljZTxsaW5lLnByaWNlLnByaWNlTWluKSBwcmljZSA9IGxpbmUucHJpY2UucHJpY2VNaW47XG4gICAgfSBlbHNlIGlmICggKHR5cGVvZiBsaW5lLnByaWNlPT09XCJvYmplY3RcIikgJiYgKGxpbmUucHJpY2UudHlwZSA9PT0gJ0VTQycpICkge1xuICAgICAgICBwcmljZT1OdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICBfLmVhY2gobGluZS5wcmljZS5zY2FsZVByaWNlcywgZnVuY3Rpb24oc3ApIHtcbiAgICAgICAgICAgIGlmICgoYmFzZSA8PSBzcC5zdGF5UHJpY2VNYXgpICYmIChzcC5wcmljZSA8IHByaWNlKSkge1xuICAgICAgICAgICAgICAgIHByaWNlID0gc3AucHJpY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocHJpY2UgPT09IE51bWJlci5NQVhfVkFMVUUpIHtcbiAgICAgICAgICAgIHByaWNlID0gTmFOO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGxpbmVJbXBvcnQgPSBwcmljZSAqIGxpbmUucXVhbnRpdHk7XG4gICAgaWYgKCFpc05hTihsaW5lLnBlcmlvZHMpKSB7XG4gICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0ICogbGluZS5wZXJpb2RzO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLndpdGhEaXNjb3VudHMpIHtcbiAgICAgICAgdmFyIGJhc2UgPSBsaW5lSW1wb3J0O1xuICAgICAgICBfLmVhY2gobGluZS5kaXNjb3VudHMsIGZ1bmN0aW9uKGRpc2NvdW50KSB7XG4gICAgICAgICAgICBpZiAoZGlzY291bnQudHlwZSA9PT0gXCJQQ1wiKSB7XG4gICAgICAgICAgICAgICAgbGluZUltcG9ydCA9IGxpbmVJbXBvcnQgLSBiYXNlICogZGlzY291bnQuUEMvMTAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy53aXRoVGF4ZXMpIHtcbiAgICAgICAgXy5lYWNoKGxpbmUudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgaWYgKHRheC50eXBlPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICBsaW5lSW1wb3J0ID0gbGluZUltcG9ydCAqICgxICsgdGF4LlBDLzEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnJvdW5kZWQpIHtcbiAgICAgICAgbGluZUltcG9ydCA9IHJvdW5kKGxpbmVJbXBvcnQsIFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpbmVJbXBvcnQ7XG59O1xuXG5QcmljZS5wcm90b3R5cGUuZ2V0SW1wb3J0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWVcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBvbGRSb3VuZGVkID0gb3B0aW9ucy5yb3VuZGVkO1xuXG4gICAgb3B0aW9ucy5yb3VuZGVkID0gZmFsc2U7XG4gICAgdmFyIGFjID0gXy5yZWR1Y2Uoc2VsZi5saW5lcywgZnVuY3Rpb24obWVtbywgbGluZSkge1xuICAgICAgICByZXR1cm4gbWVtbyArIHNlbGYubGluZUltcG9ydChsaW5lLCBvcHRpb25zKTtcbiAgICB9LDApO1xuXG4gICAgaWYgKG9sZFJvdW5kZWQpIHtcbiAgICAgICAgYWMgPSByb3VuZChhYywgXCJST1VORFwiLCAwLjAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWM7XG59O1xuXG5QcmljZS5wcm90b3R5cGUuYWRkUHJpY2UgPSBmdW5jdGlvbihwKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYgKCFwKSByZXR1cm47XG4gICAgICAgIF8uZWFjaChwLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgICAgIH0pO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5cbnZhciBtb21lbnQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snbW9tZW50J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydtb21lbnQnXSA6IG51bGwpO1xuXG52YXIgdmlydHVhbFRpbWUgPSBudWxsO1xuZXhwb3J0cy5ub3cgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodmlydHVhbFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIHZpcnR1YWxUaW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgpO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuc2V0VmlydHVhbFRpbWUgPSBmdW5jdGlvbih0KSB7XG4gICAgdmlydHVhbFRpbWUgPSB0O1xufTtcblxuZXhwb3J0cy5kYXRlMnN0ciA9IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsMTApO1xufTtcblxuZXhwb3J0cy5kYXRlMmludCA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoZC5nZXRUaW1lKCkgLyA4NjQwMDAwMCk7XG59O1xuXG5leHBvcnRzLmludERhdGUyc3RyID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBkdCA9IG5ldyBEYXRlKGQqODY0MDAwMDApO1xuICAgIHJldHVybiBkdC50b0lTT1N0cmluZygpLnN1YnN0cmluZygwLDEwKTtcbn07XG5cbmV4cG9ydHMuaW50MmRhdGUgPSBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgcmV0dXJuIGR0O1xufTtcblxuZXhwb3J0cy50b2RheSA9IGZ1bmN0aW9uKHR6KSB7XG4gICAgdHogPSB0eiB8fCAnVVRDJztcblxuICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eih0eik7XG4gICAgdmFyIGRhdGVTdHIgPSBkdC5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICB2YXIgZHQyID0gbmV3IERhdGUoZGF0ZVN0cisnVDAwOjAwOjAwLjAwMFonKTtcblxuICAgIHJldHVybiBkdDIuZ2V0VGltZSgpIC8gODY0MDAwMDA7XG59O1xuXG5cblxuXG5cbi8vLyBDUk9OIElNUExFTUVOVEFUSU9OXG5cbmZ1bmN0aW9uIG1hdGNoTnVtYmVyKG4sIGZpbHRlcikge1xuICAgIG4gPSBwYXJzZUludChuKTtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZpbHRlciA9PT0gJyonKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgZiA9IGZpbHRlci50b1N0cmluZygpO1xuICAgIHZhciBvcHRpb25zID0gZi5zcGxpdCgnLCcpO1xuICAgIGZvciAodmFyIGk9MDsgaTxvcHRpb25zOyBpKz0xKSB7XG4gICAgICAgIHZhciBhcnIgPSBvcHRpb25zW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGlmIChhcnIubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAocGFyc2VJbnQoYXJyWzBdLDEwKSA9PT0gbikgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJyLmxlbmd0aCA9PT0yKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHBhcnNlSW50KGFyclswXSwxMCk7XG4gICAgICAgICAgICB2YXIgdG8gPSBwYXJzZUludChhcnJbMV0sMTApO1xuICAgICAgICAgICAgaWYgKChuPj1mcm9tICkgJiYgKG48PSB0bykpIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBtYXRjaEpvYihqb2IsIGNyb25EYXRlKSB7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoMCwyKSwgam9iLm1pbnV0ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigyLDIpLCBqb2IuaG91cikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig0LDIpLCBqb2IuZGF5T2ZNb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig2LDIpLCBqb2IubW9udGgpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoOCwxKSwgam9iLmRheU9mV2VlaykpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxudmFyIGNyb25Kb2JzID0gW107XG5leHBvcnRzLmFkZENyb25Kb2IgPSBmdW5jdGlvbihqb2IpIHtcblxuXG4gICAgam9iLnR6ID0gam9iLnR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KGpvYi50eik7XG4gICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcbiAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICBjcm9uSm9icy5wdXNoKGpvYik7XG4gICAgcmV0dXJuIGNyb25Kb2JzLmxlbmd0aCAtMTtcbn07XG5cbmV4cG9ydHMuZGVsZXRlQ3JvbkpvYiA9IGZ1bmN0aW9uKGlkSm9iKSB7XG4gICAgZGVsZXRlIGNyb25Kb2JzW2lkSm9iXTtcbn07XG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uZSBhIG1pbnV0ZSBpbiB0aGUgYmVnaW5pbmcgb2YgZWFjaCBtaW51dGUuXG4vLyBpdCBpcyB1c2VkIHRvIGNyb24gYW55IGZ1bmN0aW9uXG52YXIgb25NaW51dGUgPSBmdW5jdGlvbigpIHtcblxuXG4gICAgY3JvbkpvYnMuZm9yRWFjaChmdW5jdGlvbihqb2IpIHtcbiAgICAgICAgaWYgKCFqb2IpIHJldHVybjtcblxuICAgICAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICAgICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcblxuICAgICAgICBpZiAoKGNyb25EYXRlICE9PSBqb2IubGFzdCkgJiYgKG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpKSkge1xuICAgICAgICAgICAgaWYgKGpvYi5leGVjdXRpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkpvYiB0YWtlcyB0b28gbG9uZyB0byBleGVjdXRlOiBcIiArIGpvYi5uYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgam9iLmxhc3QgPSBjcm9uRGF0ZTtcbiAgICAgICAgICAgICAgICBqb2IuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBqb2IuY2IoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG5vdyA9IGV4cG9ydHMubm93KCkuZ2V0VGltZSgpO1xuICAgIHZhciBtaWxsc1RvTmV4dE1pbnV0ZSA9IDYwMDAwIC0gbm93ICUgNjAwMDA7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgb25NaW51dGUoKTtcbiAgICB9LCBtaWxsc1RvTmV4dE1pbnV0ZSk7XG59O1xuXG5vbk1pbnV0ZSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIG1hc3RlclV0aWxzID0ge1xuICAgICAgICBkYXRlVXRpbHM6IHJlcXVpcmUoJy4vZGF0ZV91dGlscy5qcycpLFxuICAgICAgICByb3VuZDogcmVxdWlyZSgnLi9yb3VuZC5qcycpLFxuICAgICAgICBQcmljZTogIHJlcXVpcmUoJy4vUHJpY2UuanMnKVxuICAgIH07XG5cbiAgICB2YXIgcm9vdCA9IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyAmJiBzZWxmLnNlbGYgPT09IHNlbGYgJiYgc2VsZiB8fFxuICAgICAgICAgICAgdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsLmdsb2JhbCA9PT0gZ2xvYmFsICYmIGdsb2JhbCB8fFxuICAgICAgICAgICAgdGhpcztcblxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gbWFzdGVyVXRpbHM7XG4gICAgICAgIH1cbiAgICAgICAgZXhwb3J0cy5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbiAgICBpZiAod2luZG93KSB7XG4gICAgICAgIHdpbmRvdy5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH1cblxufSgpKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByb3VuZCh2YWwsIHJvdW5kaW5nVHlwZSwgcm91bmRpbmcpIHtcbiAgICB2YXIgdjtcbiAgICBpZiAoKCFyb3VuZGluZ1R5cGUpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiTk9ORVwiKSkge1xuICAgICAgICB2ID0gTWF0aC5yb3VuZCh2YWwgLyAwLjAxKSAqIDAuMDE7XG4gICAgfSBlbHNlIGlmICgocm91bmRpbmdUeXBlID09PSAxKSB8fCAocm91bmRpbmdUeXBlID09PSBcIkZMT09SXCIpKSB7XG4gICAgICAgIHY9IE1hdGguZmxvb3IodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIGlmICgocm91bmRpbmdUeXBlID09PSAyKSB8fCAocm91bmRpbmdUeXBlID09PSBcIlJPVU5EXCIpKSB7XG4gICAgICAgIHY9IE1hdGgucm91bmQodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIGlmICgocm91bmRpbmdUeXBlID09PSAzKSB8fCAocm91bmRpbmdUeXBlID09PSBcIkNFSUxcIikpIHtcbiAgICAgICAgdj0gTWF0aC5jZWlsKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcm91bmRpbmdUeXBlOiByb3VuZGluZ1R5cGVcIik7XG4gICAgfVxuICAgIHJldHVybiArKE1hdGgucm91bmQodiArIFwiZSsyXCIpICArIFwiZS0yXCIpO1xufTtcbiJdfQ==
