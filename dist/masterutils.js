(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        if (typeof d === "number") {
            return d;
        }
        return Math.floor(d.getTime() / 86400000);
};


exports.intDate2str = function(d) {
    var dt;
    if (d instanceof Date) {
        dt = d;
    } else {
        dt = new Date(d*86400000);
    }
    return dt.toISOString().substring(0,10);
};

exports.int2date = function(d) {
    if (d instanceof Date) return d;
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
},{}],2:[function(require,module,exports){
(function (global){
/*jslint node: true */

(function() {
    "use strict";

    var masterUtils = {
        dateUtils: require('./date_utils.js'),
        round: require('./round.js'),
        Price:  require('./price.js'),
        Price2: require('./price2.js'),
        checks: {
 //           checkCreditCard: require('./creditcard.js').checkCreditCard
        }
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

    if (typeof window !== "undefined") {
        window.masterUtils = masterUtils;
    }

}());

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils.js":1,"./price.js":3,"./price2.js":4,"./round.js":8}],3:[function(require,module,exports){
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

Price.prototype.linePrice = function(line, options) {
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
        price = options.base * line.price.pricePC/100;
        if (price<line.price.priceMin) price = line.price.priceMin;
    } else if ( (typeof line.price==="object") && (line.price.type === 'ESC') ) {
        price=Number.MAX_VALUE;
        _.each(line.price.scalePrices, function(sp) {
            if ((options.base <= sp.stayPriceMax) && (sp.price < price)) {
                price = sp.price;
            }
        });
        if (price === Number.MAX_VALUE) {
            price = NaN;
        }
    }

    return price;
};


Price.prototype.lineImport = function(line, options) {
    options = options || {};
    options = _.extend({
        withTaxes: true,
        withDiscounts: true,
        rounded: true,
        base: 0
    }, options);

    var price = this.linePrice(line,options);

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
        var cp = _.clone(p);
        _.each(cp.lines, function(l) {
            self.lines.push(l);
        });
};


module.exports = Price;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils":1,"./round":8}],4:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var round = require('./round');
var du = require('./date_utils');

/*
// VISUALIZATION FLAGS IN EACH NODE
    showIfZero:         Show even if Total is zero
    ifOneHideParent:    If this group has only one child, remove this group and
                        replace it with the chald
    ifOneHideChild:     If this group has only one child, remove the child
    hideTotal:          Just remove  the total and put all the childs
    totalOnBottom:         Put the Total on the dop
    hideDetail:         Do not show the details
*/


var registeredModifiers = {
    "AGREGATOR": require("./price_agregator.js"),
    "LINE": require("./price_line.js"),
    "VATINCLUDED": require("./price_vatincluded.js")
};

var Price2 = function(p1, p2) {
    var self = this;
    self.lines = [];
    self.options = {};
    _.each(arguments, function(p) {
        if (p) {
            if ((typeof p === "object")&&(p.lines)) {
                self.lines.concat(_.map(p.lines, _.clone));
            } else if (p instanceof Array) {
                self.lines.concat(_.map(p, _.clone));
            } else if ((typeof p === "object")&&(p.class || p.label)) {
                self.lines.push(_.clone(p));
            } else if (typeof p === "object") {
                self.options = p;
            }
        }
    });

    self.treeValid=false;
    self.renderValid=false;
};

Price2.prototype.addPrice = function(p) {
    var self = this;
    if (!p) return;
    var cp;
    if ((typeof p === "object")&& (p.lines)) {
        cp = p.lines;
    } else if (cp instanceof Array) {
        cp = p;
    } else if (typeof p === "object") {
        cp = [p];
    }
    _.each(cp, function(l) {
        self.lines.push(_.clone(l));
    });
    self.treeValid=false;
    self.renderValid = false;
};


Price2.prototype.constructTree = function() {

    var self = this;

    function sortTree(node) {
        if (node.childs) {
            node.childs = _.sortByAll(node.childs, ["order", "suborder"]);
            _.each(node.childs, sortTree);
        }
    }

    function calcTotal(node) {
        node.import = node.import || 0;
        if (node.childs) {
            _.each(node.childs, function(c) {
                node.import += calcTotal(c);
            });
        }
        return node.import;
    }

    function roundImports(node) {
        node.import = round(node.import, "ROUND", 0.01);
        _.each(node.childs, roundImports);
    }

    if (self.treeValid) {
        return self.total;
    }

    self.total = {
        id: "total",
        label: "@Total",
        childs: [],

        showIfZero: true,
        totalOnBottom: true
    };

    var modifiers = [];

    var i =0;

    _.each(self.lines, function(l) {
        l.suborder = i++;               // suborder is the original order. In case of tie use this.
        l.class = l.class || "LINE";
        if (!registeredModifiers[l.class]) {
            throw new Error("Modifier " + l.class + " not defined.");
        }
        var modifier = new registeredModifiers[l.class](l);
        modifier.suborder = i;
        modifiers.push(modifier);
    });

    modifiers = _.sortByAll(modifiers, ["execOrder", "execSubOrder", "suborder"]);

    _.each(modifiers, function(m) {
        m.modify(self.total, self.options);
    });

    sortTree(self.total);

    calcTotal(self.total);
    roundImports(self.total);

    self.treeValid = true;
    return self.total;
};

Price2.prototype.render = function() {

    var self = this;
    self.render = [];


/*
// VISUALIZATION FLAGS IN EACH NODE
    showIfZero:         Show even if Total is zero
    ifOneHideParent:    If this group has only one child, remove this group and
                        replace it with the chald
    ifOneHideChild:     If this group has only one child, remove the child
    hideTotal:          Just remove  the total and put all the childs
    totalOnBottom:         Put the Total on the dop
    hideDetail:         Do not show the details
*/


    function renderNode(node, level) {

        var renderTotal = true;
        var renderDetail = true;
        if ((!node.showIfZero) && (node.import === 0)) renderTotal = false;
        if ((node.childs)&&(node.childs.length === 1)) {
            if (node.ifOneHideParent) renderTotal = false;
            if (node.ifOneHideChild) renderDetail = false;
        }
        if (node.hideDetail) renderDetail= false;
        if (node.hideTotal) renderTotal=false;

        var newNode = _.clone(node);
        delete newNode.childs;
        delete newNode.showIfZero;
        delete newNode.hideDetail;
        delete newNode.hideTotal;
        delete newNode.ifOneHideParent;
        delete newNode.ifOneHideChild;
        newNode.level = level;

        if ((renderTotal) && (!node.totalOnBottom)) {
            self.render.push(newNode);
        }

        if (renderDetail) {
            _.each(node.childs, function(childNode) {
                renderNode(childNode, renderTotal ? level +1 : level);
            });
        }
        if ((renderTotal) && (node.totalOnBottom)) {
            self.render.push(newNode);
        }
    }

    if (self.renderValid) {
        return self.render;
    }
    self.constructTree();

    renderNode(self.total, 0);

    self.renderValid = true;
    return self.render;
};

function findNode(node, id) {
    var i;
    if (!node) return null;
    if (node.id === id) return node;
    if (!node.childs) return null;
    for (i=0; i<node.childs.length; i+=1) {
        var fNode = findNode(node.childs[i], id);
        if (fNode) return fNode;
    }
    return null;
}

Price2.prototype.getImport = function(id) {
    var self = this;
    id = id || "total";
    self.constructTree();

    var node = findNode(self.total, id);

    if (node) {
        return node.import;
    } else {
        return 0;
    }
};

Price2.prototype.addAttributes = function(atribute) {
    var self=this;
    var attrs;
    if (typeof atribute === "string" ) {
        attrs = [atribute];
    } else if (atribute instanceof Array) {
        attrs = atribute;
    } else {
        throw new Error("Invalid Attribute");
    }
    _.each(attrs, function(a) {
        _.each(self.lines, function(l) {
            if (!l.attributes) l.attributes = [];
            if (!_.contains(l.attributes, a)) {
                l.attributes.push(a);
            }
        });
    });
};

Price2.prototype.toJSON = function() {
    var obj = {};
    obj.lines = _.map(this.lines, _.clone);
    _.each(obj.lines, function(l) {
        if (typeof l.from === "number") l.from = du.int2date(l.from);
        if (typeof l.to === "number") l.to = du.int2date(l.to);
    });
    return obj;
};





module.exports = Price2;


}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils":1,"./price_agregator.js":5,"./price_line.js":6,"./price_vatincluded.js":7,"./round":8}],5:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

/*

Agregate Modifier
=================

    groupBy             Flag of the lines that should be replaced
    execOrder           Order in which this modifier i excevuted.

}

*/

var PriceAgregator = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 5;
    this.groupBy = line.groupBy;
};

PriceAgregator.prototype.modify = function(tree) {
    var self = this;
    var newNode = _.clone(this.line);
    newNode.childs = [];
    var i,l;
    for (i=0; i<tree.childs.length; i+=1) {
        l=tree.childs[i];
        if (_.contains(l.attributes, self.groupBy)) {
            newNode.childs.push(l);
            tree.childs[i] = tree.childs[tree.childs.length-1];
            tree.childs.pop();
            i-=1;
        }
    }
    tree.childs.push(newNode);
};

module.exports = PriceAgregator;



}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var PriceLine = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 0;
};

