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
    } else if ( (line.price==="object") && (line.price.type === 'PER') ) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvUHJpY2UuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9kYXRlX3V0aWxzLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvZmFrZV82ODhkYWE3ZS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3JvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIHJvdW5kID0gcmVxdWlyZSgnLi9yb3VuZCcpO1xudmFyIGR1ID0gcmVxdWlyZSgnLi9kYXRlX3V0aWxzJyk7XG5cbnZhciBQcmljZSA9IGZ1bmN0aW9uKGxpbmVzKSB7XG4gICAgaWYgKCFsaW5lcykgbGluZXMgPVtdO1xuXG4gICAgLy8gSWYgYW5vdGhlciBwcmljZSAoaGFzIGxpbmVzKVxuICAgIGlmIChsaW5lcy5saW5lcykge1xuICAgICAgICBsaW5lcyA9IGxpbmVzLmxpbmVzO1xuICAgIH1cblxuLy8gQ2xvbmUgdGhlIGFycmF5O1xuICAgIHRoaXMubGluZXMgPSBfLm1hcChsaW5lcywgXy5jbG9uZSk7XG59O1xuXG5QcmljZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9iai5saW5lcyA9IF8ubWFwKHRoaXMubGluZXMsIF8uY2xvbmUpO1xuICAgIF8uZWFjaChvYmoubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsLmZyb20gPT09IFwibnVtYmVyXCIpIGwuZnJvbSA9IGR1LmludDJkYXRlKGwuZnJvbSk7XG4gICAgICAgIGlmICh0eXBlb2YgbC50byA9PT0gXCJudW1iZXJcIikgbC50byA9IGR1LmludDJkYXRlKGwudG8pO1xuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5QcmljZS5wcm90b3R5cGUubGluZUltcG9ydCA9IGZ1bmN0aW9uKGxpbmUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWUsXG4gICAgICAgIGJhc2U6IDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBwcmljZTtcbiAgICBpZiAodHlwZW9mIGxpbmUucHJpY2UgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgcHJpY2UgPSBsaW5lLnByaWNlO1xuICAgIH0gZWxzZSBpZiAoIChsaW5lLnByaWNlPT09XCJvYmplY3RcIikgJiYgKGxpbmUucHJpY2UudHlwZSA9PT0gJ1BFUicpICkge1xuICAgICAgICBwcmljZSA9IG9wdGlvbnMuYmFzZSAqIGxpbmUucHJpY2UucHJpY2VQQztcbiAgICAgICAgaWYgKHByaWNlPGxpbmUucHJpY2UucHJpY2VNaW4pIHByaWNlID0gbGluZS5wcmljZS5wcmljZU1pbjtcbiAgICB9IGVsc2UgaWYgKCAobGluZS5wcmljZT09PVwib2JqZWN0XCIpICYmIChsaW5lLnByaWNlLnR5cGUgPT09ICdFU0MnKSApIHtcbiAgICAgICAgcHJpY2U9TnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgXy5lYWNoKGxpbmUucHJpY2Uuc2NhbGVQcmljZXMsIGZ1bmN0aW9uKHNwKSB7XG4gICAgICAgICAgICBpZiAoKGJhc2UgPD0gc3Auc3RheVByaWNlTWF4KSAmJiAoc3AucHJpY2UgPCBwcmljZSkpIHtcbiAgICAgICAgICAgICAgICBwcmljZSA9IHNwLnByaWNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHByaWNlID09PSBOdW1iZXIuTUFYX1ZBTFVFKSB7XG4gICAgICAgICAgICBwcmljZSA9IE5hTjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBsaW5lSW1wb3J0ID0gcHJpY2UgKiBsaW5lLnF1YW50aXR5O1xuICAgIGlmICghaXNOYU4obGluZS5wZXJpb2RzKSkge1xuICAgICAgICBsaW5lSW1wb3J0ID0gbGluZUltcG9ydCAqIGxpbmUucGVyaW9kcztcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy53aXRoRGlzY291bnRzKSB7XG4gICAgICAgIHZhciBiYXNlID0gbGluZUltcG9ydDtcbiAgICAgICAgXy5lYWNoKGxpbmUuZGlzY291bnRzLCBmdW5jdGlvbihkaXNjb3VudCkge1xuICAgICAgICAgICAgaWYgKGRpc2NvdW50LnR5cGUgPT09IFwiUENcIikge1xuICAgICAgICAgICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0IC0gYmFzZSAqIGRpc2NvdW50LlBDLzEwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMud2l0aFRheGVzKSB7XG4gICAgICAgIF8uZWFjaChsaW5lLnRheGVzLCBmdW5jdGlvbih0YXgpIHtcbiAgICAgICAgICAgIGlmICh0YXgudHlwZT09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgbGluZUltcG9ydCA9IGxpbmVJbXBvcnQgKiAoMSArIHRheC5QQy8xMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5yb3VuZGVkKSB7XG4gICAgICAgIGxpbmVJbXBvcnQgPSByb3VuZChsaW5lSW1wb3J0LCBcIlJPVU5EXCIsIDAuMDEpO1xuICAgIH1cblxuICAgIHJldHVybiBsaW5lSW1wb3J0O1xufTtcblxuUHJpY2UucHJvdG90eXBlLmdldEltcG9ydCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IF8uZXh0ZW5kKHtcbiAgICAgICAgd2l0aFRheGVzOiB0cnVlLFxuICAgICAgICB3aXRoRGlzY291bnRzOiB0cnVlLFxuICAgICAgICByb3VuZGVkOiB0cnVlXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgb2xkUm91bmRlZCA9IG9wdGlvbnMucm91bmRlZDtcblxuICAgIG9wdGlvbnMucm91bmRlZCA9IGZhbHNlO1xuICAgIHZhciBhYyA9IF8ucmVkdWNlKHNlbGYubGluZXMsIGZ1bmN0aW9uKG1lbW8sIGxpbmUpIHtcbiAgICAgICAgcmV0dXJuIG1lbW8gKyBzZWxmLmxpbmVJbXBvcnQobGluZSwgb3B0aW9ucyk7XG4gICAgfSwwKTtcblxuICAgIGlmIChvbGRSb3VuZGVkKSB7XG4gICAgICAgIGFjID0gcm91bmQoYWMsIFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFjO1xufTtcblxuUHJpY2UucHJvdG90eXBlLmFkZFByaWNlID0gZnVuY3Rpb24ocCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGlmICghcCkgcmV0dXJuO1xuICAgICAgICBfLmVhY2gocC5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUobCkpO1xuICAgICAgICB9KTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxuXG52YXIgbW9tZW50ID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ21vbWVudCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnbW9tZW50J10gOiBudWxsKTtcblxudmFyIHZpcnR1YWxUaW1lID0gbnVsbDtcbmV4cG9ydHMubm93ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHZpcnR1YWxUaW1lKSB7XG4gICAgICAgIHJldHVybiB2aXJ0dWFsVGltZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoKTtcbiAgICB9XG59O1xuXG5leHBvcnRzLnNldFZpcnR1YWxUaW1lID0gZnVuY3Rpb24odCkge1xuICAgIHZpcnR1YWxUaW1lID0gdDtcbn07XG5cbmV4cG9ydHMuZGF0ZTJzdHIgPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC50b0lTT1N0cmluZygpLnN1YnN0cmluZygwLDEwKTtcbn07XG5cbmV4cG9ydHMuZGF0ZTJpbnQgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKGQuZ2V0VGltZSgpIC8gODY0MDAwMDApO1xufTtcblxuZXhwb3J0cy5pbnREYXRlMnN0ciA9IGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgZHQgPSBuZXcgRGF0ZShkKjg2NDAwMDAwKTtcbiAgICByZXR1cm4gZHQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmludDJkYXRlID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBkdCA9IG5ldyBEYXRlKGQqODY0MDAwMDApO1xuICAgIHJldHVybiBkdDtcbn07XG5cbmV4cG9ydHMudG9kYXkgPSBmdW5jdGlvbih0eikge1xuICAgIHR6ID0gdHogfHwgJ1VUQyc7XG5cbiAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHoodHopO1xuICAgIHZhciBkYXRlU3RyID0gZHQuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgdmFyIGR0MiA9IG5ldyBEYXRlKGRhdGVTdHIrJ1QwMDowMDowMC4wMDBaJyk7XG5cbiAgICByZXR1cm4gZHQyLmdldFRpbWUoKSAvIDg2NDAwMDAwO1xufTtcblxuXG5cblxuXG4vLy8gQ1JPTiBJTVBMRU1FTlRBVElPTlxuXG5mdW5jdGlvbiBtYXRjaE51bWJlcihuLCBmaWx0ZXIpIHtcbiAgICBuID0gcGFyc2VJbnQobik7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiB0cnVlO1xuICAgIGlmIChmaWx0ZXIgPT09ICcqJykgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZpbHRlciA9PT0gbikgcmV0dXJuIHRydWU7XG4gICAgdmFyIGYgPSBmaWx0ZXIudG9TdHJpbmcoKTtcbiAgICB2YXIgb3B0aW9ucyA9IGYuc3BsaXQoJywnKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3B0aW9uczsgaSs9MSkge1xuICAgICAgICB2YXIgYXJyID0gb3B0aW9uc1tpXS5zcGxpdCgnLScpO1xuICAgICAgICBpZiAoYXJyLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHBhcnNlSW50KGFyclswXSwxMCkgPT09IG4pIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGFyci5sZW5ndGggPT09Mikge1xuICAgICAgICAgICAgdmFyIGZyb20gPSBwYXJzZUludChhcnJbMF0sMTApO1xuICAgICAgICAgICAgdmFyIHRvID0gcGFyc2VJbnQoYXJyWzFdLDEwKTtcbiAgICAgICAgICAgIGlmICgobj49ZnJvbSApICYmIChuPD0gdG8pKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gbWF0Y2hKb2Ioam9iLCBjcm9uRGF0ZSkge1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDAsMiksIGpvYi5taW51dGUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoMiwyKSwgam9iLmhvdXIpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoNCwyKSwgam9iLmRheU9mTW9udGgpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoNiwyKSwgam9iLm1vbnRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDgsMSksIGpvYi5kYXlPZldlZWspKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBjcm9uSm9icyA9IFtdO1xuZXhwb3J0cy5hZGRDcm9uSm9iID0gZnVuY3Rpb24oam9iKSB7XG5cblxuICAgIGpvYi50eiA9IGpvYi50eiB8fCAnVVRDJztcblxuICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eihqb2IudHopO1xuICAgIHZhciBjcm9uRGF0ZSA9IGR0LmZvcm1hdCgnbW1ISERETU1kJyk7XG4gICAgam9iLmxhc3QgPSBjcm9uRGF0ZTtcbiAgICBqb2IuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgY3JvbkpvYnMucHVzaChqb2IpO1xuICAgIHJldHVybiBjcm9uSm9icy5sZW5ndGggLTE7XG59O1xuXG5leHBvcnRzLmRlbGV0ZUNyb25Kb2IgPSBmdW5jdGlvbihpZEpvYikge1xuICAgIGRlbGV0ZSBjcm9uSm9ic1tpZEpvYl07XG59O1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmUgYSBtaW51dGUgaW4gdGhlIGJlZ2luaW5nIG9mIGVhY2ggbWludXRlLlxuLy8gaXQgaXMgdXNlZCB0byBjcm9uIGFueSBmdW5jdGlvblxudmFyIG9uTWludXRlID0gZnVuY3Rpb24oKSB7XG5cblxuICAgIGNyb25Kb2JzLmZvckVhY2goZnVuY3Rpb24oam9iKSB7XG4gICAgICAgIGlmICgham9iKSByZXR1cm47XG5cbiAgICAgICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KGpvYi50eik7XG4gICAgICAgIHZhciBjcm9uRGF0ZSA9IGR0LmZvcm1hdCgnbW1ISERETU1kJyk7XG5cbiAgICAgICAgaWYgKChjcm9uRGF0ZSAhPT0gam9iLmxhc3QpICYmIChtYXRjaEpvYihqb2IsIGNyb25EYXRlKSkpIHtcbiAgICAgICAgICAgIGlmIChqb2IuZXhlY3V0aW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJKb2IgdGFrZXMgdG9vIGxvbmcgdG8gZXhlY3V0ZTogXCIgKyBqb2IubmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGpvYi5sYXN0ID0gY3JvbkRhdGU7XG4gICAgICAgICAgICAgICAgam9iLmV4ZWN1dGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgam9iLmNiKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBqb2IuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBub3cgPSBleHBvcnRzLm5vdygpLmdldFRpbWUoKTtcbiAgICB2YXIgbWlsbHNUb05leHRNaW51dGUgPSA2MDAwMCAtIG5vdyAlIDYwMDAwO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIG9uTWludXRlKCk7XG4gICAgfSwgbWlsbHNUb05leHRNaW51dGUpO1xufTtcblxub25NaW51dGUoKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBtYXN0ZXJVdGlscyA9IHtcbiAgICAgICAgZGF0ZVV0aWxzOiByZXF1aXJlKCcuL2RhdGVfdXRpbHMuanMnKSxcbiAgICAgICAgcm91bmQ6IHJlcXVpcmUoJy4vcm91bmQuanMnKSxcbiAgICAgICAgUHJpY2U6ICByZXF1aXJlKCcuL1ByaWNlLmpzJylcbiAgICB9O1xuXG4gICAgdmFyIHJvb3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmICYmIHNlbGYgfHxcbiAgICAgICAgICAgIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IG1hc3RlclV0aWxzO1xuICAgICAgICB9XG4gICAgICAgIGV4cG9ydHMubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG4gICAgaWYgKHdpbmRvdykge1xuICAgICAgICB3aW5kb3cubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbn0oKSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcm91bmQodmFsLCByb3VuZGluZ1R5cGUsIHJvdW5kaW5nKSB7XG4gICAgdmFyIHY7XG4gICAgaWYgKCghcm91bmRpbmdUeXBlKSB8fCAocm91bmRpbmdUeXBlID09PSBcIk5PTkVcIikpIHtcbiAgICAgICAgdiA9IE1hdGgucm91bmQodmFsIC8gMC4wMSkgKiAwLjAxO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJGTE9PUlwiKSkge1xuICAgICAgICB2PSBNYXRoLmZsb29yKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMikgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJST1VORFwiKSkge1xuICAgICAgICB2PSBNYXRoLnJvdW5kKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMykgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJDRUlMXCIpKSB7XG4gICAgICAgIHY9IE1hdGguY2VpbCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHJvdW5kaW5nVHlwZTogcm91bmRpbmdUeXBlXCIpO1xuICAgIH1cbiAgICByZXR1cm4gKyhNYXRoLnJvdW5kKHYgKyBcImUrMlwiKSAgKyBcImUtMlwiKTtcbn07XG4iXX0=
