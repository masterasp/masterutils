(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*================================================================================================*/

/*

This routine checks the credit card number. The following checks are made:

1. A number has been provided
2. The number is a right length for the card
3. The number has an appropriate prefix for the card
4. The number has a valid modulus 10 number check digit if required

If the validation fails an error is reported.

The structure of credit card formats was gleaned from a variety of sources on the web, although the 
best is probably on Wikepedia ("Credit card number"):

  http://en.wikipedia.org/wiki/Credit_card_number

Parameters:
            cardnumber           number on the card
            cardname             name of card as defined in the card list below

Author:     John Gardner
Date:       1st November 2003
Updated:    26th Feb. 2005      Additional cards added by request
Updated:    27th Nov. 2006      Additional cards added from Wikipedia
Updated:    18th Jan. 2008      Additional cards added from Wikipedia
Updated:    26th Nov. 2008      Maestro cards extended
Updated:    19th Jun. 2009      Laser cards extended from Wikipedia
Updated:    11th Sep. 2010      Typos removed from Diners and Solo definitions (thanks to Noe Leon)
Updated:    10th April 2012     New matches for Maestro, Diners Enroute and Switch
Updated:    17th October 2012   Diners Club prefix 38 not encoded

*/

/*
   If a credit card number is invalid, an error reason is loaded into the global ccErrorNo variable.
   This can be be used to index into the global error  string array to report the reason to the user
   if required:

   e.g. if (!checkCreditCard (number, name) alert (ccErrors(ccErrorNo);
*/

var ccErrorNo = 0;
var ccErrors = [];

ccErrors [0] = "Unknown card type";
ccErrors [1] = "No card number provided";
ccErrors [2] = "Credit card number is in invalid format";
ccErrors [3] = "Credit card number is invalid";
ccErrors [4] = "Credit card number has an inappropriate number of digits";
ccErrors [5] = "Warning! This credit card number is associated with a scam attempt";

function checkCreditCard (cardnumber) {

  // Array to hold the permitted card characteristics
  var cards = [];

  // Define the cards we support. You may add addtional card types as follows.
  //  Name:         As in the selection box of the form - must be same as user's
  //  Length:       List of possible valid lengths of the card number for the card
  //  prefixes:     List of possible prefixes for the card
  //  checkdigit:   Boolean to say whether there is a check digit

  cards [0] = {name: "Visa",
               length: "13,16",
               prefixes: "4",
               checkdigit: true};
  cards [1] = {name: "MasterCard",
               length: "16",
               prefixes: "51,52,53,54,55",
               checkdigit: true};
  cards [2] = {name: "DinersClub",
               length: "14,16", 
               prefixes: "36,38,54,55",
               checkdigit: true};
  cards [3] = {name: "CarteBlanche",
               length: "14",
               prefixes: "300,301,302,303,304,305",
               checkdigit: true};
  cards [4] = {name: "AmEx",
               length: "15",
               prefixes: "34,37",
               checkdigit: true};
  cards [5] = {name: "Discover",
               length: "16",
               prefixes: "6011,622,64,65",
               checkdigit: true};
  cards [6] = {name: "JCB",
               length: "16",
               prefixes: "35",
               checkdigit: true};
  cards [7] = {name: "enRoute",
               length: "15",
               prefixes: "2014,2149",
               checkdigit: true};
  cards [8] = {name: "Solo",
               length: "16,18,19",
               prefixes: "6334,6767",
               checkdigit: true};
  cards [9] = {name: "Switch",
               length: "16,18,19",
               prefixes: "4903,4905,4911,4936,564182,633110,6333,6759",
               checkdigit: true};
  cards [10] = {name: "Maestro",
               length: "12,13,14,15,16,18,19",
               prefixes: "5018,5020,5038,6304,6759,6761,6762,6763",
               checkdigit: true};
  cards [11] = {name: "VisaElectron",
               length: "16",
               prefixes: "4026,417500,4508,4844,4913,4917",
               checkdigit: true};
  cards [12] = {name: "LaserCard",
               length: "16,17,18,19",
               prefixes: "6304,6706,6771,6709",
               checkdigit: true};
  cards [13] = {name: "Test",
               length: "16",
               prefixes: "1912",
               checkdigit: false};
  var res = {
    valid: false
  };


  // Ensure that the user has provided a credit card number
  if (cardnumber.length === 0)  {
     res.ccErrorNo = 1;
     res.ccErrorStr = ccErrors [res.ccErrorNo];
     return res;
  }

  // Now remove any spaces from the credit card number
  cardnumber = cardnumber.replace (/\s/g, "");

  // Check that the number is numeric
  var cardNo = cardnumber;
  var cardexp = /^[0-9]{13,19}$/;
  if (!cardexp.exec(cardNo))  {
     res.ccErrorNo = 2;
     res.ccErrorStr = ccErrors [res.ccErrorNo];
     return res;
  }

  // Establish card type
  var cardType = -1;
  for (var i=0; i<cards.length; i++) {

    // Load an array with the valid prefixes for this card
    prefix = cards[i].prefixes.split(",");

    // Now see if any of them match what we have in the card number
    for (j=0; j<prefix.length; j++) {
      var exp = new RegExp ("^" + prefix[j]);
      if (exp.test (cardNo)) cardType = i;
    }
  }

  // If card type not found, report an error
  if (cardType == -1) {
     res.ccErrorNo = 2;
     res.ccErrorStr = ccErrors [res.ccErrorNo];
     return res;
  }
  res.ccName = cards[cardType].name;



  var j;
  // Now check the modulus 10 check digit - if required
  if (cards[cardType].checkdigit) {
    var checksum = 0;                                  // running checksum total
    var mychar = "";                                   // next char to process
    j = 1;                                         // takes value of 1 or 2

    // Process each digit one by one starting at the right
    var calc;
    for (i = cardNo.length - 1; i >= 0; i--) {

      // Extract the next digit and multiply by 1 or 2 on alternative digits.
      calc = Number(cardNo.charAt(i)) * j;

      // If the result is in two digits add 1 to the checksum total
      if (calc > 9) {
        checksum = checksum + 1;
        calc = calc - 10;
      }

      // Add the units element to the checksum total
      checksum = checksum + calc;

      // Switch the value of j
      if (j ==1) {
        j = 2;
      } else {
        j = 1;
      }
    }

    // All done - if checksum is divisible by 10, it is a valid modulus 10.
    // If not, report an error.
    if (checksum % 10 !== 0)  {
      res.ccErrorNo = 3;
      res.ccErrorStr = ccErrors [res.ccErrorNo];
      return res;
    }
  }

  // Check it's not a spam number
  if (cardNo == '5490997771092064') {
     res.ccErrorNo = 5;
     res.ccErrorStr = ccErrors [res.ccErrorNo];
     return res;
  }

  // The following are the card-specific checks we undertake.
  var LengthValid = false;
  var PrefixValid = false;

  // We use these for holding the valid lengths and prefixes of a card type
  var prefix = [];
  var lengths = [];

  // See if the length is valid for this card
  lengths = cards[cardType].length.split(",");
  for (j=0; j<lengths.length; j++) {
    if (cardNo.length == lengths[j]) LengthValid = true;
  }

  // See if all is OK by seeing if the length was valid. We only check the length if all else was 
  // hunky dory.
  if (!LengthValid) {
     res.ccErrorNo = 4;
     res.ccErrorStr = ccErrors [res.ccErrorNo];
     return res;
  }

  res.valid = true;

  // The credit card is in the required format.
  return res;
}

/*================================================================================================*/

module.exports.checkCreditCard = checkCreditCard;


},{}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
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
            checkCreditCard: require('./creditcard.js').checkCreditCard
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
},{"./creditcard.js":1,"./date_utils.js":2,"./price.js":4,"./price2.js":5,"./round.js":10}],4:[function(require,module,exports){
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
},{"./date_utils":2,"./round":10}],5:[function(require,module,exports){
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
    "VATINCLUDED": require("./price_vatincluded.js"),
    "DISCOUNT": require("./price_discount.js")
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
    self.renderTreeValid=false;
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
    self.renderTreeValid = false;
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
        if ((node.childs)&&(node.childs.length === 1)&&(!node.hideDetail)) {
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
            self.renderResult.push(newNode);
        }

        if (renderDetail) {
            _.each(node.childs, function(childNode) {
                renderNode(childNode, renderTotal ? level +1 : level);
            });
        }
        if ((renderTotal) && (node.totalOnBottom)) {
            self.renderResult.push(newNode);
        }
    }

    if (self.renderValid) {
        return self.renderResult;
    }

    self.renderResult = [];

    self.constructTree();

    renderNode(self.total, 0);

    self.renderValid = true;
    return self.renderResult;
};


Price2.prototype.renderTree = function() {

    var self = this;



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


    function renderTreeNode(node, parentNode) {


        var newNode = _.clone(node);
        newNode.childs = [];

        _.each(node.childs, function(childNode) {
            renderTreeNode(childNode, newNode);
        });

        var renderTotal = true;
        var renderDetail = true;
        if ((!node.showIfZero) && (node.import === 0)) renderTotal = false;
        if ((newNode.childs.length === 1)&&(!node.hideDetail)) {
            if (node.ifOneHideParent) renderTotal = false;
            if (node.ifOneHideChild) renderDetail = false;
        }
        if (node.hideDetail) renderDetail= false;
        if (node.hideTotal) renderTotal=false;

        //            newNode.parent = parentNode;

        if (!renderDetail) {
            newNode.childs = [];
        }


        if (renderTotal) {
            if (parentNode) {
                parentNode.childs.push(newNode);
            }

            if (parentNode === null) {
                self.renderTreeResult = newNode;
                newNode.level=0;
            } else {
                newNode.level = parentNode.level +1;
            }
        } else {
            if (!parentNode) {
                parentNode = {
                    childs: [],
                    hideTotal: true
                };
            }
            _.each(newNode.childs, function(n) {
                parentNode.childs.push(n);
            });
        }

    }

    if (self.renderTreeValid) {
        return self.renderTreeResult;
    }

    self.constructTree();

    renderTreeNode(self.total, null);

    self.renderTreeValid = true;
    return self.renderTreeResult;
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
},{"./date_utils":2,"./price_agregator.js":6,"./price_discount.js":7,"./price_line.js":8,"./price_vatincluded.js":9,"./round":10}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var du= require("./date_utils.js");