PriceLine.prototype.modify = function(tree) {
    var l = _.clone(this.line);

    var price = l.price;

    l.import = l.price * l.quantity;
    if (!isNaN(l.periods)) {
        l.import = l.import * l.periods;
    }

    if (l.discount) {
        l.import = l.import * (1 - l.discount/100);
    }

    l.baseImport = l.import;

    tree.childs.push(l);
};

module.exports = PriceLine;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var PriceVatIncluded = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 9;
};

PriceVatIncluded.prototype.modify = function(tree) {

    function applyVatNode(node) {
        _.each(node.taxes, function(tax) {
            if (tax.type === "VAT") {
                node.import = node.import * (1 + tax.PC/100);
                node.price = node.price * (1 + tax.PC/100);
            }
        });
        _.each(node.childs, applyVatNode);
    }

    applyVatNode(tree);
};

module.exports = PriceVatIncluded;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvZGF0ZV91dGlscy5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2Zha2VfOGQ1NzY1ZDkuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlMi5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2FncmVnYXRvci5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2xpbmUuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV92YXRpbmNsdWRlZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3JvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5cbnZhciBtb21lbnQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snbW9tZW50J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydtb21lbnQnXSA6IG51bGwpO1xuXG52YXIgdmlydHVhbFRpbWUgPSBudWxsO1xuZXhwb3J0cy5ub3cgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodmlydHVhbFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIHZpcnR1YWxUaW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgpO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuc2V0VmlydHVhbFRpbWUgPSBmdW5jdGlvbih0KSB7XG4gICAgdmlydHVhbFRpbWUgPSB0O1xufTtcblxuZXhwb3J0cy5kYXRlMnN0ciA9IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsMTApO1xufTtcblxuZXhwb3J0cy5kYXRlMmludCA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihkLmdldFRpbWUoKSAvIDg2NDAwMDAwKTtcbn07XG5cblxuZXhwb3J0cy5pbnREYXRlMnN0ciA9IGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgZHQ7XG4gICAgaWYgKGQgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIGR0ID0gZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkdCA9IG5ldyBEYXRlKGQqODY0MDAwMDApO1xuICAgIH1cbiAgICByZXR1cm4gZHQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmludDJkYXRlID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChkIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIGQ7XG4gICAgdmFyIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgcmV0dXJuIGR0O1xufTtcblxuZXhwb3J0cy50b2RheSA9IGZ1bmN0aW9uKHR6KSB7XG4gICAgdHogPSB0eiB8fCAnVVRDJztcblxuICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eih0eik7XG4gICAgdmFyIGRhdGVTdHIgPSBkdC5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICB2YXIgZHQyID0gbmV3IERhdGUoZGF0ZVN0cisnVDAwOjAwOjAwLjAwMFonKTtcblxuICAgIHJldHVybiBkdDIuZ2V0VGltZSgpIC8gODY0MDAwMDA7XG59O1xuXG5cblxuXG5cbi8vLyBDUk9OIElNUExFTUVOVEFUSU9OXG5cbmZ1bmN0aW9uIG1hdGNoTnVtYmVyKG4sIGZpbHRlcikge1xuICAgIG4gPSBwYXJzZUludChuKTtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZpbHRlciA9PT0gJyonKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgZiA9IGZpbHRlci50b1N0cmluZygpO1xuICAgIHZhciBvcHRpb25zID0gZi5zcGxpdCgnLCcpO1xuICAgIGZvciAodmFyIGk9MDsgaTxvcHRpb25zOyBpKz0xKSB7XG4gICAgICAgIHZhciBhcnIgPSBvcHRpb25zW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGlmIChhcnIubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAocGFyc2VJbnQoYXJyWzBdLDEwKSA9PT0gbikgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJyLmxlbmd0aCA9PT0yKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHBhcnNlSW50KGFyclswXSwxMCk7XG4gICAgICAgICAgICB2YXIgdG8gPSBwYXJzZUludChhcnJbMV0sMTApO1xuICAgICAgICAgICAgaWYgKChuPj1mcm9tICkgJiYgKG48PSB0bykpIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBtYXRjaEpvYihqb2IsIGNyb25EYXRlKSB7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoMCwyKSwgam9iLm1pbnV0ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigyLDIpLCBqb2IuaG91cikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig0LDIpLCBqb2IuZGF5T2ZNb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig2LDIpLCBqb2IubW9udGgpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoOCwxKSwgam9iLmRheU9mV2VlaykpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxudmFyIGNyb25Kb2JzID0gW107XG5leHBvcnRzLmFkZENyb25Kb2IgPSBmdW5jdGlvbihqb2IpIHtcblxuXG4gICAgam9iLnR6ID0gam9iLnR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KGpvYi50eik7XG4gICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcbiAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICBjcm9uSm9icy5wdXNoKGpvYik7XG4gICAgcmV0dXJuIGNyb25Kb2JzLmxlbmd0aCAtMTtcbn07XG5cbmV4cG9ydHMuZGVsZXRlQ3JvbkpvYiA9IGZ1bmN0aW9uKGlkSm9iKSB7XG4gICAgZGVsZXRlIGNyb25Kb2JzW2lkSm9iXTtcbn07XG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uZSBhIG1pbnV0ZSBpbiB0aGUgYmVnaW5pbmcgb2YgZWFjaCBtaW51dGUuXG4vLyBpdCBpcyB1c2VkIHRvIGNyb24gYW55IGZ1bmN0aW9uXG52YXIgb25NaW51dGUgPSBmdW5jdGlvbigpIHtcblxuXG4gICAgY3JvbkpvYnMuZm9yRWFjaChmdW5jdGlvbihqb2IpIHtcbiAgICAgICAgaWYgKCFqb2IpIHJldHVybjtcblxuICAgICAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICAgICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcblxuICAgICAgICBpZiAoKGNyb25EYXRlICE9PSBqb2IubGFzdCkgJiYgKG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpKSkge1xuICAgICAgICAgICAgaWYgKGpvYi5leGVjdXRpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkpvYiB0YWtlcyB0b28gbG9uZyB0byBleGVjdXRlOiBcIiArIGpvYi5uYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgam9iLmxhc3QgPSBjcm9uRGF0ZTtcbiAgICAgICAgICAgICAgICBqb2IuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBqb2IuY2IoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG5vdyA9IGV4cG9ydHMubm93KCkuZ2V0VGltZSgpO1xuICAgIHZhciBtaWxsc1RvTmV4dE1pbnV0ZSA9IDYwMDAwIC0gbm93ICUgNjAwMDA7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgb25NaW51dGUoKTtcbiAgICB9LCBtaWxsc1RvTmV4dE1pbnV0ZSk7XG59O1xuXG5vbk1pbnV0ZSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIG1hc3RlclV0aWxzID0ge1xuICAgICAgICBkYXRlVXRpbHM6IHJlcXVpcmUoJy4vZGF0ZV91dGlscy5qcycpLFxuICAgICAgICByb3VuZDogcmVxdWlyZSgnLi9yb3VuZC5qcycpLFxuICAgICAgICBQcmljZTogIHJlcXVpcmUoJy4vcHJpY2UuanMnKSxcbiAgICAgICAgUHJpY2UyOiByZXF1aXJlKCcuL3ByaWNlMi5qcycpLFxuICAgICAgICBjaGVja3M6IHtcbiAvLyAgICAgICAgICAgY2hlY2tDcmVkaXRDYXJkOiByZXF1aXJlKCcuL2NyZWRpdGNhcmQuanMnKS5jaGVja0NyZWRpdENhcmRcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgcm9vdCA9IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyAmJiBzZWxmLnNlbGYgPT09IHNlbGYgJiYgc2VsZiB8fFxuICAgICAgICAgICAgdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsLmdsb2JhbCA9PT0gZ2xvYmFsICYmIGdsb2JhbCB8fFxuICAgICAgICAgICAgdGhpcztcblxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gbWFzdGVyVXRpbHM7XG4gICAgICAgIH1cbiAgICAgICAgZXhwb3J0cy5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB3aW5kb3cubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbn0oKSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcbnZhciByb3VuZCA9IHJlcXVpcmUoJy4vcm91bmQnKTtcbnZhciBkdSA9IHJlcXVpcmUoJy4vZGF0ZV91dGlscycpO1xuXG52YXIgUHJpY2UgPSBmdW5jdGlvbihsaW5lcykge1xuICAgIGlmICghbGluZXMpIGxpbmVzID1bXTtcblxuICAgIC8vIElmIGFub3RoZXIgcHJpY2UgKGhhcyBsaW5lcylcbiAgICBpZiAobGluZXMubGluZXMpIHtcbiAgICAgICAgbGluZXMgPSBsaW5lcy5saW5lcztcbiAgICB9XG5cbi8vIENsb25lIHRoZSBhcnJheTtcbiAgICB0aGlzLmxpbmVzID0gXy5tYXAobGluZXMsIF8uY2xvbmUpO1xufTtcblxuUHJpY2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmoubGluZXMgPSBfLm1hcCh0aGlzLmxpbmVzLCBfLmNsb25lKTtcbiAgICBfLmVhY2gob2JqLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbC5mcm9tID09PSBcIm51bWJlclwiKSBsLmZyb20gPSBkdS5pbnQyZGF0ZShsLmZyb20pO1xuICAgICAgICBpZiAodHlwZW9mIGwudG8gPT09IFwibnVtYmVyXCIpIGwudG8gPSBkdS5pbnQyZGF0ZShsLnRvKTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xufTtcblxuUHJpY2UucHJvdG90eXBlLmxpbmVQcmljZSA9IGZ1bmN0aW9uKGxpbmUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWUsXG4gICAgICAgIGJhc2U6IDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBwcmljZTtcbiAgICBpZiAodHlwZW9mIGxpbmUucHJpY2UgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgcHJpY2UgPSBsaW5lLnByaWNlO1xuICAgIH0gZWxzZSBpZiAoICh0eXBlb2YgbGluZS5wcmljZT09PVwib2JqZWN0XCIpICYmIChsaW5lLnByaWNlLnR5cGUgPT09ICdQRVInKSApIHtcbiAgICAgICAgcHJpY2UgPSBvcHRpb25zLmJhc2UgKiBsaW5lLnByaWNlLnByaWNlUEMvMTAwO1xuICAgICAgICBpZiAocHJpY2U8bGluZS5wcmljZS5wcmljZU1pbikgcHJpY2UgPSBsaW5lLnByaWNlLnByaWNlTWluO1xuICAgIH0gZWxzZSBpZiAoICh0eXBlb2YgbGluZS5wcmljZT09PVwib2JqZWN0XCIpICYmIChsaW5lLnByaWNlLnR5cGUgPT09ICdFU0MnKSApIHtcbiAgICAgICAgcHJpY2U9TnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgXy5lYWNoKGxpbmUucHJpY2Uuc2NhbGVQcmljZXMsIGZ1bmN0aW9uKHNwKSB7XG4gICAgICAgICAgICBpZiAoKG9wdGlvbnMuYmFzZSA8PSBzcC5zdGF5UHJpY2VNYXgpICYmIChzcC5wcmljZSA8IHByaWNlKSkge1xuICAgICAgICAgICAgICAgIHByaWNlID0gc3AucHJpY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocHJpY2UgPT09IE51bWJlci5NQVhfVkFMVUUpIHtcbiAgICAgICAgICAgIHByaWNlID0gTmFOO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByaWNlO1xufTtcblxuXG5QcmljZS5wcm90b3R5cGUubGluZUltcG9ydCA9IGZ1bmN0aW9uKGxpbmUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWUsXG4gICAgICAgIGJhc2U6IDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBwcmljZSA9IHRoaXMubGluZVByaWNlKGxpbmUsb3B0aW9ucyk7XG5cbiAgICB2YXIgbGluZUltcG9ydCA9IHByaWNlICogbGluZS5xdWFudGl0eTtcbiAgICBpZiAoIWlzTmFOKGxpbmUucGVyaW9kcykpIHtcbiAgICAgICAgbGluZUltcG9ydCA9IGxpbmVJbXBvcnQgKiBsaW5lLnBlcmlvZHM7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMud2l0aERpc2NvdW50cykge1xuICAgICAgICB2YXIgYmFzZSA9IGxpbmVJbXBvcnQ7XG4gICAgICAgIF8uZWFjaChsaW5lLmRpc2NvdW50cywgZnVuY3Rpb24oZGlzY291bnQpIHtcbiAgICAgICAgICAgIGlmIChkaXNjb3VudC50eXBlID09PSBcIlBDXCIpIHtcbiAgICAgICAgICAgICAgICBsaW5lSW1wb3J0ID0gbGluZUltcG9ydCAtIGJhc2UgKiBkaXNjb3VudC5QQy8xMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLndpdGhUYXhlcykge1xuICAgICAgICBfLmVhY2gobGluZS50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICBpZiAodGF4LnR5cGU9PT0gXCJWQVRcIikge1xuICAgICAgICAgICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0ICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMucm91bmRlZCkge1xuICAgICAgICBsaW5lSW1wb3J0ID0gcm91bmQobGluZUltcG9ydCwgXCJST1VORFwiLCAwLjAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbGluZUltcG9ydDtcbn07XG5cblByaWNlLnByb3RvdHlwZS5nZXRJbXBvcnQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgICAgIHdpdGhUYXhlczogdHJ1ZSxcbiAgICAgICAgd2l0aERpc2NvdW50czogdHJ1ZSxcbiAgICAgICAgcm91bmRlZDogdHJ1ZVxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdmFyIG9sZFJvdW5kZWQgPSBvcHRpb25zLnJvdW5kZWQ7XG5cbiAgICBvcHRpb25zLnJvdW5kZWQgPSBmYWxzZTtcbiAgICB2YXIgYWMgPSBfLnJlZHVjZShzZWxmLmxpbmVzLCBmdW5jdGlvbihtZW1vLCBsaW5lKSB7XG4gICAgICAgIHJldHVybiBtZW1vICsgc2VsZi5saW5lSW1wb3J0KGxpbmUsIG9wdGlvbnMpO1xuICAgIH0sMCk7XG5cbiAgICBpZiAob2xkUm91bmRlZCkge1xuICAgICAgICBhYyA9IHJvdW5kKGFjLCBcIlJPVU5EXCIsIDAuMDEpO1xuICAgIH1cblxuICAgIHJldHVybiBhYztcbn07XG5cblByaWNlLnByb3RvdHlwZS5hZGRQcmljZSA9IGZ1bmN0aW9uKHApIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBpZiAoIXApIHJldHVybjtcbiAgICAgICAgdmFyIGNwID0gXy5jbG9uZShwKTtcbiAgICAgICAgXy5lYWNoKGNwLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2gobCk7XG4gICAgICAgIH0pO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgcm91bmQgPSByZXF1aXJlKCcuL3JvdW5kJyk7XG52YXIgZHUgPSByZXF1aXJlKCcuL2RhdGVfdXRpbHMnKTtcblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG52YXIgcmVnaXN0ZXJlZE1vZGlmaWVycyA9IHtcbiAgICBcIkFHUkVHQVRPUlwiOiByZXF1aXJlKFwiLi9wcmljZV9hZ3JlZ2F0b3IuanNcIiksXG4gICAgXCJMSU5FXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2xpbmUuanNcIiksXG4gICAgXCJWQVRJTkNMVURFRFwiOiByZXF1aXJlKFwiLi9wcmljZV92YXRpbmNsdWRlZC5qc1wiKVxufTtcblxudmFyIFByaWNlMiA9IGZ1bmN0aW9uKHAxLCBwMikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLmxpbmVzID0gW107XG4gICAgc2VsZi5vcHRpb25zID0ge307XG4gICAgXy5lYWNoKGFyZ3VtZW50cywgZnVuY3Rpb24ocCkge1xuICAgICAgICBpZiAocCkge1xuICAgICAgICAgICAgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJihwLmxpbmVzKSkge1xuICAgICAgICAgICAgICAgIHNlbGYubGluZXMuY29uY2F0KF8ubWFwKHAubGluZXMsIF8uY2xvbmUpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5saW5lcy5jb25jYXQoXy5tYXAocCwgXy5jbG9uZSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYocC5jbGFzcyB8fCBwLmxhYmVsKSkge1xuICAgICAgICAgICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKHApKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMgPSBwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBzZWxmLnRyZWVWYWxpZD1mYWxzZTtcbiAgICBzZWxmLnJlbmRlclZhbGlkPWZhbHNlO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS5hZGRQcmljZSA9IGZ1bmN0aW9uKHApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFwKSByZXR1cm47XG4gICAgdmFyIGNwO1xuICAgIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYgKHAubGluZXMpKSB7XG4gICAgICAgIGNwID0gcC5saW5lcztcbiAgICB9IGVsc2UgaWYgKGNwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3AgPSBwO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgY3AgPSBbcF07XG4gICAgfVxuICAgIF8uZWFjaChjcCwgZnVuY3Rpb24obCkge1xuICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgfSk7XG4gICAgc2VsZi50cmVlVmFsaWQ9ZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJWYWxpZCA9IGZhbHNlO1xufTtcblxuXG5QcmljZTIucHJvdG90eXBlLmNvbnN0cnVjdFRyZWUgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIHNvcnRUcmVlKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRzKSB7XG4gICAgICAgICAgICBub2RlLmNoaWxkcyA9IF8uc29ydEJ5QWxsKG5vZGUuY2hpbGRzLCBbXCJvcmRlclwiLCBcInN1Ym9yZGVyXCJdKTtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgc29ydFRyZWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY1RvdGFsKG5vZGUpIHtcbiAgICAgICAgbm9kZS5pbXBvcnQgPSBub2RlLmltcG9ydCB8fCAwO1xuICAgICAgICBpZiAobm9kZS5jaGlsZHMpIHtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24oYykge1xuICAgICAgICAgICAgICAgIG5vZGUuaW1wb3J0ICs9IGNhbGNUb3RhbChjKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlLmltcG9ydDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByb3VuZEltcG9ydHMobm9kZSkge1xuICAgICAgICBub2RlLmltcG9ydCA9IHJvdW5kKG5vZGUuaW1wb3J0LCBcIlJPVU5EXCIsIDAuMDEpO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIHJvdW5kSW1wb3J0cyk7XG4gICAgfVxuXG4gICAgaWYgKHNlbGYudHJlZVZhbGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnRvdGFsO1xuICAgIH1cblxuICAgIHNlbGYudG90YWwgPSB7XG4gICAgICAgIGlkOiBcInRvdGFsXCIsXG4gICAgICAgIGxhYmVsOiBcIkBUb3RhbFwiLFxuICAgICAgICBjaGlsZHM6IFtdLFxuXG4gICAgICAgIHNob3dJZlplcm86IHRydWUsXG4gICAgICAgIHRvdGFsT25Cb3R0b206IHRydWVcbiAgICB9O1xuXG4gICAgdmFyIG1vZGlmaWVycyA9IFtdO1xuXG4gICAgdmFyIGkgPTA7XG5cbiAgICBfLmVhY2goc2VsZi5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICBsLnN1Ym9yZGVyID0gaSsrOyAgICAgICAgICAgICAgIC8vIHN1Ym9yZGVyIGlzIHRoZSBvcmlnaW5hbCBvcmRlci4gSW4gY2FzZSBvZiB0aWUgdXNlIHRoaXMuXG4gICAgICAgIGwuY2xhc3MgPSBsLmNsYXNzIHx8IFwiTElORVwiO1xuICAgICAgICBpZiAoIXJlZ2lzdGVyZWRNb2RpZmllcnNbbC5jbGFzc10pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGlmaWVyIFwiICsgbC5jbGFzcyArIFwiIG5vdCBkZWZpbmVkLlwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbW9kaWZpZXIgPSBuZXcgcmVnaXN0ZXJlZE1vZGlmaWVyc1tsLmNsYXNzXShsKTtcbiAgICAgICAgbW9kaWZpZXIuc3Vib3JkZXIgPSBpO1xuICAgICAgICBtb2RpZmllcnMucHVzaChtb2RpZmllcik7XG4gICAgfSk7XG5cbiAgICBtb2RpZmllcnMgPSBfLnNvcnRCeUFsbChtb2RpZmllcnMsIFtcImV4ZWNPcmRlclwiLCBcImV4ZWNTdWJPcmRlclwiLCBcInN1Ym9yZGVyXCJdKTtcblxuICAgIF8uZWFjaChtb2RpZmllcnMsIGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgbS5tb2RpZnkoc2VsZi50b3RhbCwgc2VsZi5vcHRpb25zKTtcbiAgICB9KTtcblxuICAgIHNvcnRUcmVlKHNlbGYudG90YWwpO1xuXG4gICAgY2FsY1RvdGFsKHNlbGYudG90YWwpO1xuICAgIHJvdW5kSW1wb3J0cyhzZWxmLnRvdGFsKTtcblxuICAgIHNlbGYudHJlZVZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi50b3RhbDtcbn07XG5cblByaWNlMi5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5yZW5kZXIgPSBbXTtcblxuXG4vKlxuLy8gVklTVUFMSVpBVElPTiBGTEFHUyBJTiBFQUNIIE5PREVcbiAgICBzaG93SWZaZXJvOiAgICAgICAgIFNob3cgZXZlbiBpZiBUb3RhbCBpcyB6ZXJvXG4gICAgaWZPbmVIaWRlUGFyZW50OiAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoaXMgZ3JvdXAgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlIGl0IHdpdGggdGhlIGNoYWxkXG4gICAgaWZPbmVIaWRlQ2hpbGQ6ICAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoZSBjaGlsZFxuICAgIGhpZGVUb3RhbDogICAgICAgICAgSnVzdCByZW1vdmUgIHRoZSB0b3RhbCBhbmQgcHV0IGFsbCB0aGUgY2hpbGRzXG4gICAgdG90YWxPbkJvdHRvbTogICAgICAgICBQdXQgdGhlIFRvdGFsIG9uIHRoZSBkb3BcbiAgICBoaWRlRGV0YWlsOiAgICAgICAgIERvIG5vdCBzaG93IHRoZSBkZXRhaWxzXG4qL1xuXG5cbiAgICBmdW5jdGlvbiByZW5kZXJOb2RlKG5vZGUsIGxldmVsKSB7XG5cbiAgICAgICAgdmFyIHJlbmRlclRvdGFsID0gdHJ1ZTtcbiAgICAgICAgdmFyIHJlbmRlckRldGFpbCA9IHRydWU7XG4gICAgICAgIGlmICgoIW5vZGUuc2hvd0lmWmVybykgJiYgKG5vZGUuaW1wb3J0ID09PSAwKSkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgaWYgKChub2RlLmNoaWxkcykmJihub2RlLmNoaWxkcy5sZW5ndGggPT09IDEpKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVQYXJlbnQpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVDaGlsZCkgcmVuZGVyRGV0YWlsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUuaGlkZURldGFpbCkgcmVuZGVyRGV0YWlsPSBmYWxzZTtcbiAgICAgICAgaWYgKG5vZGUuaGlkZVRvdGFsKSByZW5kZXJUb3RhbD1mYWxzZTtcblxuICAgICAgICB2YXIgbmV3Tm9kZSA9IF8uY2xvbmUobm9kZSk7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmNoaWxkcztcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuc2hvd0lmWmVybztcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaGlkZURldGFpbDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaGlkZVRvdGFsO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5pZk9uZUhpZGVQYXJlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmlmT25lSGlkZUNoaWxkO1xuICAgICAgICBuZXdOb2RlLmxldmVsID0gbGV2ZWw7XG5cbiAgICAgICAgaWYgKChyZW5kZXJUb3RhbCkgJiYgKCFub2RlLnRvdGFsT25Cb3R0b20pKSB7XG4gICAgICAgICAgICBzZWxmLnJlbmRlci5wdXNoKG5ld05vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbmRlckRldGFpbCkge1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZW5kZXJOb2RlKGNoaWxkTm9kZSwgcmVuZGVyVG90YWwgPyBsZXZlbCArMSA6IGxldmVsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICgocmVuZGVyVG90YWwpICYmIChub2RlLnRvdGFsT25Cb3R0b20pKSB7XG4gICAgICAgICAgICBzZWxmLnJlbmRlci5wdXNoKG5ld05vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYucmVuZGVyVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyO1xuICAgIH1cbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHJlbmRlck5vZGUoc2VsZi50b3RhbCwgMCk7XG5cbiAgICBzZWxmLnJlbmRlclZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi5yZW5kZXI7XG59O1xuXG5mdW5jdGlvbiBmaW5kTm9kZShub2RlLCBpZCkge1xuICAgIHZhciBpO1xuICAgIGlmICghbm9kZSkgcmV0dXJuIG51bGw7XG4gICAgaWYgKG5vZGUuaWQgPT09IGlkKSByZXR1cm4gbm9kZTtcbiAgICBpZiAoIW5vZGUuY2hpbGRzKSByZXR1cm4gbnVsbDtcbiAgICBmb3IgKGk9MDsgaTxub2RlLmNoaWxkcy5sZW5ndGg7IGkrPTEpIHtcbiAgICAgICAgdmFyIGZOb2RlID0gZmluZE5vZGUobm9kZS5jaGlsZHNbaV0sIGlkKTtcbiAgICAgICAgaWYgKGZOb2RlKSByZXR1cm4gZk5vZGU7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5QcmljZTIucHJvdG90eXBlLmdldEltcG9ydCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlkID0gaWQgfHwgXCJ0b3RhbFwiO1xuICAgIHNlbGYuY29uc3RydWN0VHJlZSgpO1xuXG4gICAgdmFyIG5vZGUgPSBmaW5kTm9kZShzZWxmLnRvdGFsLCBpZCk7XG5cbiAgICBpZiAobm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZS5pbXBvcnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuUHJpY2UyLnByb3RvdHlwZS5hZGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24oYXRyaWJ1dGUpIHtcbiAgICB2YXIgc2VsZj10aGlzO1xuICAgIHZhciBhdHRycztcbiAgICBpZiAodHlwZW9mIGF0cmlidXRlID09PSBcInN0cmluZ1wiICkge1xuICAgICAgICBhdHRycyA9IFthdHJpYnV0ZV07XG4gICAgfSBlbHNlIGlmIChhdHJpYnV0ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGF0dHJzID0gYXRyaWJ1dGU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBBdHRyaWJ1dGVcIik7XG4gICAgfVxuICAgIF8uZWFjaChhdHRycywgZnVuY3Rpb24oYSkge1xuICAgICAgICBfLmVhY2goc2VsZi5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgaWYgKCFsLmF0dHJpYnV0ZXMpIGwuYXR0cmlidXRlcyA9IFtdO1xuICAgICAgICAgICAgaWYgKCFfLmNvbnRhaW5zKGwuYXR0cmlidXRlcywgYSkpIHtcbiAgICAgICAgICAgICAgICBsLmF0dHJpYnV0ZXMucHVzaChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmoubGluZXMgPSBfLm1hcCh0aGlzLmxpbmVzLCBfLmNsb25lKTtcbiAgICBfLmVhY2gob2JqLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbC5mcm9tID09PSBcIm51bWJlclwiKSBsLmZyb20gPSBkdS5pbnQyZGF0ZShsLmZyb20pO1xuICAgICAgICBpZiAodHlwZW9mIGwudG8gPT09IFwibnVtYmVyXCIpIGwudG8gPSBkdS5pbnQyZGF0ZShsLnRvKTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlMjtcblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbi8qXG5cbkFncmVnYXRlIE1vZGlmaWVyXG49PT09PT09PT09PT09PT09PVxuXG4gICAgZ3JvdXBCeSAgICAgICAgICAgICBGbGFnIG9mIHRoZSBsaW5lcyB0aGF0IHNob3VsZCBiZSByZXBsYWNlZFxuICAgIGV4ZWNPcmRlciAgICAgICAgICAgT3JkZXIgaW4gd2hpY2ggdGhpcyBtb2RpZmllciBpIGV4Y2V2dXRlZC5cblxufVxuXG4qL1xuXG52YXIgUHJpY2VBZ3JlZ2F0b3IgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDU7XG4gICAgdGhpcy5ncm91cEJ5ID0gbGluZS5ncm91cEJ5O1xufTtcblxuUHJpY2VBZ3JlZ2F0b3IucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKHRoaXMubGluZSk7XG4gICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAoXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIHNlbGYuZ3JvdXBCeSkpIHtcbiAgICAgICAgICAgIG5ld05vZGUuY2hpbGRzLnB1c2gobCk7XG4gICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgaS09MTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0cmVlLmNoaWxkcy5wdXNoKG5ld05vZGUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUFncmVnYXRvcjtcblxuXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxudmFyIFByaWNlTGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgMDtcbn07XG5cblByaWNlTGluZS5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSkge1xuICAgIHZhciBsID0gXy5jbG9uZSh0aGlzLmxpbmUpO1xuXG4gICAgdmFyIHByaWNlID0gbC5wcmljZTtcblxuICAgIGwuaW1wb3J0ID0gbC5wcmljZSAqIGwucXVhbnRpdHk7XG4gICAgaWYgKCFpc05hTihsLnBlcmlvZHMpKSB7XG4gICAgICAgIGwuaW1wb3J0ID0gbC5pbXBvcnQgKiBsLnBlcmlvZHM7XG4gICAgfVxuXG4gICAgaWYgKGwuZGlzY291bnQpIHtcbiAgICAgICAgbC5pbXBvcnQgPSBsLmltcG9ydCAqICgxIC0gbC5kaXNjb3VudC8xMDApO1xuICAgIH1cblxuICAgIGwuYmFzZUltcG9ydCA9IGwuaW1wb3J0O1xuXG4gICAgdHJlZS5jaGlsZHMucHVzaChsKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VMaW5lO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbnZhciBQcmljZVZhdEluY2x1ZGVkID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA5O1xufTtcblxuUHJpY2VWYXRJbmNsdWRlZC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSkge1xuXG4gICAgZnVuY3Rpb24gYXBwbHlWYXROb2RlKG5vZGUpIHtcbiAgICAgICAgXy5lYWNoKG5vZGUudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5pbXBvcnQgPSBub2RlLmltcG9ydCAqICgxICsgdGF4LlBDLzEwMCk7XG4gICAgICAgICAgICAgICAgbm9kZS5wcmljZSA9IG5vZGUucHJpY2UgKiAoMSArIHRheC5QQy8xMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBhcHBseVZhdE5vZGUpO1xuICAgIH1cblxuICAgIGFwcGx5VmF0Tm9kZSh0cmVlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VWYXRJbmNsdWRlZDtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByb3VuZCh2YWwsIHJvdW5kaW5nVHlwZSwgcm91bmRpbmcpIHtcbiAgICB2YXIgdjtcbiAgICBpZiAoKCFyb3VuZGluZ1R5cGUpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiTk9ORVwiKSkge1xuICAgICAgICB2ID0gTWF0aC5yb3VuZCh2YWwgLyAwLjAxKSAqIDAuMDE7XG4gICAgfSBlbHNlIGlmICgocm91bmRpbmdUeXBlID09PSAxKSB8fCAocm91bmRpbmdUeXBlID09PSBcIkZMT09SXCIpKSB7XG4gICAgICAgIHY9IE1hdGguZmxvb3IodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIGlmICgocm91bmRpbmdUeXBlID09PSAyKSB8fCAocm91bmRpbmdUeXBlID09PSBcIlJPVU5EXCIpKSB7XG4gICAgICAgIHY9IE1hdGgucm91bmQodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIGlmICgocm91bmRpbmdUeXBlID09PSAzKSB8fCAocm91bmRpbmdUeXBlID09PSBcIkNFSUxcIikpIHtcbiAgICAgICAgdj0gTWF0aC5jZWlsKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcm91bmRpbmdUeXBlOiByb3VuZGluZ1R5cGVcIik7XG4gICAgfVxuICAgIHJldHVybiArKE1hdGgucm91bmQodiArIFwiZSsyXCIpICArIFwiZS0yXCIpO1xufTtcbiJdfQ==