/*

Discount Modifier
=================

    phase             Flag of the lines that should be replaced
    execOrder           Order in which this modifier i excevuted.
    rules              Array of rules



}

*/

var PriceDiscount = function(line) {
    this.execSuborder = line.phase;
    this.line = line;
    this.execOrder = line.execOrder || 5;

};

PriceDiscount.prototype.modify = function(tree, options) {

    var self = this;

    function ruleDoesApply (rule) {
        var iReservation = du.date2int(options.reservation);
        if ((rule.reservationMin)&&(iReservation < du.date2int(rule.reservationMin))) return false;
        if ((rule.reservationMax)&&(iReservation > du.date2int(rule.reservationMax))) return false;
        var iCheckin = du.date2int(options.checkin);
        var iCheckout = du.date2int(options.checkout);
        if ((rule.daysBeforeCheckinMin)&&( iCheckin - iReservation < rule.daysBeforeCheckinMin )) return false;
        if ((rule.daysBeforeCheckinMin || rule.daysBeforeCheckinMin===0)&&( iCheckin - iReservation > rule.daysBeforeCheckinMax )) return false;
        if ((rule.checkinMin)&&( iCheckin < du.date2int(rule.checkinMin))) return false;
        if ((rule.checkinMax)&&( iCheckin > du.date2int(rule.checkinMax))) return false;
        if ((rule.checkoutMin)&&( iCheckout < du.date2int(rule.checkoutMin))) return false;
        if ((rule.checkoutMax)&&( iCheckout > du.date2int(rule.checkoutMax))) return false;
        if ((rule.minStay)&&( iCheckout - iCheckin < rule.minStay)) return false;
        if ((rule.maxStay || rule.maxStay===0)&&( iCheckout - iCheckin < rule.maxStay)) return false;
        return true;
    }


    function proportionApply(iIn, iOut, iApplyFrom, iApplyTo) {
        var a = iIn > iApplyFrom ? iIn : iApplyFrom;
        var b = iOut < iApplyTo ? iOut : iApplyTo;
        if (b>a) return 0;
        return (b-a)/(iOut-iIn);
    }

    function lineFromRule(rule) {
        var newLine = _.clone(self.line);
        var proportion;
        var vat =0;
        var base =0;
        var totalImport =0;

        _.each(tree.childs, function(l) {
            if (! _.contains(l.attributes, rule.applyIdConceptAtribute)) return;
            if (l.baseImport) return;

            if (rule.applicationType === "WHOLE") {
                proportion = 1;
            } else {
                proportion = proportionApply(
                    l.from ? du.date2int(l.from) : du.date2int(options.checkin),
                    l.to ? du.date2int(l.to) : du.date2int(options.checkout),
                    du.date2int(rule.applyFrom),
                    du.date2int(rule.applyTo));
            }

            var lVat = 0;
            _.each(l.taxes, function(tax) {
                if (tax.type === "VAT") {
                    lVat = tax.PC;
                }
            });

            vat = (vat*base + lVat*l.baseImport * proportion) / (base + l.baseImport * proportion);
            base = base + l.baseImport * proportion;
            totalImport += l.import * proportion;
        });

        newLine.baseImport = base * ( 1- rule.applyDiscountPC/100);
        newLine.import = base * ( 1- rule.applyDiscountPC/100);

        newLine.taxes = newLine.taxes || [];

        var tax = _.findWhere(newLine.taxes,{type: "VAT"});
        if (!tax) {
            tax = {
                type: "VAT"
            };
            newLine.taxes.push = tax;
        }
        tax.PC = vat;

        return newLine;
    }


    var samePhaseDiscounts = [];
    var postponedDiscounts = [];

    var i,l;
    for (i=0; i<tree.childs.length; i+=1) {
        l=tree.childs[i];
        if (l.class === "DISCOUNT") {
            if (l.phase === self.line.phase) { // Remove and get the best
                samePhaseDiscounts.push(l);
                tree.childs[i] = tree.childs[tree.childs.length-1];
                tree.childs.pop();
                i-=1;
            } else if (l.phase > self.line.phase) { // Remove and reprcess  later
                postponedDiscounts.push(l);
                tree.childs[i] = tree.childs[tree.childs.length-1];
                tree.childs.pop();
                i-=1;
            }
        }
    }

    var appliedRules = _.filter(this.rules, ruleDoesApply);

    var bestLine = _.reduce(appliedRules, function(bestLine, rule) {
        var l = lineFromRule(rule);
        if (!bestLine) return l;
        return (l.import < bestLine.import) ? l : bestLine;
    });

    if (bestLine) {
        samePhaseDiscounts.push(bestLine);

        var bestLineInPhase = _.reduce(samePhaseDiscounts, function(bestLine, line) {
            if (!line) return bestLine;
            return (line.import < bestLine.import) ? line : bestLine;
        });

        tree.childs.push(bestLineInPhase);

        postponedDiscounts = _.sortBy(postponedDiscounts, 'phase');
    }

    _.each(postponedDiscounts, function(l) {
        var modifier = new PriceDiscount(l);
        modifier.apply(tree, options);
    });
};

module.exports = PriceDiscount;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils.js":2}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvY3JlZGl0Y2FyZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2RhdGVfdXRpbHMuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9mYWtlX2U5NzlhYjIzLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2UuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZTIuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV9hZ3JlZ2F0b3IuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV9kaXNjb3VudC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2xpbmUuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV92YXRpbmNsdWRlZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3JvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyo9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xyXG5cclxuLypcclxuXHJcblRoaXMgcm91dGluZSBjaGVja3MgdGhlIGNyZWRpdCBjYXJkIG51bWJlci4gVGhlIGZvbGxvd2luZyBjaGVja3MgYXJlIG1hZGU6XHJcblxyXG4xLiBBIG51bWJlciBoYXMgYmVlbiBwcm92aWRlZFxyXG4yLiBUaGUgbnVtYmVyIGlzIGEgcmlnaHQgbGVuZ3RoIGZvciB0aGUgY2FyZFxyXG4zLiBUaGUgbnVtYmVyIGhhcyBhbiBhcHByb3ByaWF0ZSBwcmVmaXggZm9yIHRoZSBjYXJkXHJcbjQuIFRoZSBudW1iZXIgaGFzIGEgdmFsaWQgbW9kdWx1cyAxMCBudW1iZXIgY2hlY2sgZGlnaXQgaWYgcmVxdWlyZWRcclxuXHJcbklmIHRoZSB2YWxpZGF0aW9uIGZhaWxzIGFuIGVycm9yIGlzIHJlcG9ydGVkLlxyXG5cclxuVGhlIHN0cnVjdHVyZSBvZiBjcmVkaXQgY2FyZCBmb3JtYXRzIHdhcyBnbGVhbmVkIGZyb20gYSB2YXJpZXR5IG9mIHNvdXJjZXMgb24gdGhlIHdlYiwgYWx0aG91Z2ggdGhlIFxyXG5iZXN0IGlzIHByb2JhYmx5IG9uIFdpa2VwZWRpYSAoXCJDcmVkaXQgY2FyZCBudW1iZXJcIik6XHJcblxyXG4gIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ3JlZGl0X2NhcmRfbnVtYmVyXHJcblxyXG5QYXJhbWV0ZXJzOlxyXG4gICAgICAgICAgICBjYXJkbnVtYmVyICAgICAgICAgICBudW1iZXIgb24gdGhlIGNhcmRcclxuICAgICAgICAgICAgY2FyZG5hbWUgICAgICAgICAgICAgbmFtZSBvZiBjYXJkIGFzIGRlZmluZWQgaW4gdGhlIGNhcmQgbGlzdCBiZWxvd1xyXG5cclxuQXV0aG9yOiAgICAgSm9obiBHYXJkbmVyXHJcbkRhdGU6ICAgICAgIDFzdCBOb3ZlbWJlciAyMDAzXHJcblVwZGF0ZWQ6ICAgIDI2dGggRmViLiAyMDA1ICAgICAgQWRkaXRpb25hbCBjYXJkcyBhZGRlZCBieSByZXF1ZXN0XHJcblVwZGF0ZWQ6ICAgIDI3dGggTm92LiAyMDA2ICAgICAgQWRkaXRpb25hbCBjYXJkcyBhZGRlZCBmcm9tIFdpa2lwZWRpYVxyXG5VcGRhdGVkOiAgICAxOHRoIEphbi4gMjAwOCAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgZnJvbSBXaWtpcGVkaWFcclxuVXBkYXRlZDogICAgMjZ0aCBOb3YuIDIwMDggICAgICBNYWVzdHJvIGNhcmRzIGV4dGVuZGVkXHJcblVwZGF0ZWQ6ICAgIDE5dGggSnVuLiAyMDA5ICAgICAgTGFzZXIgY2FyZHMgZXh0ZW5kZWQgZnJvbSBXaWtpcGVkaWFcclxuVXBkYXRlZDogICAgMTF0aCBTZXAuIDIwMTAgICAgICBUeXBvcyByZW1vdmVkIGZyb20gRGluZXJzIGFuZCBTb2xvIGRlZmluaXRpb25zICh0aGFua3MgdG8gTm9lIExlb24pXHJcblVwZGF0ZWQ6ICAgIDEwdGggQXByaWwgMjAxMiAgICAgTmV3IG1hdGNoZXMgZm9yIE1hZXN0cm8sIERpbmVycyBFbnJvdXRlIGFuZCBTd2l0Y2hcclxuVXBkYXRlZDogICAgMTd0aCBPY3RvYmVyIDIwMTIgICBEaW5lcnMgQ2x1YiBwcmVmaXggMzggbm90IGVuY29kZWRcclxuXHJcbiovXHJcblxyXG4vKlxyXG4gICBJZiBhIGNyZWRpdCBjYXJkIG51bWJlciBpcyBpbnZhbGlkLCBhbiBlcnJvciByZWFzb24gaXMgbG9hZGVkIGludG8gdGhlIGdsb2JhbCBjY0Vycm9yTm8gdmFyaWFibGUuXHJcbiAgIFRoaXMgY2FuIGJlIGJlIHVzZWQgdG8gaW5kZXggaW50byB0aGUgZ2xvYmFsIGVycm9yICBzdHJpbmcgYXJyYXkgdG8gcmVwb3J0IHRoZSByZWFzb24gdG8gdGhlIHVzZXJcclxuICAgaWYgcmVxdWlyZWQ6XHJcblxyXG4gICBlLmcuIGlmICghY2hlY2tDcmVkaXRDYXJkIChudW1iZXIsIG5hbWUpIGFsZXJ0IChjY0Vycm9ycyhjY0Vycm9yTm8pO1xyXG4qL1xyXG5cclxudmFyIGNjRXJyb3JObyA9IDA7XHJcbnZhciBjY0Vycm9ycyA9IFtdO1xyXG5cclxuY2NFcnJvcnMgWzBdID0gXCJVbmtub3duIGNhcmQgdHlwZVwiO1xyXG5jY0Vycm9ycyBbMV0gPSBcIk5vIGNhcmQgbnVtYmVyIHByb3ZpZGVkXCI7XHJcbmNjRXJyb3JzIFsyXSA9IFwiQ3JlZGl0IGNhcmQgbnVtYmVyIGlzIGluIGludmFsaWQgZm9ybWF0XCI7XHJcbmNjRXJyb3JzIFszXSA9IFwiQ3JlZGl0IGNhcmQgbnVtYmVyIGlzIGludmFsaWRcIjtcclxuY2NFcnJvcnMgWzRdID0gXCJDcmVkaXQgY2FyZCBudW1iZXIgaGFzIGFuIGluYXBwcm9wcmlhdGUgbnVtYmVyIG9mIGRpZ2l0c1wiO1xyXG5jY0Vycm9ycyBbNV0gPSBcIldhcm5pbmchIFRoaXMgY3JlZGl0IGNhcmQgbnVtYmVyIGlzIGFzc29jaWF0ZWQgd2l0aCBhIHNjYW0gYXR0ZW1wdFwiO1xyXG5cclxuZnVuY3Rpb24gY2hlY2tDcmVkaXRDYXJkIChjYXJkbnVtYmVyKSB7XHJcblxyXG4gIC8vIEFycmF5IHRvIGhvbGQgdGhlIHBlcm1pdHRlZCBjYXJkIGNoYXJhY3RlcmlzdGljc1xyXG4gIHZhciBjYXJkcyA9IFtdO1xyXG5cclxuICAvLyBEZWZpbmUgdGhlIGNhcmRzIHdlIHN1cHBvcnQuIFlvdSBtYXkgYWRkIGFkZHRpb25hbCBjYXJkIHR5cGVzIGFzIGZvbGxvd3MuXHJcbiAgLy8gIE5hbWU6ICAgICAgICAgQXMgaW4gdGhlIHNlbGVjdGlvbiBib3ggb2YgdGhlIGZvcm0gLSBtdXN0IGJlIHNhbWUgYXMgdXNlcidzXHJcbiAgLy8gIExlbmd0aDogICAgICAgTGlzdCBvZiBwb3NzaWJsZSB2YWxpZCBsZW5ndGhzIG9mIHRoZSBjYXJkIG51bWJlciBmb3IgdGhlIGNhcmRcclxuICAvLyAgcHJlZml4ZXM6ICAgICBMaXN0IG9mIHBvc3NpYmxlIHByZWZpeGVzIGZvciB0aGUgY2FyZFxyXG4gIC8vICBjaGVja2RpZ2l0OiAgIEJvb2xlYW4gdG8gc2F5IHdoZXRoZXIgdGhlcmUgaXMgYSBjaGVjayBkaWdpdFxyXG5cclxuICBjYXJkcyBbMF0gPSB7bmFtZTogXCJWaXNhXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxMywxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI0XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxXSA9IHtuYW1lOiBcIk1hc3RlckNhcmRcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjUxLDUyLDUzLDU0LDU1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsyXSA9IHtuYW1lOiBcIkRpbmVyc0NsdWJcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE0LDE2XCIsIFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNiwzOCw1NCw1NVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbM10gPSB7bmFtZTogXCJDYXJ0ZUJsYW5jaGVcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE0XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjMwMCwzMDEsMzAyLDMwMywzMDQsMzA1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs0XSA9IHtuYW1lOiBcIkFtRXhcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE1XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjM0LDM3XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs1XSA9IHtuYW1lOiBcIkRpc2NvdmVyXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI2MDExLDYyMiw2NCw2NVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNl0gPSB7bmFtZTogXCJKQ0JcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjM1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs3XSA9IHtuYW1lOiBcImVuUm91dGVcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE1XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjIwMTQsMjE0OVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbOF0gPSB7bmFtZTogXCJTb2xvXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNiwxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI2MzM0LDY3NjdcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzldID0ge25hbWU6IFwiU3dpdGNoXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNiwxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI0OTAzLDQ5MDUsNDkxMSw0OTM2LDU2NDE4Miw2MzMxMTAsNjMzMyw2NzU5XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxMF0gPSB7bmFtZTogXCJNYWVzdHJvXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxMiwxMywxNCwxNSwxNiwxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI1MDE4LDUwMjAsNTAzOCw2MzA0LDY3NTksNjc2MSw2NzYyLDY3NjNcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzExXSA9IHtuYW1lOiBcIlZpc2FFbGVjdHJvblwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNDAyNiw0MTc1MDAsNDUwOCw0ODQ0LDQ5MTMsNDkxN1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTJdID0ge25hbWU6IFwiTGFzZXJDYXJkXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNiwxNywxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI2MzA0LDY3MDYsNjc3MSw2NzA5XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxM10gPSB7bmFtZTogXCJUZXN0XCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIxOTEyXCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IGZhbHNlfTtcclxuICB2YXIgcmVzID0ge1xyXG4gICAgdmFsaWQ6IGZhbHNlXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vIEVuc3VyZSB0aGF0IHRoZSB1c2VyIGhhcyBwcm92aWRlZCBhIGNyZWRpdCBjYXJkIG51bWJlclxyXG4gIGlmIChjYXJkbnVtYmVyLmxlbmd0aCA9PT0gMCkgIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gMTtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgLy8gTm93IHJlbW92ZSBhbnkgc3BhY2VzIGZyb20gdGhlIGNyZWRpdCBjYXJkIG51bWJlclxyXG4gIGNhcmRudW1iZXIgPSBjYXJkbnVtYmVyLnJlcGxhY2UgKC9cXHMvZywgXCJcIik7XHJcblxyXG4gIC8vIENoZWNrIHRoYXQgdGhlIG51bWJlciBpcyBudW1lcmljXHJcbiAgdmFyIGNhcmRObyA9IGNhcmRudW1iZXI7XHJcbiAgdmFyIGNhcmRleHAgPSAvXlswLTldezEzLDE5fSQvO1xyXG4gIGlmICghY2FyZGV4cC5leGVjKGNhcmRObykpICB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDI7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIEVzdGFibGlzaCBjYXJkIHR5cGVcclxuICB2YXIgY2FyZFR5cGUgPSAtMTtcclxuICBmb3IgKHZhciBpPTA7IGk8Y2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAvLyBMb2FkIGFuIGFycmF5IHdpdGggdGhlIHZhbGlkIHByZWZpeGVzIGZvciB0aGlzIGNhcmRcclxuICAgIHByZWZpeCA9IGNhcmRzW2ldLnByZWZpeGVzLnNwbGl0KFwiLFwiKTtcclxuXHJcbiAgICAvLyBOb3cgc2VlIGlmIGFueSBvZiB0aGVtIG1hdGNoIHdoYXQgd2UgaGF2ZSBpbiB0aGUgY2FyZCBudW1iZXJcclxuICAgIGZvciAoaj0wOyBqPHByZWZpeC5sZW5ndGg7IGorKykge1xyXG4gICAgICB2YXIgZXhwID0gbmV3IFJlZ0V4cCAoXCJeXCIgKyBwcmVmaXhbal0pO1xyXG4gICAgICBpZiAoZXhwLnRlc3QgKGNhcmRObykpIGNhcmRUeXBlID0gaTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIElmIGNhcmQgdHlwZSBub3QgZm91bmQsIHJlcG9ydCBhbiBlcnJvclxyXG4gIGlmIChjYXJkVHlwZSA9PSAtMSkge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSAyO1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJlcy5jY05hbWUgPSBjYXJkc1tjYXJkVHlwZV0ubmFtZTtcclxuXHJcblxyXG5cclxuICB2YXIgajtcclxuICAvLyBOb3cgY2hlY2sgdGhlIG1vZHVsdXMgMTAgY2hlY2sgZGlnaXQgLSBpZiByZXF1aXJlZFxyXG4gIGlmIChjYXJkc1tjYXJkVHlwZV0uY2hlY2tkaWdpdCkge1xyXG4gICAgdmFyIGNoZWNrc3VtID0gMDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcnVubmluZyBjaGVja3N1bSB0b3RhbFxyXG4gICAgdmFyIG15Y2hhciA9IFwiXCI7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0IGNoYXIgdG8gcHJvY2Vzc1xyXG4gICAgaiA9IDE7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0YWtlcyB2YWx1ZSBvZiAxIG9yIDJcclxuXHJcbiAgICAvLyBQcm9jZXNzIGVhY2ggZGlnaXQgb25lIGJ5IG9uZSBzdGFydGluZyBhdCB0aGUgcmlnaHRcclxuICAgIHZhciBjYWxjO1xyXG4gICAgZm9yIChpID0gY2FyZE5vLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblxyXG4gICAgICAvLyBFeHRyYWN0IHRoZSBuZXh0IGRpZ2l0IGFuZCBtdWx0aXBseSBieSAxIG9yIDIgb24gYWx0ZXJuYXRpdmUgZGlnaXRzLlxyXG4gICAgICBjYWxjID0gTnVtYmVyKGNhcmROby5jaGFyQXQoaSkpICogajtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXN1bHQgaXMgaW4gdHdvIGRpZ2l0cyBhZGQgMSB0byB0aGUgY2hlY2tzdW0gdG90YWxcclxuICAgICAgaWYgKGNhbGMgPiA5KSB7XHJcbiAgICAgICAgY2hlY2tzdW0gPSBjaGVja3N1bSArIDE7XHJcbiAgICAgICAgY2FsYyA9IGNhbGMgLSAxMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQWRkIHRoZSB1bml0cyBlbGVtZW50IHRvIHRoZSBjaGVja3N1bSB0b3RhbFxyXG4gICAgICBjaGVja3N1bSA9IGNoZWNrc3VtICsgY2FsYztcclxuXHJcbiAgICAgIC8vIFN3aXRjaCB0aGUgdmFsdWUgb2YgalxyXG4gICAgICBpZiAoaiA9PTEpIHtcclxuICAgICAgICBqID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBqID0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFsbCBkb25lIC0gaWYgY2hlY2tzdW0gaXMgZGl2aXNpYmxlIGJ5IDEwLCBpdCBpcyBhIHZhbGlkIG1vZHVsdXMgMTAuXHJcbiAgICAvLyBJZiBub3QsIHJlcG9ydCBhbiBlcnJvci5cclxuICAgIGlmIChjaGVja3N1bSAlIDEwICE9PSAwKSAge1xyXG4gICAgICByZXMuY2NFcnJvck5vID0gMztcclxuICAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgIHJldHVybiByZXM7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpdCdzIG5vdCBhIHNwYW0gbnVtYmVyXHJcbiAgaWYgKGNhcmRObyA9PSAnNTQ5MDk5Nzc3MTA5MjA2NCcpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gNTtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgLy8gVGhlIGZvbGxvd2luZyBhcmUgdGhlIGNhcmQtc3BlY2lmaWMgY2hlY2tzIHdlIHVuZGVydGFrZS5cclxuICB2YXIgTGVuZ3RoVmFsaWQgPSBmYWxzZTtcclxuICB2YXIgUHJlZml4VmFsaWQgPSBmYWxzZTtcclxuXHJcbiAgLy8gV2UgdXNlIHRoZXNlIGZvciBob2xkaW5nIHRoZSB2YWxpZCBsZW5ndGhzIGFuZCBwcmVmaXhlcyBvZiBhIGNhcmQgdHlwZVxyXG4gIHZhciBwcmVmaXggPSBbXTtcclxuICB2YXIgbGVuZ3RocyA9IFtdO1xyXG5cclxuICAvLyBTZWUgaWYgdGhlIGxlbmd0aCBpcyB2YWxpZCBmb3IgdGhpcyBjYXJkXHJcbiAgbGVuZ3RocyA9IGNhcmRzW2NhcmRUeXBlXS5sZW5ndGguc3BsaXQoXCIsXCIpO1xyXG4gIGZvciAoaj0wOyBqPGxlbmd0aHMubGVuZ3RoOyBqKyspIHtcclxuICAgIGlmIChjYXJkTm8ubGVuZ3RoID09IGxlbmd0aHNbal0pIExlbmd0aFZhbGlkID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIFNlZSBpZiBhbGwgaXMgT0sgYnkgc2VlaW5nIGlmIHRoZSBsZW5ndGggd2FzIHZhbGlkLiBXZSBvbmx5IGNoZWNrIHRoZSBsZW5ndGggaWYgYWxsIGVsc2Ugd2FzIFxyXG4gIC8vIGh1bmt5IGRvcnkuXHJcbiAgaWYgKCFMZW5ndGhWYWxpZCkge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSA0O1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICByZXMudmFsaWQgPSB0cnVlO1xyXG5cclxuICAvLyBUaGUgY3JlZGl0IGNhcmQgaXMgaW4gdGhlIHJlcXVpcmVkIGZvcm1hdC5cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXHJcblxyXG5tb2R1bGUuZXhwb3J0cy5jaGVja0NyZWRpdENhcmQgPSBjaGVja0NyZWRpdENhcmQ7XHJcblxyXG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxuXG52YXIgbW9tZW50ID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ21vbWVudCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnbW9tZW50J10gOiBudWxsKTtcblxudmFyIHZpcnR1YWxUaW1lID0gbnVsbDtcbmV4cG9ydHMubm93ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHZpcnR1YWxUaW1lKSB7XG4gICAgICAgIHJldHVybiB2aXJ0dWFsVGltZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoKTtcbiAgICB9XG59O1xuXG5leHBvcnRzLnNldFZpcnR1YWxUaW1lID0gZnVuY3Rpb24odCkge1xuICAgIHZpcnR1YWxUaW1lID0gdDtcbn07XG5cbmV4cG9ydHMuZGF0ZTJzdHIgPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC50b0lTT1N0cmluZygpLnN1YnN0cmluZygwLDEwKTtcbn07XG5cbmV4cG9ydHMuZGF0ZTJpbnQgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoZC5nZXRUaW1lKCkgLyA4NjQwMDAwMCk7XG59O1xuXG5cbmV4cG9ydHMuaW50RGF0ZTJzdHIgPSBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGR0O1xuICAgIGlmIChkIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBkdCA9IGQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZHQgPSBuZXcgRGF0ZShkKjg2NDAwMDAwKTtcbiAgICB9XG4gICAgcmV0dXJuIGR0LnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsMTApO1xufTtcblxuZXhwb3J0cy5pbnQyZGF0ZSA9IGZ1bmN0aW9uKGQpIHtcbiAgICBpZiAoZCBpbnN0YW5jZW9mIERhdGUpIHJldHVybiBkO1xuICAgIHZhciBkdCA9IG5ldyBEYXRlKGQqODY0MDAwMDApO1xuICAgIHJldHVybiBkdDtcbn07XG5cbmV4cG9ydHMudG9kYXkgPSBmdW5jdGlvbih0eikge1xuICAgIHR6ID0gdHogfHwgJ1VUQyc7XG5cbiAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHoodHopO1xuICAgIHZhciBkYXRlU3RyID0gZHQuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgdmFyIGR0MiA9IG5ldyBEYXRlKGRhdGVTdHIrJ1QwMDowMDowMC4wMDBaJyk7XG5cbiAgICByZXR1cm4gZHQyLmdldFRpbWUoKSAvIDg2NDAwMDAwO1xufTtcblxuXG5cblxuXG4vLy8gQ1JPTiBJTVBMRU1FTlRBVElPTlxuXG5mdW5jdGlvbiBtYXRjaE51bWJlcihuLCBmaWx0ZXIpIHtcbiAgICBuID0gcGFyc2VJbnQobik7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiB0cnVlO1xuICAgIGlmIChmaWx0ZXIgPT09ICcqJykgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZpbHRlciA9PT0gbikgcmV0dXJuIHRydWU7XG4gICAgdmFyIGYgPSBmaWx0ZXIudG9TdHJpbmcoKTtcbiAgICB2YXIgb3B0aW9ucyA9IGYuc3BsaXQoJywnKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3B0aW9uczsgaSs9MSkge1xuICAgICAgICB2YXIgYXJyID0gb3B0aW9uc1tpXS5zcGxpdCgnLScpO1xuICAgICAgICBpZiAoYXJyLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHBhcnNlSW50KGFyclswXSwxMCkgPT09IG4pIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGFyci5sZW5ndGggPT09Mikge1xuICAgICAgICAgICAgdmFyIGZyb20gPSBwYXJzZUludChhcnJbMF0sMTApO1xuICAgICAgICAgICAgdmFyIHRvID0gcGFyc2VJbnQoYXJyWzFdLDEwKTtcbiAgICAgICAgICAgIGlmICgobj49ZnJvbSApICYmIChuPD0gdG8pKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gbWF0Y2hKb2Ioam9iLCBjcm9uRGF0ZSkge1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDAsMiksIGpvYi5taW51dGUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoMiwyKSwgam9iLmhvdXIpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoNCwyKSwgam9iLmRheU9mTW9udGgpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoNiwyKSwgam9iLm1vbnRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDgsMSksIGpvYi5kYXlPZldlZWspKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBjcm9uSm9icyA9IFtdO1xuZXhwb3J0cy5hZGRDcm9uSm9iID0gZnVuY3Rpb24oam9iKSB7XG5cblxuICAgIGpvYi50eiA9IGpvYi50eiB8fCAnVVRDJztcblxuICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eihqb2IudHopO1xuICAgIHZhciBjcm9uRGF0ZSA9IGR0LmZvcm1hdCgnbW1ISERETU1kJyk7XG4gICAgam9iLmxhc3QgPSBjcm9uRGF0ZTtcbiAgICBqb2IuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgY3JvbkpvYnMucHVzaChqb2IpO1xuICAgIHJldHVybiBjcm9uSm9icy5sZW5ndGggLTE7XG59O1xuXG5leHBvcnRzLmRlbGV0ZUNyb25Kb2IgPSBmdW5jdGlvbihpZEpvYikge1xuICAgIGRlbGV0ZSBjcm9uSm9ic1tpZEpvYl07XG59O1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmUgYSBtaW51dGUgaW4gdGhlIGJlZ2luaW5nIG9mIGVhY2ggbWludXRlLlxuLy8gaXQgaXMgdXNlZCB0byBjcm9uIGFueSBmdW5jdGlvblxudmFyIG9uTWludXRlID0gZnVuY3Rpb24oKSB7XG5cblxuICAgIGNyb25Kb2JzLmZvckVhY2goZnVuY3Rpb24oam9iKSB7XG4gICAgICAgIGlmICgham9iKSByZXR1cm47XG5cbiAgICAgICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KGpvYi50eik7XG4gICAgICAgIHZhciBjcm9uRGF0ZSA9IGR0LmZvcm1hdCgnbW1ISERETU1kJyk7XG5cbiAgICAgICAgaWYgKChjcm9uRGF0ZSAhPT0gam9iLmxhc3QpICYmIChtYXRjaEpvYihqb2IsIGNyb25EYXRlKSkpIHtcbiAgICAgICAgICAgIGlmIChqb2IuZXhlY3V0aW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJKb2IgdGFrZXMgdG9vIGxvbmcgdG8gZXhlY3V0ZTogXCIgKyBqb2IubmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGpvYi5sYXN0ID0gY3JvbkRhdGU7XG4gICAgICAgICAgICAgICAgam9iLmV4ZWN1dGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgam9iLmNiKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBqb2IuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBub3cgPSBleHBvcnRzLm5vdygpLmdldFRpbWUoKTtcbiAgICB2YXIgbWlsbHNUb05leHRNaW51dGUgPSA2MDAwMCAtIG5vdyAlIDYwMDAwO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIG9uTWludXRlKCk7XG4gICAgfSwgbWlsbHNUb05leHRNaW51dGUpO1xufTtcblxub25NaW51dGUoKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBtYXN0ZXJVdGlscyA9IHtcbiAgICAgICAgZGF0ZVV0aWxzOiByZXF1aXJlKCcuL2RhdGVfdXRpbHMuanMnKSxcbiAgICAgICAgcm91bmQ6IHJlcXVpcmUoJy4vcm91bmQuanMnKSxcbiAgICAgICAgUHJpY2U6ICByZXF1aXJlKCcuL3ByaWNlLmpzJyksXG4gICAgICAgIFByaWNlMjogcmVxdWlyZSgnLi9wcmljZTIuanMnKSxcbiAgICAgICAgY2hlY2tzOiB7XG4gICAgICAgICAgICBjaGVja0NyZWRpdENhcmQ6IHJlcXVpcmUoJy4vY3JlZGl0Y2FyZC5qcycpLmNoZWNrQ3JlZGl0Q2FyZFxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciByb290ID0gdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnICYmIHNlbGYuc2VsZiA9PT0gc2VsZiAmJiBzZWxmIHx8XG4gICAgICAgICAgICB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwuZ2xvYmFsID09PSBnbG9iYWwgJiYgZ2xvYmFsIHx8XG4gICAgICAgICAgICB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBtYXN0ZXJVdGlscztcbiAgICAgICAgfVxuICAgICAgICBleHBvcnRzLm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcm9vdC5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHdpbmRvdy5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH1cblxufSgpKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIHJvdW5kID0gcmVxdWlyZSgnLi9yb3VuZCcpO1xudmFyIGR1ID0gcmVxdWlyZSgnLi9kYXRlX3V0aWxzJyk7XG5cbnZhciBQcmljZSA9IGZ1bmN0aW9uKGxpbmVzKSB7XG4gICAgaWYgKCFsaW5lcykgbGluZXMgPVtdO1xuXG4gICAgLy8gSWYgYW5vdGhlciBwcmljZSAoaGFzIGxpbmVzKVxuICAgIGlmIChsaW5lcy5saW5lcykge1xuICAgICAgICBsaW5lcyA9IGxpbmVzLmxpbmVzO1xuICAgIH1cblxuLy8gQ2xvbmUgdGhlIGFycmF5O1xuICAgIHRoaXMubGluZXMgPSBfLm1hcChsaW5lcywgXy5jbG9uZSk7XG59O1xuXG5QcmljZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9iai5saW5lcyA9IF8ubWFwKHRoaXMubGluZXMsIF8uY2xvbmUpO1xuICAgIF8uZWFjaChvYmoubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsLmZyb20gPT09IFwibnVtYmVyXCIpIGwuZnJvbSA9IGR1LmludDJkYXRlKGwuZnJvbSk7XG4gICAgICAgIGlmICh0eXBlb2YgbC50byA9PT0gXCJudW1iZXJcIikgbC50byA9IGR1LmludDJkYXRlKGwudG8pO1xuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5QcmljZS5wcm90b3R5cGUubGluZVByaWNlID0gZnVuY3Rpb24obGluZSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgICAgIHdpdGhUYXhlczogdHJ1ZSxcbiAgICAgICAgd2l0aERpc2NvdW50czogdHJ1ZSxcbiAgICAgICAgcm91bmRlZDogdHJ1ZSxcbiAgICAgICAgYmFzZTogMFxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdmFyIHByaWNlO1xuICAgIGlmICh0eXBlb2YgbGluZS5wcmljZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICBwcmljZSA9IGxpbmUucHJpY2U7XG4gICAgfSBlbHNlIGlmICggKHR5cGVvZiBsaW5lLnByaWNlPT09XCJvYmplY3RcIikgJiYgKGxpbmUucHJpY2UudHlwZSA9PT0gJ1BFUicpICkge1xuICAgICAgICBwcmljZSA9IG9wdGlvbnMuYmFzZSAqIGxpbmUucHJpY2UucHJpY2VQQy8xMDA7XG4gICAgICAgIGlmIChwcmljZTxsaW5lLnByaWNlLnByaWNlTWluKSBwcmljZSA9IGxpbmUucHJpY2UucHJpY2VNaW47XG4gICAgfSBlbHNlIGlmICggKHR5cGVvZiBsaW5lLnByaWNlPT09XCJvYmplY3RcIikgJiYgKGxpbmUucHJpY2UudHlwZSA9PT0gJ0VTQycpICkge1xuICAgICAgICBwcmljZT1OdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICBfLmVhY2gobGluZS5wcmljZS5zY2FsZVByaWNlcywgZnVuY3Rpb24oc3ApIHtcbiAgICAgICAgICAgIGlmICgob3B0aW9ucy5iYXNlIDw9IHNwLnN0YXlQcmljZU1heCkgJiYgKHNwLnByaWNlIDwgcHJpY2UpKSB7XG4gICAgICAgICAgICAgICAgcHJpY2UgPSBzcC5wcmljZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChwcmljZSA9PT0gTnVtYmVyLk1BWF9WQUxVRSkge1xuICAgICAgICAgICAgcHJpY2UgPSBOYU47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcHJpY2U7XG59O1xuXG5cblByaWNlLnByb3RvdHlwZS5saW5lSW1wb3J0ID0gZnVuY3Rpb24obGluZSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgICAgIHdpdGhUYXhlczogdHJ1ZSxcbiAgICAgICAgd2l0aERpc2NvdW50czogdHJ1ZSxcbiAgICAgICAgcm91bmRlZDogdHJ1ZSxcbiAgICAgICAgYmFzZTogMFxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdmFyIHByaWNlID0gdGhpcy5saW5lUHJpY2UobGluZSxvcHRpb25zKTtcblxuICAgIHZhciBsaW5lSW1wb3J0ID0gcHJpY2UgKiBsaW5lLnF1YW50aXR5O1xuICAgIGlmICghaXNOYU4obGluZS5wZXJpb2RzKSkge1xuICAgICAgICBsaW5lSW1wb3J0ID0gbGluZUltcG9ydCAqIGxpbmUucGVyaW9kcztcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy53aXRoRGlzY291bnRzKSB7XG4gICAgICAgIHZhciBiYXNlID0gbGluZUltcG9ydDtcbiAgICAgICAgXy5lYWNoKGxpbmUuZGlzY291bnRzLCBmdW5jdGlvbihkaXNjb3VudCkge1xuICAgICAgICAgICAgaWYgKGRpc2NvdW50LnR5cGUgPT09IFwiUENcIikge1xuICAgICAgICAgICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0IC0gYmFzZSAqIGRpc2NvdW50LlBDLzEwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMud2l0aFRheGVzKSB7XG4gICAgICAgIF8uZWFjaChsaW5lLnRheGVzLCBmdW5jdGlvbih0YXgpIHtcbiAgICAgICAgICAgIGlmICh0YXgudHlwZT09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgbGluZUltcG9ydCA9IGxpbmVJbXBvcnQgKiAoMSArIHRheC5QQy8xMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5yb3VuZGVkKSB7XG4gICAgICAgIGxpbmVJbXBvcnQgPSByb3VuZChsaW5lSW1wb3J0LCBcIlJPVU5EXCIsIDAuMDEpO1xuICAgIH1cblxuICAgIHJldHVybiBsaW5lSW1wb3J0O1xufTtcblxuUHJpY2UucHJvdG90eXBlLmdldEltcG9ydCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IF8uZXh0ZW5kKHtcbiAgICAgICAgd2l0aFRheGVzOiB0cnVlLFxuICAgICAgICB3aXRoRGlzY291bnRzOiB0cnVlLFxuICAgICAgICByb3VuZGVkOiB0cnVlXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgb2xkUm91bmRlZCA9IG9wdGlvbnMucm91bmRlZDtcblxuICAgIG9wdGlvbnMucm91bmRlZCA9IGZhbHNlO1xuICAgIHZhciBhYyA9IF8ucmVkdWNlKHNlbGYubGluZXMsIGZ1bmN0aW9uKG1lbW8sIGxpbmUpIHtcbiAgICAgICAgcmV0dXJuIG1lbW8gKyBzZWxmLmxpbmVJbXBvcnQobGluZSwgb3B0aW9ucyk7XG4gICAgfSwwKTtcblxuICAgIGlmIChvbGRSb3VuZGVkKSB7XG4gICAgICAgIGFjID0gcm91bmQoYWMsIFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFjO1xufTtcblxuUHJpY2UucHJvdG90eXBlLmFkZFByaWNlID0gZnVuY3Rpb24ocCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGlmICghcCkgcmV0dXJuO1xuICAgICAgICB2YXIgY3AgPSBfLmNsb25lKHApO1xuICAgICAgICBfLmVhY2goY3AubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgIHNlbGYubGluZXMucHVzaChsKTtcbiAgICAgICAgfSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2U7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcbnZhciByb3VuZCA9IHJlcXVpcmUoJy4vcm91bmQnKTtcbnZhciBkdSA9IHJlcXVpcmUoJy4vZGF0ZV91dGlscycpO1xuXG4vKlxuLy8gVklTVUFMSVpBVElPTiBGTEFHUyBJTiBFQUNIIE5PREVcbiAgICBzaG93SWZaZXJvOiAgICAgICAgIFNob3cgZXZlbiBpZiBUb3RhbCBpcyB6ZXJvXG4gICAgaWZPbmVIaWRlUGFyZW50OiAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoaXMgZ3JvdXAgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlIGl0IHdpdGggdGhlIGNoYWxkXG4gICAgaWZPbmVIaWRlQ2hpbGQ6ICAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoZSBjaGlsZFxuICAgIGhpZGVUb3RhbDogICAgICAgICAgSnVzdCByZW1vdmUgIHRoZSB0b3RhbCBhbmQgcHV0IGFsbCB0aGUgY2hpbGRzXG4gICAgdG90YWxPbkJvdHRvbTogICAgICAgICBQdXQgdGhlIFRvdGFsIG9uIHRoZSBkb3BcbiAgICBoaWRlRGV0YWlsOiAgICAgICAgIERvIG5vdCBzaG93IHRoZSBkZXRhaWxzXG4qL1xuXG5cbnZhciByZWdpc3RlcmVkTW9kaWZpZXJzID0ge1xuICAgIFwiQUdSRUdBVE9SXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2FncmVnYXRvci5qc1wiKSxcbiAgICBcIkxJTkVcIjogcmVxdWlyZShcIi4vcHJpY2VfbGluZS5qc1wiKSxcbiAgICBcIlZBVElOQ0xVREVEXCI6IHJlcXVpcmUoXCIuL3ByaWNlX3ZhdGluY2x1ZGVkLmpzXCIpLFxuICAgIFwiRElTQ09VTlRcIjogcmVxdWlyZShcIi4vcHJpY2VfZGlzY291bnQuanNcIilcbn07XG5cbnZhciBQcmljZTIgPSBmdW5jdGlvbihwMSwgcDIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5saW5lcyA9IFtdO1xuICAgIHNlbGYub3B0aW9ucyA9IHt9O1xuICAgIF8uZWFjaChhcmd1bWVudHMsIGZ1bmN0aW9uKHApIHtcbiAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICAgIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYocC5saW5lcykpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmxpbmVzLmNvbmNhdChfLm1hcChwLmxpbmVzLCBfLmNsb25lKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHAgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgIHNlbGYubGluZXMuY29uY2F0KF8ubWFwKHAsIF8uY2xvbmUpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSYmKHAuY2xhc3MgfHwgcC5sYWJlbCkpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShwKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vcHRpb25zID0gcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2VsZi50cmVlVmFsaWQ9ZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJWYWxpZD1mYWxzZTtcbiAgICBzZWxmLnJlbmRlclRyZWVWYWxpZD1mYWxzZTtcbn07XG5cblByaWNlMi5wcm90b3R5cGUuYWRkUHJpY2UgPSBmdW5jdGlvbihwKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghcCkgcmV0dXJuO1xuICAgIHZhciBjcDtcbiAgICBpZiAoKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSYmIChwLmxpbmVzKSkge1xuICAgICAgICBjcCA9IHAubGluZXM7XG4gICAgfSBlbHNlIGlmIChjcCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGNwID0gcDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIGNwID0gW3BdO1xuICAgIH1cbiAgICBfLmVhY2goY3AsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUobCkpO1xuICAgIH0pO1xuICAgIHNlbGYudHJlZVZhbGlkPWZhbHNlO1xuICAgIHNlbGYucmVuZGVyVmFsaWQgPSBmYWxzZTtcbiAgICBzZWxmLnJlbmRlclRyZWVWYWxpZCA9IGZhbHNlO1xufTtcblxuXG5QcmljZTIucHJvdG90eXBlLmNvbnN0cnVjdFRyZWUgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIHNvcnRUcmVlKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRzKSB7XG4gICAgICAgICAgICBub2RlLmNoaWxkcyA9IF8uc29ydEJ5QWxsKG5vZGUuY2hpbGRzLCBbXCJvcmRlclwiLCBcInN1Ym9yZGVyXCJdKTtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgc29ydFRyZWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY1RvdGFsKG5vZGUpIHtcbiAgICAgICAgbm9kZS5pbXBvcnQgPSBub2RlLmltcG9ydCB8fCAwO1xuICAgICAgICBpZiAobm9kZS5jaGlsZHMpIHtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24oYykge1xuICAgICAgICAgICAgICAgIG5vZGUuaW1wb3J0ICs9IGNhbGNUb3RhbChjKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlLmltcG9ydDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByb3VuZEltcG9ydHMobm9kZSkge1xuICAgICAgICBub2RlLmltcG9ydCA9IHJvdW5kKG5vZGUuaW1wb3J0LCBcIlJPVU5EXCIsIDAuMDEpO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIHJvdW5kSW1wb3J0cyk7XG4gICAgfVxuXG4gICAgaWYgKHNlbGYudHJlZVZhbGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnRvdGFsO1xuICAgIH1cblxuICAgIHNlbGYudG90YWwgPSB7XG4gICAgICAgIGlkOiBcInRvdGFsXCIsXG4gICAgICAgIGxhYmVsOiBcIkBUb3RhbFwiLFxuICAgICAgICBjaGlsZHM6IFtdLFxuXG4gICAgICAgIHNob3dJZlplcm86IHRydWUsXG4gICAgICAgIHRvdGFsT25Cb3R0b206IHRydWVcbiAgICB9O1xuXG4gICAgdmFyIG1vZGlmaWVycyA9IFtdO1xuXG4gICAgdmFyIGkgPTA7XG5cbiAgICBfLmVhY2goc2VsZi5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICBsLnN1Ym9yZGVyID0gaSsrOyAgICAgICAgICAgICAgIC8vIHN1Ym9yZGVyIGlzIHRoZSBvcmlnaW5hbCBvcmRlci4gSW4gY2FzZSBvZiB0aWUgdXNlIHRoaXMuXG4gICAgICAgIGwuY2xhc3MgPSBsLmNsYXNzIHx8IFwiTElORVwiO1xuICAgICAgICBpZiAoIXJlZ2lzdGVyZWRNb2RpZmllcnNbbC5jbGFzc10pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vZGlmaWVyIFwiICsgbC5jbGFzcyArIFwiIG5vdCBkZWZpbmVkLlwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbW9kaWZpZXIgPSBuZXcgcmVnaXN0ZXJlZE1vZGlmaWVyc1tsLmNsYXNzXShsKTtcbiAgICAgICAgbW9kaWZpZXIuc3Vib3JkZXIgPSBpO1xuICAgICAgICBtb2RpZmllcnMucHVzaChtb2RpZmllcik7XG4gICAgfSk7XG5cbiAgICBtb2RpZmllcnMgPSBfLnNvcnRCeUFsbChtb2RpZmllcnMsIFtcImV4ZWNPcmRlclwiLCBcImV4ZWNTdWJPcmRlclwiLCBcInN1Ym9yZGVyXCJdKTtcblxuICAgIF8uZWFjaChtb2RpZmllcnMsIGZ1bmN0aW9uKG0pIHtcbiAgICAgICAgbS5tb2RpZnkoc2VsZi50b3RhbCwgc2VsZi5vcHRpb25zKTtcbiAgICB9KTtcblxuICAgIHNvcnRUcmVlKHNlbGYudG90YWwpO1xuXG4gICAgY2FsY1RvdGFsKHNlbGYudG90YWwpO1xuICAgIHJvdW5kSW1wb3J0cyhzZWxmLnRvdGFsKTtcblxuICAgIHNlbGYudHJlZVZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi50b3RhbDtcbn07XG5cblByaWNlMi5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblxuXG4vKlxuLy8gVklTVUFMSVpBVElPTiBGTEFHUyBJTiBFQUNIIE5PREVcbiAgICBzaG93SWZaZXJvOiAgICAgICAgIFNob3cgZXZlbiBpZiBUb3RhbCBpcyB6ZXJvXG4gICAgaWZPbmVIaWRlUGFyZW50OiAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoaXMgZ3JvdXAgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlIGl0IHdpdGggdGhlIGNoYWxkXG4gICAgaWZPbmVIaWRlQ2hpbGQ6ICAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoZSBjaGlsZFxuICAgIGhpZGVUb3RhbDogICAgICAgICAgSnVzdCByZW1vdmUgIHRoZSB0b3RhbCBhbmQgcHV0IGFsbCB0aGUgY2hpbGRzXG4gICAgdG90YWxPbkJvdHRvbTogICAgICAgICBQdXQgdGhlIFRvdGFsIG9uIHRoZSBkb3BcbiAgICBoaWRlRGV0YWlsOiAgICAgICAgIERvIG5vdCBzaG93IHRoZSBkZXRhaWxzXG4qL1xuXG5cbiAgICBmdW5jdGlvbiByZW5kZXJOb2RlKG5vZGUsIGxldmVsKSB7XG5cbiAgICAgICAgdmFyIHJlbmRlclRvdGFsID0gdHJ1ZTtcbiAgICAgICAgdmFyIHJlbmRlckRldGFpbCA9IHRydWU7XG4gICAgICAgIGlmICgoIW5vZGUuc2hvd0lmWmVybykgJiYgKG5vZGUuaW1wb3J0ID09PSAwKSkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgaWYgKChub2RlLmNoaWxkcykmJihub2RlLmNoaWxkcy5sZW5ndGggPT09IDEpJiYoIW5vZGUuaGlkZURldGFpbCkpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZVBhcmVudCkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZUNoaWxkKSByZW5kZXJEZXRhaWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS5oaWRlRGV0YWlsKSByZW5kZXJEZXRhaWw9IGZhbHNlO1xuICAgICAgICBpZiAobm9kZS5oaWRlVG90YWwpIHJlbmRlclRvdGFsPWZhbHNlO1xuXG4gICAgICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZShub2RlKTtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuY2hpbGRzO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5zaG93SWZaZXJvO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5oaWRlRGV0YWlsO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5oaWRlVG90YWw7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmlmT25lSGlkZVBhcmVudDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaWZPbmVIaWRlQ2hpbGQ7XG4gICAgICAgIG5ld05vZGUubGV2ZWwgPSBsZXZlbDtcblxuICAgICAgICBpZiAoKHJlbmRlclRvdGFsKSAmJiAoIW5vZGUudG90YWxPbkJvdHRvbSkpIHtcbiAgICAgICAgICAgIHNlbGYucmVuZGVyUmVzdWx0LnB1c2gobmV3Tm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVuZGVyRGV0YWlsKSB7XG4gICAgICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgICAgIHJlbmRlck5vZGUoY2hpbGROb2RlLCByZW5kZXJUb3RhbCA/IGxldmVsICsxIDogbGV2ZWwpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChyZW5kZXJUb3RhbCkgJiYgKG5vZGUudG90YWxPbkJvdHRvbSkpIHtcbiAgICAgICAgICAgIHNlbGYucmVuZGVyUmVzdWx0LnB1c2gobmV3Tm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2VsZi5yZW5kZXJWYWxpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi5yZW5kZXJSZXN1bHQ7XG4gICAgfVxuXG4gICAgc2VsZi5yZW5kZXJSZXN1bHQgPSBbXTtcblxuICAgIHNlbGYuY29uc3RydWN0VHJlZSgpO1xuXG4gICAgcmVuZGVyTm9kZShzZWxmLnRvdGFsLCAwKTtcblxuICAgIHNlbGYucmVuZGVyVmFsaWQgPSB0cnVlO1xuICAgIHJldHVybiBzZWxmLnJlbmRlclJlc3VsdDtcbn07XG5cblxuUHJpY2UyLnByb3RvdHlwZS5yZW5kZXJUcmVlID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cblxuXG4vKlxuLy8gVklTVUFMSVpBVElPTiBGTEFHUyBJTiBFQUNIIE5PREVcbiAgICBzaG93SWZaZXJvOiAgICAgICAgIFNob3cgZXZlbiBpZiBUb3RhbCBpcyB6ZXJvXG4gICAgaWZPbmVIaWRlUGFyZW50OiAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoaXMgZ3JvdXAgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlIGl0IHdpdGggdGhlIGNoYWxkXG4gICAgaWZPbmVIaWRlQ2hpbGQ6ICAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoZSBjaGlsZFxuICAgIGhpZGVUb3RhbDogICAgICAgICAgSnVzdCByZW1vdmUgIHRoZSB0b3RhbCBhbmQgcHV0IGFsbCB0aGUgY2hpbGRzXG4gICAgdG90YWxPbkJvdHRvbTogICAgICAgICBQdXQgdGhlIFRvdGFsIG9uIHRoZSBkb3BcbiAgICBoaWRlRGV0YWlsOiAgICAgICAgIERvIG5vdCBzaG93IHRoZSBkZXRhaWxzXG4qL1xuXG5cbiAgICBmdW5jdGlvbiByZW5kZXJUcmVlTm9kZShub2RlLCBwYXJlbnROb2RlKSB7XG5cblxuICAgICAgICB2YXIgbmV3Tm9kZSA9IF8uY2xvbmUobm9kZSk7XG4gICAgICAgIG5ld05vZGUuY2hpbGRzID0gW107XG5cbiAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgIHJlbmRlclRyZWVOb2RlKGNoaWxkTm9kZSwgbmV3Tm9kZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciByZW5kZXJUb3RhbCA9IHRydWU7XG4gICAgICAgIHZhciByZW5kZXJEZXRhaWwgPSB0cnVlO1xuICAgICAgICBpZiAoKCFub2RlLnNob3dJZlplcm8pICYmIChub2RlLmltcG9ydCA9PT0gMCkpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgIGlmICgobmV3Tm9kZS5jaGlsZHMubGVuZ3RoID09PSAxKSYmKCFub2RlLmhpZGVEZXRhaWwpKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVQYXJlbnQpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVDaGlsZCkgcmVuZGVyRGV0YWlsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUuaGlkZURldGFpbCkgcmVuZGVyRGV0YWlsPSBmYWxzZTtcbiAgICAgICAgaWYgKG5vZGUuaGlkZVRvdGFsKSByZW5kZXJUb3RhbD1mYWxzZTtcblxuICAgICAgICAvLyAgICAgICAgICAgIG5ld05vZGUucGFyZW50ID0gcGFyZW50Tm9kZTtcblxuICAgICAgICBpZiAoIXJlbmRlckRldGFpbCkge1xuICAgICAgICAgICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKHJlbmRlclRvdGFsKSB7XG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUuY2hpbGRzLnB1c2gobmV3Tm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5yZW5kZXJUcmVlUmVzdWx0ID0gbmV3Tm9kZTtcbiAgICAgICAgICAgICAgICBuZXdOb2RlLmxldmVsPTA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld05vZGUubGV2ZWwgPSBwYXJlbnROb2RlLmxldmVsICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgaGlkZVRvdGFsOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uZWFjaChuZXdOb2RlLmNoaWxkcywgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUuY2hpbGRzLnB1c2gobik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgaWYgKHNlbGYucmVuZGVyVHJlZVZhbGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnJlbmRlclRyZWVSZXN1bHQ7XG4gICAgfVxuXG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICByZW5kZXJUcmVlTm9kZShzZWxmLnRvdGFsLCBudWxsKTtcblxuICAgIHNlbGYucmVuZGVyVHJlZVZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi5yZW5kZXJUcmVlUmVzdWx0O1xufTtcblxuZnVuY3Rpb24gZmluZE5vZGUobm9kZSwgaWQpIHtcbiAgICB2YXIgaTtcbiAgICBpZiAoIW5vZGUpIHJldHVybiBudWxsO1xuICAgIGlmIChub2RlLmlkID09PSBpZCkgcmV0dXJuIG5vZGU7XG4gICAgaWYgKCFub2RlLmNoaWxkcykgcmV0dXJuIG51bGw7XG4gICAgZm9yIChpPTA7IGk8bm9kZS5jaGlsZHMubGVuZ3RoOyBpKz0xKSB7XG4gICAgICAgIHZhciBmTm9kZSA9IGZpbmROb2RlKG5vZGUuY2hpbGRzW2ldLCBpZCk7XG4gICAgICAgIGlmIChmTm9kZSkgcmV0dXJuIGZOb2RlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuUHJpY2UyLnByb3RvdHlwZS5nZXRJbXBvcnQgPSBmdW5jdGlvbihpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZCA9IGlkIHx8IFwidG90YWxcIjtcbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHZhciBub2RlID0gZmluZE5vZGUoc2VsZi50b3RhbCwgaWQpO1xuXG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuaW1wb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cblByaWNlMi5wcm90b3R5cGUuYWRkQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGF0cmlidXRlKSB7XG4gICAgdmFyIHNlbGY9dGhpcztcbiAgICB2YXIgYXR0cnM7XG4gICAgaWYgKHR5cGVvZiBhdHJpYnV0ZSA9PT0gXCJzdHJpbmdcIiApIHtcbiAgICAgICAgYXR0cnMgPSBbYXRyaWJ1dGVdO1xuICAgIH0gZWxzZSBpZiAoYXRyaWJ1dGUgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBhdHRycyA9IGF0cmlidXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgQXR0cmlidXRlXCIpO1xuICAgIH1cbiAgICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgXy5lYWNoKHNlbGYubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgIGlmICghbC5hdHRyaWJ1dGVzKSBsLmF0dHJpYnV0ZXMgPSBbXTtcbiAgICAgICAgICAgIGlmICghXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIGEpKSB7XG4gICAgICAgICAgICAgICAgbC5hdHRyaWJ1dGVzLnB1c2goYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqLmxpbmVzID0gXy5tYXAodGhpcy5saW5lcywgXy5jbG9uZSk7XG4gICAgXy5lYWNoKG9iai5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICBpZiAodHlwZW9mIGwuZnJvbSA9PT0gXCJudW1iZXJcIikgbC5mcm9tID0gZHUuaW50MmRhdGUobC5mcm9tKTtcbiAgICAgICAgaWYgKHR5cGVvZiBsLnRvID09PSBcIm51bWJlclwiKSBsLnRvID0gZHUuaW50MmRhdGUobC50byk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbn07XG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZTI7XG5cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG4vKlxuXG5BZ3JlZ2F0ZSBNb2RpZmllclxuPT09PT09PT09PT09PT09PT1cblxuICAgIGdyb3VwQnkgICAgICAgICAgICAgRmxhZyBvZiB0aGUgbGluZXMgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWRcbiAgICBleGVjT3JkZXIgICAgICAgICAgIE9yZGVyIGluIHdoaWNoIHRoaXMgbW9kaWZpZXIgaSBleGNldnV0ZWQuXG5cbn1cblxuKi9cblxudmFyIFByaWNlQWdyZWdhdG9yID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA1O1xuICAgIHRoaXMuZ3JvdXBCeSA9IGxpbmUuZ3JvdXBCeTtcbn07XG5cblByaWNlQWdyZWdhdG9yLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZSh0aGlzLmxpbmUpO1xuICAgIG5ld05vZGUuY2hpbGRzID0gW107XG4gICAgdmFyIGksbDtcbiAgICBmb3IgKGk9MDsgaTx0cmVlLmNoaWxkcy5sZW5ndGg7IGkrPTEpIHtcbiAgICAgICAgbD10cmVlLmNoaWxkc1tpXTtcbiAgICAgICAgaWYgKF8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBzZWxmLmdyb3VwQnkpKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcy5wdXNoKGwpO1xuICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgIGktPTE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdHJlZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VBZ3JlZ2F0b3I7XG5cblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgZHU9IHJlcXVpcmUoXCIuL2RhdGVfdXRpbHMuanNcIik7XG5cbi8qXG5cbkRpc2NvdW50IE1vZGlmaWVyXG49PT09PT09PT09PT09PT09PVxuXG4gICAgcGhhc2UgICAgICAgICAgICAgRmxhZyBvZiB0aGUgbGluZXMgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWRcbiAgICBleGVjT3JkZXIgICAgICAgICAgIE9yZGVyIGluIHdoaWNoIHRoaXMgbW9kaWZpZXIgaSBleGNldnV0ZWQuXG4gICAgcnVsZXMgICAgICAgICAgICAgIEFycmF5IG9mIHJ1bGVzXG5cblxuXG59XG5cbiovXG5cbnZhciBQcmljZURpc2NvdW50ID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMuZXhlY1N1Ym9yZGVyID0gbGluZS5waGFzZTtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgNTtcblxufTtcblxuUHJpY2VEaXNjb3VudC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSwgb3B0aW9ucykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gcnVsZURvZXNBcHBseSAocnVsZSkge1xuICAgICAgICB2YXIgaVJlc2VydmF0aW9uID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5yZXNlcnZhdGlvbik7XG4gICAgICAgIGlmICgocnVsZS5yZXNlcnZhdGlvbk1pbikmJihpUmVzZXJ2YXRpb24gPCBkdS5kYXRlMmludChydWxlLnJlc2VydmF0aW9uTWluKSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLnJlc2VydmF0aW9uTWF4KSYmKGlSZXNlcnZhdGlvbiA+IGR1LmRhdGUyaW50KHJ1bGUucmVzZXJ2YXRpb25NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgaUNoZWNraW4gPSBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgaUNoZWNrb3V0ID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGlmICgocnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbikmJiggaUNoZWNraW4gLSBpUmVzZXJ2YXRpb24gPCBydWxlLmRheXNCZWZvcmVDaGVja2luTWluICkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmRheXNCZWZvcmVDaGVja2luTWluIHx8IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW49PT0wKSYmKCBpQ2hlY2tpbiAtIGlSZXNlcnZhdGlvbiA+IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NYXggKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1pbikmJiggaUNoZWNraW4gPCBkdS5kYXRlMmludChydWxlLmNoZWNraW5NaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1heCkmJiggaUNoZWNraW4gPiBkdS5kYXRlMmludChydWxlLmNoZWNraW5NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNaW4pJiYoIGlDaGVja291dCA8IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNYXgpJiYoIGlDaGVja291dCA+IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUubWluU3RheSkmJiggaUNoZWNrb3V0IC0gaUNoZWNraW4gPCBydWxlLm1pblN0YXkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5tYXhTdGF5IHx8IHJ1bGUubWF4U3RheT09PTApJiYoIGlDaGVja291dCAtIGlDaGVja2luIDwgcnVsZS5tYXhTdGF5KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHByb3BvcnRpb25BcHBseShpSW4sIGlPdXQsIGlBcHBseUZyb20sIGlBcHBseVRvKSB7XG4gICAgICAgIHZhciBhID0gaUluID4gaUFwcGx5RnJvbSA/IGlJbiA6IGlBcHBseUZyb207XG4gICAgICAgIHZhciBiID0gaU91dCA8IGlBcHBseVRvID8gaU91dCA6IGlBcHBseVRvO1xuICAgICAgICBpZiAoYj5hKSByZXR1cm4gMDtcbiAgICAgICAgcmV0dXJuIChiLWEpLyhpT3V0LWlJbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGluZUZyb21SdWxlKHJ1bGUpIHtcbiAgICAgICAgdmFyIG5ld0xpbmUgPSBfLmNsb25lKHNlbGYubGluZSk7XG4gICAgICAgIHZhciBwcm9wb3J0aW9uO1xuICAgICAgICB2YXIgdmF0ID0wO1xuICAgICAgICB2YXIgYmFzZSA9MDtcbiAgICAgICAgdmFyIHRvdGFsSW1wb3J0ID0wO1xuXG4gICAgICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgaWYgKCEgXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIHJ1bGUuYXBwbHlJZENvbmNlcHRBdHJpYnV0ZSkpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChsLmJhc2VJbXBvcnQpIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHJ1bGUuYXBwbGljYXRpb25UeXBlID09PSBcIldIT0xFXCIpIHtcbiAgICAgICAgICAgICAgICBwcm9wb3J0aW9uID0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvcG9ydGlvbiA9IHByb3BvcnRpb25BcHBseShcbiAgICAgICAgICAgICAgICAgICAgbC5mcm9tID8gZHUuZGF0ZTJpbnQobC5mcm9tKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbiksXG4gICAgICAgICAgICAgICAgICAgIGwudG8gPyBkdS5kYXRlMmludChsLnRvKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tvdXQpLFxuICAgICAgICAgICAgICAgICAgICBkdS5kYXRlMmludChydWxlLmFwcGx5RnJvbSksXG4gICAgICAgICAgICAgICAgICAgIGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlUbykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbFZhdCA9IDA7XG4gICAgICAgICAgICBfLmVhY2gobC50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxWYXQgPSB0YXguUEM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhdCA9ICh2YXQqYmFzZSArIGxWYXQqbC5iYXNlSW1wb3J0ICogcHJvcG9ydGlvbikgLyAoYmFzZSArIGwuYmFzZUltcG9ydCAqIHByb3BvcnRpb24pO1xuICAgICAgICAgICAgYmFzZSA9IGJhc2UgKyBsLmJhc2VJbXBvcnQgKiBwcm9wb3J0aW9uO1xuICAgICAgICAgICAgdG90YWxJbXBvcnQgKz0gbC5pbXBvcnQgKiBwcm9wb3J0aW9uO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZXdMaW5lLmJhc2VJbXBvcnQgPSBiYXNlICogKCAxLSBydWxlLmFwcGx5RGlzY291bnRQQy8xMDApO1xuICAgICAgICBuZXdMaW5lLmltcG9ydCA9IGJhc2UgKiAoIDEtIHJ1bGUuYXBwbHlEaXNjb3VudFBDLzEwMCk7XG5cbiAgICAgICAgbmV3TGluZS50YXhlcyA9IG5ld0xpbmUudGF4ZXMgfHwgW107XG5cbiAgICAgICAgdmFyIHRheCA9IF8uZmluZFdoZXJlKG5ld0xpbmUudGF4ZXMse3R5cGU6IFwiVkFUXCJ9KTtcbiAgICAgICAgaWYgKCF0YXgpIHtcbiAgICAgICAgICAgIHRheCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlZBVFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbmV3TGluZS50YXhlcy5wdXNoID0gdGF4O1xuICAgICAgICB9XG4gICAgICAgIHRheC5QQyA9IHZhdDtcblxuICAgICAgICByZXR1cm4gbmV3TGluZTtcbiAgICB9XG5cblxuICAgIHZhciBzYW1lUGhhc2VEaXNjb3VudHMgPSBbXTtcbiAgICB2YXIgcG9zdHBvbmVkRGlzY291bnRzID0gW107XG5cbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAobC5jbGFzcyA9PT0gXCJESVNDT1VOVFwiKSB7XG4gICAgICAgICAgICBpZiAobC5waGFzZSA9PT0gc2VsZi5saW5lLnBoYXNlKSB7IC8vIFJlbW92ZSBhbmQgZ2V0IHRoZSBiZXN0XG4gICAgICAgICAgICAgICAgc2FtZVBoYXNlRGlzY291bnRzLnB1c2gobCk7XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHMucG9wKCk7XG4gICAgICAgICAgICAgICAgaS09MTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobC5waGFzZSA+IHNlbGYubGluZS5waGFzZSkgeyAvLyBSZW1vdmUgYW5kIHJlcHJjZXNzICBsYXRlclxuICAgICAgICAgICAgICAgIHBvc3Rwb25lZERpc2NvdW50cy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzW2ldID0gdHJlZS5jaGlsZHNbdHJlZS5jaGlsZHMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGktPTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYXBwbGllZFJ1bGVzID0gXy5maWx0ZXIodGhpcy5ydWxlcywgcnVsZURvZXNBcHBseSk7XG5cbiAgICB2YXIgYmVzdExpbmUgPSBfLnJlZHVjZShhcHBsaWVkUnVsZXMsIGZ1bmN0aW9uKGJlc3RMaW5lLCBydWxlKSB7XG4gICAgICAgIHZhciBsID0gbGluZUZyb21SdWxlKHJ1bGUpO1xuICAgICAgICBpZiAoIWJlc3RMaW5lKSByZXR1cm4gbDtcbiAgICAgICAgcmV0dXJuIChsLmltcG9ydCA8IGJlc3RMaW5lLmltcG9ydCkgPyBsIDogYmVzdExpbmU7XG4gICAgfSk7XG5cbiAgICBpZiAoYmVzdExpbmUpIHtcbiAgICAgICAgc2FtZVBoYXNlRGlzY291bnRzLnB1c2goYmVzdExpbmUpO1xuXG4gICAgICAgIHZhciBiZXN0TGluZUluUGhhc2UgPSBfLnJlZHVjZShzYW1lUGhhc2VEaXNjb3VudHMsIGZ1bmN0aW9uKGJlc3RMaW5lLCBsaW5lKSB7XG4gICAgICAgICAgICBpZiAoIWxpbmUpIHJldHVybiBiZXN0TGluZTtcbiAgICAgICAgICAgIHJldHVybiAobGluZS5pbXBvcnQgPCBiZXN0TGluZS5pbXBvcnQpID8gbGluZSA6IGJlc3RMaW5lO1xuICAgICAgICB9KTtcblxuICAgICAgICB0cmVlLmNoaWxkcy5wdXNoKGJlc3RMaW5lSW5QaGFzZSk7XG5cbiAgICAgICAgcG9zdHBvbmVkRGlzY291bnRzID0gXy5zb3J0QnkocG9zdHBvbmVkRGlzY291bnRzLCAncGhhc2UnKTtcbiAgICB9XG5cbiAgICBfLmVhY2gocG9zdHBvbmVkRGlzY291bnRzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIHZhciBtb2RpZmllciA9IG5ldyBQcmljZURpc2NvdW50KGwpO1xuICAgICAgICBtb2RpZmllci5hcHBseSh0cmVlLCBvcHRpb25zKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VEaXNjb3VudDtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgUHJpY2VMaW5lID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCAwO1xufTtcblxuUHJpY2VMaW5lLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIGwgPSBfLmNsb25lKHRoaXMubGluZSk7XG5cbiAgICB2YXIgcHJpY2UgPSBsLnByaWNlO1xuXG4gICAgbC5pbXBvcnQgPSBsLnByaWNlICogbC5xdWFudGl0eTtcbiAgICBpZiAoIWlzTmFOKGwucGVyaW9kcykpIHtcbiAgICAgICAgbC5pbXBvcnQgPSBsLmltcG9ydCAqIGwucGVyaW9kcztcbiAgICB9XG5cbiAgICBpZiAobC5kaXNjb3VudCkge1xuICAgICAgICBsLmltcG9ydCA9IGwuaW1wb3J0ICogKDEgLSBsLmRpc2NvdW50LzEwMCk7XG4gICAgfVxuXG4gICAgbC5iYXNlSW1wb3J0ID0gbC5pbXBvcnQ7XG5cbiAgICB0cmVlLmNoaWxkcy5wdXNoKGwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUxpbmU7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxudmFyIFByaWNlVmF0SW5jbHVkZWQgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDk7XG59O1xuXG5QcmljZVZhdEluY2x1ZGVkLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG5cbiAgICBmdW5jdGlvbiBhcHBseVZhdE5vZGUobm9kZSkge1xuICAgICAgICBfLmVhY2gobm9kZS50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICBpZiAodGF4LnR5cGUgPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlLmltcG9ydCA9IG5vZGUuaW1wb3J0ICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgICAgICBub2RlLnByaWNlID0gbm9kZS5wcmljZSAqICgxICsgdGF4LlBDLzEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGFwcGx5VmF0Tm9kZSk7XG4gICAgfVxuXG4gICAgYXBwbHlWYXROb2RlKHRyZWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZVZhdEluY2x1ZGVkO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJvdW5kKHZhbCwgcm91bmRpbmdUeXBlLCByb3VuZGluZykge1xuICAgIHZhciB2O1xuICAgIGlmICgoIXJvdW5kaW5nVHlwZSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJOT05FXCIpKSB7XG4gICAgICAgIHYgPSBNYXRoLnJvdW5kKHZhbCAvIDAuMDEpICogMC4wMTtcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDEpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiRkxPT1JcIikpIHtcbiAgICAgICAgdj0gTWF0aC5mbG9vcih2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDIpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiUk9VTkRcIikpIHtcbiAgICAgICAgdj0gTWF0aC5yb3VuZCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDMpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiQ0VJTFwiKSkge1xuICAgICAgICB2PSBNYXRoLmNlaWwodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCByb3VuZGluZ1R5cGU6IHJvdW5kaW5nVHlwZVwiKTtcbiAgICB9XG4gICAgcmV0dXJuICsoTWF0aC5yb3VuZCh2ICsgXCJlKzJcIikgICsgXCJlLTJcIik7XG59O1xuIl19
