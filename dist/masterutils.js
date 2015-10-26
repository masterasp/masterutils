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

    self.renderTreeResult = null;

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvY3JlZGl0Y2FyZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2RhdGVfdXRpbHMuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9mYWtlXzUyOTA1NDk1LmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2UuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZTIuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV9hZ3JlZ2F0b3IuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV9kaXNjb3VudC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2xpbmUuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV92YXRpbmNsdWRlZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3JvdW5kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cclxuXHJcbi8qXHJcblxyXG5UaGlzIHJvdXRpbmUgY2hlY2tzIHRoZSBjcmVkaXQgY2FyZCBudW1iZXIuIFRoZSBmb2xsb3dpbmcgY2hlY2tzIGFyZSBtYWRlOlxyXG5cclxuMS4gQSBudW1iZXIgaGFzIGJlZW4gcHJvdmlkZWRcclxuMi4gVGhlIG51bWJlciBpcyBhIHJpZ2h0IGxlbmd0aCBmb3IgdGhlIGNhcmRcclxuMy4gVGhlIG51bWJlciBoYXMgYW4gYXBwcm9wcmlhdGUgcHJlZml4IGZvciB0aGUgY2FyZFxyXG40LiBUaGUgbnVtYmVyIGhhcyBhIHZhbGlkIG1vZHVsdXMgMTAgbnVtYmVyIGNoZWNrIGRpZ2l0IGlmIHJlcXVpcmVkXHJcblxyXG5JZiB0aGUgdmFsaWRhdGlvbiBmYWlscyBhbiBlcnJvciBpcyByZXBvcnRlZC5cclxuXHJcblRoZSBzdHJ1Y3R1cmUgb2YgY3JlZGl0IGNhcmQgZm9ybWF0cyB3YXMgZ2xlYW5lZCBmcm9tIGEgdmFyaWV0eSBvZiBzb3VyY2VzIG9uIHRoZSB3ZWIsIGFsdGhvdWdoIHRoZSBcclxuYmVzdCBpcyBwcm9iYWJseSBvbiBXaWtlcGVkaWEgKFwiQ3JlZGl0IGNhcmQgbnVtYmVyXCIpOlxyXG5cclxuICBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NyZWRpdF9jYXJkX251bWJlclxyXG5cclxuUGFyYW1ldGVyczpcclxuICAgICAgICAgICAgY2FyZG51bWJlciAgICAgICAgICAgbnVtYmVyIG9uIHRoZSBjYXJkXHJcbiAgICAgICAgICAgIGNhcmRuYW1lICAgICAgICAgICAgIG5hbWUgb2YgY2FyZCBhcyBkZWZpbmVkIGluIHRoZSBjYXJkIGxpc3QgYmVsb3dcclxuXHJcbkF1dGhvcjogICAgIEpvaG4gR2FyZG5lclxyXG5EYXRlOiAgICAgICAxc3QgTm92ZW1iZXIgMjAwM1xyXG5VcGRhdGVkOiAgICAyNnRoIEZlYi4gMjAwNSAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgYnkgcmVxdWVzdFxyXG5VcGRhdGVkOiAgICAyN3RoIE5vdi4gMjAwNiAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgZnJvbSBXaWtpcGVkaWFcclxuVXBkYXRlZDogICAgMTh0aCBKYW4uIDIwMDggICAgICBBZGRpdGlvbmFsIGNhcmRzIGFkZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDI2dGggTm92LiAyMDA4ICAgICAgTWFlc3RybyBjYXJkcyBleHRlbmRlZFxyXG5VcGRhdGVkOiAgICAxOXRoIEp1bi4gMjAwOSAgICAgIExhc2VyIGNhcmRzIGV4dGVuZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDExdGggU2VwLiAyMDEwICAgICAgVHlwb3MgcmVtb3ZlZCBmcm9tIERpbmVycyBhbmQgU29sbyBkZWZpbml0aW9ucyAodGhhbmtzIHRvIE5vZSBMZW9uKVxyXG5VcGRhdGVkOiAgICAxMHRoIEFwcmlsIDIwMTIgICAgIE5ldyBtYXRjaGVzIGZvciBNYWVzdHJvLCBEaW5lcnMgRW5yb3V0ZSBhbmQgU3dpdGNoXHJcblVwZGF0ZWQ6ICAgIDE3dGggT2N0b2JlciAyMDEyICAgRGluZXJzIENsdWIgcHJlZml4IDM4IG5vdCBlbmNvZGVkXHJcblxyXG4qL1xyXG5cclxuLypcclxuICAgSWYgYSBjcmVkaXQgY2FyZCBudW1iZXIgaXMgaW52YWxpZCwgYW4gZXJyb3IgcmVhc29uIGlzIGxvYWRlZCBpbnRvIHRoZSBnbG9iYWwgY2NFcnJvck5vIHZhcmlhYmxlLlxyXG4gICBUaGlzIGNhbiBiZSBiZSB1c2VkIHRvIGluZGV4IGludG8gdGhlIGdsb2JhbCBlcnJvciAgc3RyaW5nIGFycmF5IHRvIHJlcG9ydCB0aGUgcmVhc29uIHRvIHRoZSB1c2VyXHJcbiAgIGlmIHJlcXVpcmVkOlxyXG5cclxuICAgZS5nLiBpZiAoIWNoZWNrQ3JlZGl0Q2FyZCAobnVtYmVyLCBuYW1lKSBhbGVydCAoY2NFcnJvcnMoY2NFcnJvck5vKTtcclxuKi9cclxuXHJcbnZhciBjY0Vycm9yTm8gPSAwO1xyXG52YXIgY2NFcnJvcnMgPSBbXTtcclxuXHJcbmNjRXJyb3JzIFswXSA9IFwiVW5rbm93biBjYXJkIHR5cGVcIjtcclxuY2NFcnJvcnMgWzFdID0gXCJObyBjYXJkIG51bWJlciBwcm92aWRlZFwiO1xyXG5jY0Vycm9ycyBbMl0gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBpcyBpbiBpbnZhbGlkIGZvcm1hdFwiO1xyXG5jY0Vycm9ycyBbM10gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBpcyBpbnZhbGlkXCI7XHJcbmNjRXJyb3JzIFs0XSA9IFwiQ3JlZGl0IGNhcmQgbnVtYmVyIGhhcyBhbiBpbmFwcHJvcHJpYXRlIG51bWJlciBvZiBkaWdpdHNcIjtcclxuY2NFcnJvcnMgWzVdID0gXCJXYXJuaW5nISBUaGlzIGNyZWRpdCBjYXJkIG51bWJlciBpcyBhc3NvY2lhdGVkIHdpdGggYSBzY2FtIGF0dGVtcHRcIjtcclxuXHJcbmZ1bmN0aW9uIGNoZWNrQ3JlZGl0Q2FyZCAoY2FyZG51bWJlcikge1xyXG5cclxuICAvLyBBcnJheSB0byBob2xkIHRoZSBwZXJtaXR0ZWQgY2FyZCBjaGFyYWN0ZXJpc3RpY3NcclxuICB2YXIgY2FyZHMgPSBbXTtcclxuXHJcbiAgLy8gRGVmaW5lIHRoZSBjYXJkcyB3ZSBzdXBwb3J0LiBZb3UgbWF5IGFkZCBhZGR0aW9uYWwgY2FyZCB0eXBlcyBhcyBmb2xsb3dzLlxyXG4gIC8vICBOYW1lOiAgICAgICAgIEFzIGluIHRoZSBzZWxlY3Rpb24gYm94IG9mIHRoZSBmb3JtIC0gbXVzdCBiZSBzYW1lIGFzIHVzZXInc1xyXG4gIC8vICBMZW5ndGg6ICAgICAgIExpc3Qgb2YgcG9zc2libGUgdmFsaWQgbGVuZ3RocyBvZiB0aGUgY2FyZCBudW1iZXIgZm9yIHRoZSBjYXJkXHJcbiAgLy8gIHByZWZpeGVzOiAgICAgTGlzdCBvZiBwb3NzaWJsZSBwcmVmaXhlcyBmb3IgdGhlIGNhcmRcclxuICAvLyAgY2hlY2tkaWdpdDogICBCb29sZWFuIHRvIHNheSB3aGV0aGVyIHRoZXJlIGlzIGEgY2hlY2sgZGlnaXRcclxuXHJcbiAgY2FyZHMgWzBdID0ge25hbWU6IFwiVmlzYVwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTMsMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNFwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMV0gPSB7bmFtZTogXCJNYXN0ZXJDYXJkXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI1MSw1Miw1Myw1NCw1NVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMl0gPSB7bmFtZTogXCJEaW5lcnNDbHViXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNCwxNlwiLCBcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzYsMzgsNTQsNTVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzNdID0ge25hbWU6IFwiQ2FydGVCbGFuY2hlXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNFwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzMDAsMzAxLDMwMiwzMDMsMzA0LDMwNVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNF0gPSB7bmFtZTogXCJBbUV4XCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNCwzN1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNV0gPSB7bmFtZTogXCJEaXNjb3ZlclwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjAxMSw2MjIsNjQsNjVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzZdID0ge25hbWU6IFwiSkNCXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbN10gPSB7bmFtZTogXCJlblJvdXRlXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIyMDE0LDIxNDlcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzhdID0ge25hbWU6IFwiU29sb1wiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjMzNCw2NzY3XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs5XSA9IHtuYW1lOiBcIlN3aXRjaFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNDkwMyw0OTA1LDQ5MTEsNDkzNiw1NjQxODIsNjMzMTEwLDYzMzMsNjc1OVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTBdID0ge25hbWU6IFwiTWFlc3Ryb1wiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTIsMTMsMTQsMTUsMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNTAxOCw1MDIwLDUwMzgsNjMwNCw2NzU5LDY3NjEsNjc2Miw2NzYzXCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxMV0gPSB7bmFtZTogXCJWaXNhRWxlY3Ryb25cIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjQwMjYsNDE3NTAwLDQ1MDgsNDg0NCw0OTEzLDQ5MTdcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzEyXSA9IHtuYW1lOiBcIkxhc2VyQ2FyZFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTcsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjMwNCw2NzA2LDY3NzEsNjcwOVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTNdID0ge25hbWU6IFwiVGVzdFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMTkxMlwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiBmYWxzZX07XHJcbiAgdmFyIHJlcyA9IHtcclxuICAgIHZhbGlkOiBmYWxzZVxyXG4gIH07XHJcblxyXG5cclxuICAvLyBFbnN1cmUgdGhhdCB0aGUgdXNlciBoYXMgcHJvdmlkZWQgYSBjcmVkaXQgY2FyZCBudW1iZXJcclxuICBpZiAoY2FyZG51bWJlci5sZW5ndGggPT09IDApICB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDE7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIE5vdyByZW1vdmUgYW55IHNwYWNlcyBmcm9tIHRoZSBjcmVkaXQgY2FyZCBudW1iZXJcclxuICBjYXJkbnVtYmVyID0gY2FyZG51bWJlci5yZXBsYWNlICgvXFxzL2csIFwiXCIpO1xyXG5cclxuICAvLyBDaGVjayB0aGF0IHRoZSBudW1iZXIgaXMgbnVtZXJpY1xyXG4gIHZhciBjYXJkTm8gPSBjYXJkbnVtYmVyO1xyXG4gIHZhciBjYXJkZXhwID0gL15bMC05XXsxMywxOX0kLztcclxuICBpZiAoIWNhcmRleHAuZXhlYyhjYXJkTm8pKSAge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSAyO1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICAvLyBFc3RhYmxpc2ggY2FyZCB0eXBlXHJcbiAgdmFyIGNhcmRUeXBlID0gLTE7XHJcbiAgZm9yICh2YXIgaT0wOyBpPGNhcmRzLmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgLy8gTG9hZCBhbiBhcnJheSB3aXRoIHRoZSB2YWxpZCBwcmVmaXhlcyBmb3IgdGhpcyBjYXJkXHJcbiAgICBwcmVmaXggPSBjYXJkc1tpXS5wcmVmaXhlcy5zcGxpdChcIixcIik7XHJcblxyXG4gICAgLy8gTm93IHNlZSBpZiBhbnkgb2YgdGhlbSBtYXRjaCB3aGF0IHdlIGhhdmUgaW4gdGhlIGNhcmQgbnVtYmVyXHJcbiAgICBmb3IgKGo9MDsgajxwcmVmaXgubGVuZ3RoOyBqKyspIHtcclxuICAgICAgdmFyIGV4cCA9IG5ldyBSZWdFeHAgKFwiXlwiICsgcHJlZml4W2pdKTtcclxuICAgICAgaWYgKGV4cC50ZXN0IChjYXJkTm8pKSBjYXJkVHlwZSA9IGk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBJZiBjYXJkIHR5cGUgbm90IGZvdW5kLCByZXBvcnQgYW4gZXJyb3JcclxuICBpZiAoY2FyZFR5cGUgPT0gLTEpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gMjtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXMuY2NOYW1lID0gY2FyZHNbY2FyZFR5cGVdLm5hbWU7XHJcblxyXG5cclxuXHJcbiAgdmFyIGo7XHJcbiAgLy8gTm93IGNoZWNrIHRoZSBtb2R1bHVzIDEwIGNoZWNrIGRpZ2l0IC0gaWYgcmVxdWlyZWRcclxuICBpZiAoY2FyZHNbY2FyZFR5cGVdLmNoZWNrZGlnaXQpIHtcclxuICAgIHZhciBjaGVja3N1bSA9IDA7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJ1bm5pbmcgY2hlY2tzdW0gdG90YWxcclxuICAgIHZhciBteWNoYXIgPSBcIlwiOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dCBjaGFyIHRvIHByb2Nlc3NcclxuICAgIGogPSAxOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFrZXMgdmFsdWUgb2YgMSBvciAyXHJcblxyXG4gICAgLy8gUHJvY2VzcyBlYWNoIGRpZ2l0IG9uZSBieSBvbmUgc3RhcnRpbmcgYXQgdGhlIHJpZ2h0XHJcbiAgICB2YXIgY2FsYztcclxuICAgIGZvciAoaSA9IGNhcmROby5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCB0aGUgbmV4dCBkaWdpdCBhbmQgbXVsdGlwbHkgYnkgMSBvciAyIG9uIGFsdGVybmF0aXZlIGRpZ2l0cy5cclxuICAgICAgY2FsYyA9IE51bWJlcihjYXJkTm8uY2hhckF0KGkpKSAqIGo7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzdWx0IGlzIGluIHR3byBkaWdpdHMgYWRkIDEgdG8gdGhlIGNoZWNrc3VtIHRvdGFsXHJcbiAgICAgIGlmIChjYWxjID4gOSkge1xyXG4gICAgICAgIGNoZWNrc3VtID0gY2hlY2tzdW0gKyAxO1xyXG4gICAgICAgIGNhbGMgPSBjYWxjIC0gMTA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEFkZCB0aGUgdW5pdHMgZWxlbWVudCB0byB0aGUgY2hlY2tzdW0gdG90YWxcclxuICAgICAgY2hlY2tzdW0gPSBjaGVja3N1bSArIGNhbGM7XHJcblxyXG4gICAgICAvLyBTd2l0Y2ggdGhlIHZhbHVlIG9mIGpcclxuICAgICAgaWYgKGogPT0xKSB7XHJcbiAgICAgICAgaiA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaiA9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBbGwgZG9uZSAtIGlmIGNoZWNrc3VtIGlzIGRpdmlzaWJsZSBieSAxMCwgaXQgaXMgYSB2YWxpZCBtb2R1bHVzIDEwLlxyXG4gICAgLy8gSWYgbm90LCByZXBvcnQgYW4gZXJyb3IuXHJcbiAgICBpZiAoY2hlY2tzdW0gJSAxMCAhPT0gMCkgIHtcclxuICAgICAgcmVzLmNjRXJyb3JObyA9IDM7XHJcbiAgICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgICByZXR1cm4gcmVzO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgaXQncyBub3QgYSBzcGFtIG51bWJlclxyXG4gIGlmIChjYXJkTm8gPT0gJzU0OTA5OTc3NzEwOTIwNjQnKSB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDU7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIFRoZSBmb2xsb3dpbmcgYXJlIHRoZSBjYXJkLXNwZWNpZmljIGNoZWNrcyB3ZSB1bmRlcnRha2UuXHJcbiAgdmFyIExlbmd0aFZhbGlkID0gZmFsc2U7XHJcbiAgdmFyIFByZWZpeFZhbGlkID0gZmFsc2U7XHJcblxyXG4gIC8vIFdlIHVzZSB0aGVzZSBmb3IgaG9sZGluZyB0aGUgdmFsaWQgbGVuZ3RocyBhbmQgcHJlZml4ZXMgb2YgYSBjYXJkIHR5cGVcclxuICB2YXIgcHJlZml4ID0gW107XHJcbiAgdmFyIGxlbmd0aHMgPSBbXTtcclxuXHJcbiAgLy8gU2VlIGlmIHRoZSBsZW5ndGggaXMgdmFsaWQgZm9yIHRoaXMgY2FyZFxyXG4gIGxlbmd0aHMgPSBjYXJkc1tjYXJkVHlwZV0ubGVuZ3RoLnNwbGl0KFwiLFwiKTtcclxuICBmb3IgKGo9MDsgajxsZW5ndGhzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBpZiAoY2FyZE5vLmxlbmd0aCA9PSBsZW5ndGhzW2pdKSBMZW5ndGhWYWxpZCA9IHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyBTZWUgaWYgYWxsIGlzIE9LIGJ5IHNlZWluZyBpZiB0aGUgbGVuZ3RoIHdhcyB2YWxpZC4gV2Ugb25seSBjaGVjayB0aGUgbGVuZ3RoIGlmIGFsbCBlbHNlIHdhcyBcclxuICAvLyBodW5reSBkb3J5LlxyXG4gIGlmICghTGVuZ3RoVmFsaWQpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gNDtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgcmVzLnZhbGlkID0gdHJ1ZTtcclxuXHJcbiAgLy8gVGhlIGNyZWRpdCBjYXJkIGlzIGluIHRoZSByZXF1aXJlZCBmb3JtYXQuXHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuLyo9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xyXG5cclxubW9kdWxlLmV4cG9ydHMuY2hlY2tDcmVkaXRDYXJkID0gY2hlY2tDcmVkaXRDYXJkO1xyXG5cclxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cblxudmFyIG1vbWVudCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wydtb21lbnQnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ21vbWVudCddIDogbnVsbCk7XG5cbnZhciB2aXJ0dWFsVGltZSA9IG51bGw7XG5leHBvcnRzLm5vdyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh2aXJ0dWFsVGltZSkge1xuICAgICAgICByZXR1cm4gdmlydHVhbFRpbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5zZXRWaXJ0dWFsVGltZSA9IGZ1bmN0aW9uKHQpIHtcbiAgICB2aXJ0dWFsVGltZSA9IHQ7XG59O1xuXG5leHBvcnRzLmRhdGUyc3RyID0gZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmRhdGUyaW50ID0gZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAodHlwZW9mIGQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKGQuZ2V0VGltZSgpIC8gODY0MDAwMDApO1xufTtcblxuXG5leHBvcnRzLmludERhdGUyc3RyID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBkdDtcbiAgICBpZiAoZCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgZHQgPSBkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgfVxuICAgIHJldHVybiBkdC50b0lTT1N0cmluZygpLnN1YnN0cmluZygwLDEwKTtcbn07XG5cbmV4cG9ydHMuaW50MmRhdGUgPSBmdW5jdGlvbihkKSB7XG4gICAgaWYgKGQgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gZDtcbiAgICB2YXIgZHQgPSBuZXcgRGF0ZShkKjg2NDAwMDAwKTtcbiAgICByZXR1cm4gZHQ7XG59O1xuXG5leHBvcnRzLnRvZGF5ID0gZnVuY3Rpb24odHopIHtcbiAgICB0eiA9IHR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KHR6KTtcbiAgICB2YXIgZGF0ZVN0ciA9IGR0LmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgIHZhciBkdDIgPSBuZXcgRGF0ZShkYXRlU3RyKydUMDA6MDA6MDAuMDAwWicpO1xuXG4gICAgcmV0dXJuIGR0Mi5nZXRUaW1lKCkgLyA4NjQwMDAwMDtcbn07XG5cblxuXG5cblxuLy8vIENST04gSU1QTEVNRU5UQVRJT05cblxuZnVuY3Rpb24gbWF0Y2hOdW1iZXIobiwgZmlsdGVyKSB7XG4gICAgbiA9IHBhcnNlSW50KG4pO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSAnKicpIHJldHVybiB0cnVlO1xuICAgIGlmIChmaWx0ZXIgPT09IG4pIHJldHVybiB0cnVlO1xuICAgIHZhciBmID0gZmlsdGVyLnRvU3RyaW5nKCk7XG4gICAgdmFyIG9wdGlvbnMgPSBmLnNwbGl0KCcsJyk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG9wdGlvbnM7IGkrPTEpIHtcbiAgICAgICAgdmFyIGFyciA9IG9wdGlvbnNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgaWYgKGFyci5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGlmIChwYXJzZUludChhcnJbMF0sMTApID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChhcnIubGVuZ3RoID09PTIpIHtcbiAgICAgICAgICAgIHZhciBmcm9tID0gcGFyc2VJbnQoYXJyWzBdLDEwKTtcbiAgICAgICAgICAgIHZhciB0byA9IHBhcnNlSW50KGFyclsxXSwxMCk7XG4gICAgICAgICAgICBpZiAoKG4+PWZyb20gKSAmJiAobjw9IHRvKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpIHtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigwLDIpLCBqb2IubWludXRlKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDIsMiksIGpvYi5ob3VyKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDQsMiksIGpvYi5kYXlPZk1vbnRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDYsMiksIGpvYi5tb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig4LDEpLCBqb2IuZGF5T2ZXZWVrKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG52YXIgY3JvbkpvYnMgPSBbXTtcbmV4cG9ydHMuYWRkQ3JvbkpvYiA9IGZ1bmN0aW9uKGpvYikge1xuXG5cbiAgICBqb2IudHogPSBqb2IudHogfHwgJ1VUQyc7XG5cbiAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuICAgIGpvYi5sYXN0ID0gY3JvbkRhdGU7XG4gICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgIGNyb25Kb2JzLnB1c2goam9iKTtcbiAgICByZXR1cm4gY3JvbkpvYnMubGVuZ3RoIC0xO1xufTtcblxuZXhwb3J0cy5kZWxldGVDcm9uSm9iID0gZnVuY3Rpb24oaWRKb2IpIHtcbiAgICBkZWxldGUgY3JvbkpvYnNbaWRKb2JdO1xufTtcblxuLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25lIGEgbWludXRlIGluIHRoZSBiZWdpbmluZyBvZiBlYWNoIG1pbnV0ZS5cbi8vIGl0IGlzIHVzZWQgdG8gY3JvbiBhbnkgZnVuY3Rpb25cbnZhciBvbk1pbnV0ZSA9IGZ1bmN0aW9uKCkge1xuXG5cbiAgICBjcm9uSm9icy5mb3JFYWNoKGZ1bmN0aW9uKGpvYikge1xuICAgICAgICBpZiAoIWpvYikgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eihqb2IudHopO1xuICAgICAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuXG4gICAgICAgIGlmICgoY3JvbkRhdGUgIT09IGpvYi5sYXN0KSAmJiAobWF0Y2hKb2Ioam9iLCBjcm9uRGF0ZSkpKSB7XG4gICAgICAgICAgICBpZiAoam9iLmV4ZWN1dGluZykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSm9iIHRha2VzIHRvbyBsb25nIHRvIGV4ZWN1dGU6IFwiICsgam9iLm5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGpvYi5jYihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbm93ID0gZXhwb3J0cy5ub3coKS5nZXRUaW1lKCk7XG4gICAgdmFyIG1pbGxzVG9OZXh0TWludXRlID0gNjAwMDAgLSBub3cgJSA2MDAwMDtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBvbk1pbnV0ZSgpO1xuICAgIH0sIG1pbGxzVG9OZXh0TWludXRlKTtcbn07XG5cbm9uTWludXRlKCk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbWFzdGVyVXRpbHMgPSB7XG4gICAgICAgIGRhdGVVdGlsczogcmVxdWlyZSgnLi9kYXRlX3V0aWxzLmpzJyksXG4gICAgICAgIHJvdW5kOiByZXF1aXJlKCcuL3JvdW5kLmpzJyksXG4gICAgICAgIFByaWNlOiAgcmVxdWlyZSgnLi9wcmljZS5qcycpLFxuICAgICAgICBQcmljZTI6IHJlcXVpcmUoJy4vcHJpY2UyLmpzJyksXG4gICAgICAgIGNoZWNrczoge1xuICAgICAgICAgICAgY2hlY2tDcmVkaXRDYXJkOiByZXF1aXJlKCcuL2NyZWRpdGNhcmQuanMnKS5jaGVja0NyZWRpdENhcmRcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgcm9vdCA9IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyAmJiBzZWxmLnNlbGYgPT09IHNlbGYgJiYgc2VsZiB8fFxuICAgICAgICAgICAgdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsLmdsb2JhbCA9PT0gZ2xvYmFsICYmIGdsb2JhbCB8fFxuICAgICAgICAgICAgdGhpcztcblxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gbWFzdGVyVXRpbHM7XG4gICAgICAgIH1cbiAgICAgICAgZXhwb3J0cy5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB3aW5kb3cubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbn0oKSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcbnZhciByb3VuZCA9IHJlcXVpcmUoJy4vcm91bmQnKTtcbnZhciBkdSA9IHJlcXVpcmUoJy4vZGF0ZV91dGlscycpO1xuXG52YXIgUHJpY2UgPSBmdW5jdGlvbihsaW5lcykge1xuICAgIGlmICghbGluZXMpIGxpbmVzID1bXTtcblxuICAgIC8vIElmIGFub3RoZXIgcHJpY2UgKGhhcyBsaW5lcylcbiAgICBpZiAobGluZXMubGluZXMpIHtcbiAgICAgICAgbGluZXMgPSBsaW5lcy5saW5lcztcbiAgICB9XG5cbi8vIENsb25lIHRoZSBhcnJheTtcbiAgICB0aGlzLmxpbmVzID0gXy5tYXAobGluZXMsIF8uY2xvbmUpO1xufTtcblxuUHJpY2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmoubGluZXMgPSBfLm1hcCh0aGlzLmxpbmVzLCBfLmNsb25lKTtcbiAgICBfLmVhY2gob2JqLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbC5mcm9tID09PSBcIm51bWJlclwiKSBsLmZyb20gPSBkdS5pbnQyZGF0ZShsLmZyb20pO1xuICAgICAgICBpZiAodHlwZW9mIGwudG8gPT09IFwibnVtYmVyXCIpIGwudG8gPSBkdS5pbnQyZGF0ZShsLnRvKTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xufTtcblxuUHJpY2UucHJvdG90eXBlLmxpbmVQcmljZSA9IGZ1bmN0aW9uKGxpbmUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWUsXG4gICAgICAgIGJhc2U6IDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBwcmljZTtcbiAgICBpZiAodHlwZW9mIGxpbmUucHJpY2UgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgcHJpY2UgPSBsaW5lLnByaWNlO1xuICAgIH0gZWxzZSBpZiAoICh0eXBlb2YgbGluZS5wcmljZT09PVwib2JqZWN0XCIpICYmIChsaW5lLnByaWNlLnR5cGUgPT09ICdQRVInKSApIHtcbiAgICAgICAgcHJpY2UgPSBvcHRpb25zLmJhc2UgKiBsaW5lLnByaWNlLnByaWNlUEMvMTAwO1xuICAgICAgICBpZiAocHJpY2U8bGluZS5wcmljZS5wcmljZU1pbikgcHJpY2UgPSBsaW5lLnByaWNlLnByaWNlTWluO1xuICAgIH0gZWxzZSBpZiAoICh0eXBlb2YgbGluZS5wcmljZT09PVwib2JqZWN0XCIpICYmIChsaW5lLnByaWNlLnR5cGUgPT09ICdFU0MnKSApIHtcbiAgICAgICAgcHJpY2U9TnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgXy5lYWNoKGxpbmUucHJpY2Uuc2NhbGVQcmljZXMsIGZ1bmN0aW9uKHNwKSB7XG4gICAgICAgICAgICBpZiAoKG9wdGlvbnMuYmFzZSA8PSBzcC5zdGF5UHJpY2VNYXgpICYmIChzcC5wcmljZSA8IHByaWNlKSkge1xuICAgICAgICAgICAgICAgIHByaWNlID0gc3AucHJpY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocHJpY2UgPT09IE51bWJlci5NQVhfVkFMVUUpIHtcbiAgICAgICAgICAgIHByaWNlID0gTmFOO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHByaWNlO1xufTtcblxuXG5QcmljZS5wcm90b3R5cGUubGluZUltcG9ydCA9IGZ1bmN0aW9uKGxpbmUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWUsXG4gICAgICAgIGJhc2U6IDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBwcmljZSA9IHRoaXMubGluZVByaWNlKGxpbmUsb3B0aW9ucyk7XG5cbiAgICB2YXIgbGluZUltcG9ydCA9IHByaWNlICogbGluZS5xdWFudGl0eTtcbiAgICBpZiAoIWlzTmFOKGxpbmUucGVyaW9kcykpIHtcbiAgICAgICAgbGluZUltcG9ydCA9IGxpbmVJbXBvcnQgKiBsaW5lLnBlcmlvZHM7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMud2l0aERpc2NvdW50cykge1xuICAgICAgICB2YXIgYmFzZSA9IGxpbmVJbXBvcnQ7XG4gICAgICAgIF8uZWFjaChsaW5lLmRpc2NvdW50cywgZnVuY3Rpb24oZGlzY291bnQpIHtcbiAgICAgICAgICAgIGlmIChkaXNjb3VudC50eXBlID09PSBcIlBDXCIpIHtcbiAgICAgICAgICAgICAgICBsaW5lSW1wb3J0ID0gbGluZUltcG9ydCAtIGJhc2UgKiBkaXNjb3VudC5QQy8xMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLndpdGhUYXhlcykge1xuICAgICAgICBfLmVhY2gobGluZS50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICBpZiAodGF4LnR5cGU9PT0gXCJWQVRcIikge1xuICAgICAgICAgICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0ICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMucm91bmRlZCkge1xuICAgICAgICBsaW5lSW1wb3J0ID0gcm91bmQobGluZUltcG9ydCwgXCJST1VORFwiLCAwLjAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbGluZUltcG9ydDtcbn07XG5cblByaWNlLnByb3RvdHlwZS5nZXRJbXBvcnQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgICAgIHdpdGhUYXhlczogdHJ1ZSxcbiAgICAgICAgd2l0aERpc2NvdW50czogdHJ1ZSxcbiAgICAgICAgcm91bmRlZDogdHJ1ZVxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdmFyIG9sZFJvdW5kZWQgPSBvcHRpb25zLnJvdW5kZWQ7XG5cbiAgICBvcHRpb25zLnJvdW5kZWQgPSBmYWxzZTtcbiAgICB2YXIgYWMgPSBfLnJlZHVjZShzZWxmLmxpbmVzLCBmdW5jdGlvbihtZW1vLCBsaW5lKSB7XG4gICAgICAgIHJldHVybiBtZW1vICsgc2VsZi5saW5lSW1wb3J0KGxpbmUsIG9wdGlvbnMpO1xuICAgIH0sMCk7XG5cbiAgICBpZiAob2xkUm91bmRlZCkge1xuICAgICAgICBhYyA9IHJvdW5kKGFjLCBcIlJPVU5EXCIsIDAuMDEpO1xuICAgIH1cblxuICAgIHJldHVybiBhYztcbn07XG5cblByaWNlLnByb3RvdHlwZS5hZGRQcmljZSA9IGZ1bmN0aW9uKHApIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBpZiAoIXApIHJldHVybjtcbiAgICAgICAgdmFyIGNwID0gXy5jbG9uZShwKTtcbiAgICAgICAgXy5lYWNoKGNwLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2gobCk7XG4gICAgICAgIH0pO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgcm91bmQgPSByZXF1aXJlKCcuL3JvdW5kJyk7XG52YXIgZHUgPSByZXF1aXJlKCcuL2RhdGVfdXRpbHMnKTtcblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG52YXIgcmVnaXN0ZXJlZE1vZGlmaWVycyA9IHtcbiAgICBcIkFHUkVHQVRPUlwiOiByZXF1aXJlKFwiLi9wcmljZV9hZ3JlZ2F0b3IuanNcIiksXG4gICAgXCJMSU5FXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2xpbmUuanNcIiksXG4gICAgXCJWQVRJTkNMVURFRFwiOiByZXF1aXJlKFwiLi9wcmljZV92YXRpbmNsdWRlZC5qc1wiKSxcbiAgICBcIkRJU0NPVU5UXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2Rpc2NvdW50LmpzXCIpXG59O1xuXG52YXIgUHJpY2UyID0gZnVuY3Rpb24ocDEsIHAyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYubGluZXMgPSBbXTtcbiAgICBzZWxmLm9wdGlvbnMgPSB7fTtcbiAgICBfLmVhY2goYXJndW1lbnRzLCBmdW5jdGlvbihwKSB7XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICBpZiAoKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSYmKHAubGluZXMpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5saW5lcy5jb25jYXQoXy5tYXAocC5saW5lcywgXy5jbG9uZSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmxpbmVzLmNvbmNhdChfLm1hcChwLCBfLmNsb25lKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJihwLmNsYXNzIHx8IHAubGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUocCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucyA9IHA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHNlbGYudHJlZVZhbGlkPWZhbHNlO1xuICAgIHNlbGYucmVuZGVyVmFsaWQ9ZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJUcmVlVmFsaWQ9ZmFsc2U7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLmFkZFByaWNlID0gZnVuY3Rpb24ocCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXApIHJldHVybjtcbiAgICB2YXIgY3A7XG4gICAgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJiAocC5saW5lcykpIHtcbiAgICAgICAgY3AgPSBwLmxpbmVzO1xuICAgIH0gZWxzZSBpZiAoY3AgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjcCA9IHA7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBjcCA9IFtwXTtcbiAgICB9XG4gICAgXy5lYWNoKGNwLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKGwpKTtcbiAgICB9KTtcbiAgICBzZWxmLnRyZWVWYWxpZD1mYWxzZTtcbiAgICBzZWxmLnJlbmRlclZhbGlkID0gZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJUcmVlVmFsaWQgPSBmYWxzZTtcbn07XG5cblxuUHJpY2UyLnByb3RvdHlwZS5jb25zdHJ1Y3RUcmVlID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBzb3J0VHJlZShub2RlKSB7XG4gICAgICAgIGlmIChub2RlLmNoaWxkcykge1xuICAgICAgICAgICAgbm9kZS5jaGlsZHMgPSBfLnNvcnRCeUFsbChub2RlLmNoaWxkcywgW1wib3JkZXJcIiwgXCJzdWJvcmRlclwiXSk7XG4gICAgICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIHNvcnRUcmVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGNUb3RhbChub2RlKSB7XG4gICAgICAgIG5vZGUuaW1wb3J0ID0gbm9kZS5pbXBvcnQgfHwgMDtcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRzKSB7XG4gICAgICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICAgICAgICBub2RlLmltcG9ydCArPSBjYWxjVG90YWwoYyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZS5pbXBvcnQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcm91bmRJbXBvcnRzKG5vZGUpIHtcbiAgICAgICAgbm9kZS5pbXBvcnQgPSByb3VuZChub2RlLmltcG9ydCwgXCJST1VORFwiLCAwLjAxKTtcbiAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCByb3VuZEltcG9ydHMpO1xuICAgIH1cblxuICAgIGlmIChzZWxmLnRyZWVWYWxpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi50b3RhbDtcbiAgICB9XG5cbiAgICBzZWxmLnRvdGFsID0ge1xuICAgICAgICBpZDogXCJ0b3RhbFwiLFxuICAgICAgICBsYWJlbDogXCJAVG90YWxcIixcbiAgICAgICAgY2hpbGRzOiBbXSxcblxuICAgICAgICBzaG93SWZaZXJvOiB0cnVlLFxuICAgICAgICB0b3RhbE9uQm90dG9tOiB0cnVlXG4gICAgfTtcblxuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcblxuICAgIHZhciBpID0wO1xuXG4gICAgXy5lYWNoKHNlbGYubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgbC5zdWJvcmRlciA9IGkrKzsgICAgICAgICAgICAgICAvLyBzdWJvcmRlciBpcyB0aGUgb3JpZ2luYWwgb3JkZXIuIEluIGNhc2Ugb2YgdGllIHVzZSB0aGlzLlxuICAgICAgICBsLmNsYXNzID0gbC5jbGFzcyB8fCBcIkxJTkVcIjtcbiAgICAgICAgaWYgKCFyZWdpc3RlcmVkTW9kaWZpZXJzW2wuY2xhc3NdKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb2RpZmllciBcIiArIGwuY2xhc3MgKyBcIiBub3QgZGVmaW5lZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1vZGlmaWVyID0gbmV3IHJlZ2lzdGVyZWRNb2RpZmllcnNbbC5jbGFzc10obCk7XG4gICAgICAgIG1vZGlmaWVyLnN1Ym9yZGVyID0gaTtcbiAgICAgICAgbW9kaWZpZXJzLnB1c2gobW9kaWZpZXIpO1xuICAgIH0pO1xuXG4gICAgbW9kaWZpZXJzID0gXy5zb3J0QnlBbGwobW9kaWZpZXJzLCBbXCJleGVjT3JkZXJcIiwgXCJleGVjU3ViT3JkZXJcIiwgXCJzdWJvcmRlclwiXSk7XG5cbiAgICBfLmVhY2gobW9kaWZpZXJzLCBmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ubW9kaWZ5KHNlbGYudG90YWwsIHNlbGYub3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgICBzb3J0VHJlZShzZWxmLnRvdGFsKTtcblxuICAgIGNhbGNUb3RhbChzZWxmLnRvdGFsKTtcbiAgICByb3VuZEltcG9ydHMoc2VsZi50b3RhbCk7XG5cbiAgICBzZWxmLnRyZWVWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYudG90YWw7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG4gICAgZnVuY3Rpb24gcmVuZGVyTm9kZShub2RlLCBsZXZlbCkge1xuXG4gICAgICAgIHZhciByZW5kZXJUb3RhbCA9IHRydWU7XG4gICAgICAgIHZhciByZW5kZXJEZXRhaWwgPSB0cnVlO1xuICAgICAgICBpZiAoKCFub2RlLnNob3dJZlplcm8pICYmIChub2RlLmltcG9ydCA9PT0gMCkpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgIGlmICgobm9kZS5jaGlsZHMpJiYobm9kZS5jaGlsZHMubGVuZ3RoID09PSAxKSYmKCFub2RlLmhpZGVEZXRhaWwpKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVQYXJlbnQpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVDaGlsZCkgcmVuZGVyRGV0YWlsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUuaGlkZURldGFpbCkgcmVuZGVyRGV0YWlsPSBmYWxzZTtcbiAgICAgICAgaWYgKG5vZGUuaGlkZVRvdGFsKSByZW5kZXJUb3RhbD1mYWxzZTtcblxuICAgICAgICB2YXIgbmV3Tm9kZSA9IF8uY2xvbmUobm9kZSk7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmNoaWxkcztcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuc2hvd0lmWmVybztcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaGlkZURldGFpbDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaGlkZVRvdGFsO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5pZk9uZUhpZGVQYXJlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmlmT25lSGlkZUNoaWxkO1xuICAgICAgICBuZXdOb2RlLmxldmVsID0gbGV2ZWw7XG5cbiAgICAgICAgaWYgKChyZW5kZXJUb3RhbCkgJiYgKCFub2RlLnRvdGFsT25Cb3R0b20pKSB7XG4gICAgICAgICAgICBzZWxmLnJlbmRlclJlc3VsdC5wdXNoKG5ld05vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbmRlckRldGFpbCkge1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZW5kZXJOb2RlKGNoaWxkTm9kZSwgcmVuZGVyVG90YWwgPyBsZXZlbCArMSA6IGxldmVsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICgocmVuZGVyVG90YWwpICYmIChub2RlLnRvdGFsT25Cb3R0b20pKSB7XG4gICAgICAgICAgICBzZWxmLnJlbmRlclJlc3VsdC5wdXNoKG5ld05vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYucmVuZGVyVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyUmVzdWx0O1xuICAgIH1cblxuICAgIHNlbGYucmVuZGVyUmVzdWx0ID0gW107XG5cbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHJlbmRlck5vZGUoc2VsZi50b3RhbCwgMCk7XG5cbiAgICBzZWxmLnJlbmRlclZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi5yZW5kZXJSZXN1bHQ7XG59O1xuXG5cblByaWNlMi5wcm90b3R5cGUucmVuZGVyVHJlZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG4gICAgZnVuY3Rpb24gcmVuZGVyVHJlZU5vZGUobm9kZSwgcGFyZW50Tm9kZSkge1xuXG5cbiAgICAgICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKG5vZGUpO1xuICAgICAgICBuZXdOb2RlLmNoaWxkcyA9IFtdO1xuXG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24oY2hpbGROb2RlKSB7XG4gICAgICAgICAgICByZW5kZXJUcmVlTm9kZShjaGlsZE5vZGUsIG5ld05vZGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgcmVuZGVyVG90YWwgPSB0cnVlO1xuICAgICAgICB2YXIgcmVuZGVyRGV0YWlsID0gdHJ1ZTtcbiAgICAgICAgaWYgKCghbm9kZS5zaG93SWZaZXJvKSAmJiAobm9kZS5pbXBvcnQgPT09IDApKSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICBpZiAoKG5ld05vZGUuY2hpbGRzLmxlbmd0aCA9PT0gMSkmJighbm9kZS5oaWRlRGV0YWlsKSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlUGFyZW50KSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlQ2hpbGQpIHJlbmRlckRldGFpbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlLmhpZGVEZXRhaWwpIHJlbmRlckRldGFpbD0gZmFsc2U7XG4gICAgICAgIGlmIChub2RlLmhpZGVUb3RhbCkgcmVuZGVyVG90YWw9ZmFsc2U7XG5cbiAgICAgICAgLy8gICAgICAgICAgICBuZXdOb2RlLnBhcmVudCA9IHBhcmVudE5vZGU7XG5cbiAgICAgICAgaWYgKCFyZW5kZXJEZXRhaWwpIHtcbiAgICAgICAgICAgIG5ld05vZGUuY2hpbGRzID0gW107XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChyZW5kZXJUb3RhbCkge1xuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlLmNoaWxkcy5wdXNoKG5ld05vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyVHJlZVJlc3VsdCA9IG5ld05vZGU7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZS5sZXZlbD0wO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXdOb2RlLmxldmVsID0gcGFyZW50Tm9kZS5sZXZlbCArMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkczogW10sXG4gICAgICAgICAgICAgICAgICAgIGhpZGVUb3RhbDogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmVhY2gobmV3Tm9kZS5jaGlsZHMsIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlLmNoaWxkcy5wdXNoKG4pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGlmIChzZWxmLnJlbmRlclRyZWVWYWxpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi5yZW5kZXJUcmVlUmVzdWx0O1xuICAgIH1cblxuICAgIHNlbGYuY29uc3RydWN0VHJlZSgpO1xuXG4gICAgc2VsZi5yZW5kZXJUcmVlUmVzdWx0ID0gbnVsbDtcblxuICAgIHJlbmRlclRyZWVOb2RlKHNlbGYudG90YWwsIG51bGwpO1xuXG4gICAgc2VsZi5yZW5kZXJUcmVlVmFsaWQgPSB0cnVlO1xuICAgIHJldHVybiBzZWxmLnJlbmRlclRyZWVSZXN1bHQ7XG59O1xuXG5mdW5jdGlvbiBmaW5kTm9kZShub2RlLCBpZCkge1xuICAgIHZhciBpO1xuICAgIGlmICghbm9kZSkgcmV0dXJuIG51bGw7XG4gICAgaWYgKG5vZGUuaWQgPT09IGlkKSByZXR1cm4gbm9kZTtcbiAgICBpZiAoIW5vZGUuY2hpbGRzKSByZXR1cm4gbnVsbDtcbiAgICBmb3IgKGk9MDsgaTxub2RlLmNoaWxkcy5sZW5ndGg7IGkrPTEpIHtcbiAgICAgICAgdmFyIGZOb2RlID0gZmluZE5vZGUobm9kZS5jaGlsZHNbaV0sIGlkKTtcbiAgICAgICAgaWYgKGZOb2RlKSByZXR1cm4gZk5vZGU7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5QcmljZTIucHJvdG90eXBlLmdldEltcG9ydCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlkID0gaWQgfHwgXCJ0b3RhbFwiO1xuICAgIHNlbGYuY29uc3RydWN0VHJlZSgpO1xuXG4gICAgdmFyIG5vZGUgPSBmaW5kTm9kZShzZWxmLnRvdGFsLCBpZCk7XG5cbiAgICBpZiAobm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZS5pbXBvcnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuUHJpY2UyLnByb3RvdHlwZS5hZGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24oYXRyaWJ1dGUpIHtcbiAgICB2YXIgc2VsZj10aGlzO1xuICAgIHZhciBhdHRycztcbiAgICBpZiAodHlwZW9mIGF0cmlidXRlID09PSBcInN0cmluZ1wiICkge1xuICAgICAgICBhdHRycyA9IFthdHJpYnV0ZV07XG4gICAgfSBlbHNlIGlmIChhdHJpYnV0ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGF0dHJzID0gYXRyaWJ1dGU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBBdHRyaWJ1dGVcIik7XG4gICAgfVxuICAgIF8uZWFjaChhdHRycywgZnVuY3Rpb24oYSkge1xuICAgICAgICBfLmVhY2goc2VsZi5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgaWYgKCFsLmF0dHJpYnV0ZXMpIGwuYXR0cmlidXRlcyA9IFtdO1xuICAgICAgICAgICAgaWYgKCFfLmNvbnRhaW5zKGwuYXR0cmlidXRlcywgYSkpIHtcbiAgICAgICAgICAgICAgICBsLmF0dHJpYnV0ZXMucHVzaChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmoubGluZXMgPSBfLm1hcCh0aGlzLmxpbmVzLCBfLmNsb25lKTtcbiAgICBfLmVhY2gob2JqLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbC5mcm9tID09PSBcIm51bWJlclwiKSBsLmZyb20gPSBkdS5pbnQyZGF0ZShsLmZyb20pO1xuICAgICAgICBpZiAodHlwZW9mIGwudG8gPT09IFwibnVtYmVyXCIpIGwudG8gPSBkdS5pbnQyZGF0ZShsLnRvKTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlMjtcblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbi8qXG5cbkFncmVnYXRlIE1vZGlmaWVyXG49PT09PT09PT09PT09PT09PVxuXG4gICAgZ3JvdXBCeSAgICAgICAgICAgICBGbGFnIG9mIHRoZSBsaW5lcyB0aGF0IHNob3VsZCBiZSByZXBsYWNlZFxuICAgIGV4ZWNPcmRlciAgICAgICAgICAgT3JkZXIgaW4gd2hpY2ggdGhpcyBtb2RpZmllciBpIGV4Y2V2dXRlZC5cblxufVxuXG4qL1xuXG52YXIgUHJpY2VBZ3JlZ2F0b3IgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDU7XG4gICAgdGhpcy5ncm91cEJ5ID0gbGluZS5ncm91cEJ5O1xufTtcblxuUHJpY2VBZ3JlZ2F0b3IucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKHRoaXMubGluZSk7XG4gICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAoXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIHNlbGYuZ3JvdXBCeSkpIHtcbiAgICAgICAgICAgIG5ld05vZGUuY2hpbGRzLnB1c2gobCk7XG4gICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgaS09MTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0cmVlLmNoaWxkcy5wdXNoKG5ld05vZGUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUFncmVnYXRvcjtcblxuXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcbnZhciBkdT0gcmVxdWlyZShcIi4vZGF0ZV91dGlscy5qc1wiKTtcblxuLypcblxuRGlzY291bnQgTW9kaWZpZXJcbj09PT09PT09PT09PT09PT09XG5cbiAgICBwaGFzZSAgICAgICAgICAgICBGbGFnIG9mIHRoZSBsaW5lcyB0aGF0IHNob3VsZCBiZSByZXBsYWNlZFxuICAgIGV4ZWNPcmRlciAgICAgICAgICAgT3JkZXIgaW4gd2hpY2ggdGhpcyBtb2RpZmllciBpIGV4Y2V2dXRlZC5cbiAgICBydWxlcyAgICAgICAgICAgICAgQXJyYXkgb2YgcnVsZXNcblxuXG5cbn1cblxuKi9cblxudmFyIFByaWNlRGlzY291bnQgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5leGVjU3Vib3JkZXIgPSBsaW5lLnBoYXNlO1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA1O1xuXG59O1xuXG5QcmljZURpc2NvdW50LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBydWxlRG9lc0FwcGx5IChydWxlKSB7XG4gICAgICAgIHZhciBpUmVzZXJ2YXRpb24gPSBkdS5kYXRlMmludChvcHRpb25zLnJlc2VydmF0aW9uKTtcbiAgICAgICAgaWYgKChydWxlLnJlc2VydmF0aW9uTWluKSYmKGlSZXNlcnZhdGlvbiA8IGR1LmRhdGUyaW50KHJ1bGUucmVzZXJ2YXRpb25NaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUucmVzZXJ2YXRpb25NYXgpJiYoaVJlc2VydmF0aW9uID4gZHUuZGF0ZTJpbnQocnVsZS5yZXNlcnZhdGlvbk1heCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBpQ2hlY2tpbiA9IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbik7XG4gICAgICAgIHZhciBpQ2hlY2tvdXQgPSBkdS5kYXRlMmludChvcHRpb25zLmNoZWNrb3V0KTtcbiAgICAgICAgaWYgKChydWxlLmRheXNCZWZvcmVDaGVja2luTWluKSYmKCBpQ2hlY2tpbiAtIGlSZXNlcnZhdGlvbiA8IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW4gKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW4gfHwgcnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbj09PTApJiYoIGlDaGVja2luIC0gaVJlc2VydmF0aW9uID4gcnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1heCApKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja2luTWluKSYmKCBpQ2hlY2tpbiA8IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tpbk1pbikpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja2luTWF4KSYmKCBpQ2hlY2tpbiA+IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tpbk1heCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja291dE1pbikmJiggaUNoZWNrb3V0IDwgZHUuZGF0ZTJpbnQocnVsZS5jaGVja291dE1pbikpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja291dE1heCkmJiggaUNoZWNrb3V0ID4gZHUuZGF0ZTJpbnQocnVsZS5jaGVja291dE1heCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5taW5TdGF5KSYmKCBpQ2hlY2tvdXQgLSBpQ2hlY2tpbiA8IHJ1bGUubWluU3RheSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLm1heFN0YXkgfHwgcnVsZS5tYXhTdGF5PT09MCkmJiggaUNoZWNrb3V0IC0gaUNoZWNraW4gPCBydWxlLm1heFN0YXkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcHJvcG9ydGlvbkFwcGx5KGlJbiwgaU91dCwgaUFwcGx5RnJvbSwgaUFwcGx5VG8pIHtcbiAgICAgICAgdmFyIGEgPSBpSW4gPiBpQXBwbHlGcm9tID8gaUluIDogaUFwcGx5RnJvbTtcbiAgICAgICAgdmFyIGIgPSBpT3V0IDwgaUFwcGx5VG8gPyBpT3V0IDogaUFwcGx5VG87XG4gICAgICAgIGlmIChiPmEpIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gKGItYSkvKGlPdXQtaUluKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaW5lRnJvbVJ1bGUocnVsZSkge1xuICAgICAgICB2YXIgbmV3TGluZSA9IF8uY2xvbmUoc2VsZi5saW5lKTtcbiAgICAgICAgdmFyIHByb3BvcnRpb247XG4gICAgICAgIHZhciB2YXQgPTA7XG4gICAgICAgIHZhciBiYXNlID0wO1xuICAgICAgICB2YXIgdG90YWxJbXBvcnQgPTA7XG5cbiAgICAgICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBpZiAoISBfLmNvbnRhaW5zKGwuYXR0cmlidXRlcywgcnVsZS5hcHBseUlkQ29uY2VwdEF0cmlidXRlKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGwuYmFzZUltcG9ydCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBpZiAocnVsZS5hcHBsaWNhdGlvblR5cGUgPT09IFwiV0hPTEVcIikge1xuICAgICAgICAgICAgICAgIHByb3BvcnRpb24gPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcm9wb3J0aW9uID0gcHJvcG9ydGlvbkFwcGx5KFxuICAgICAgICAgICAgICAgICAgICBsLmZyb20gPyBkdS5kYXRlMmludChsLmZyb20pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja2luKSxcbiAgICAgICAgICAgICAgICAgICAgbC50byA/IGR1LmRhdGUyaW50KGwudG8pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCksXG4gICAgICAgICAgICAgICAgICAgIGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlGcm9tKSxcbiAgICAgICAgICAgICAgICAgICAgZHUuZGF0ZTJpbnQocnVsZS5hcHBseVRvKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsVmF0ID0gMDtcbiAgICAgICAgICAgIF8uZWFjaChsLnRheGVzLCBmdW5jdGlvbih0YXgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGF4LnR5cGUgPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbFZhdCA9IHRheC5QQztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmF0ID0gKHZhdCpiYXNlICsgbFZhdCpsLmJhc2VJbXBvcnQgKiBwcm9wb3J0aW9uKSAvIChiYXNlICsgbC5iYXNlSW1wb3J0ICogcHJvcG9ydGlvbik7XG4gICAgICAgICAgICBiYXNlID0gYmFzZSArIGwuYmFzZUltcG9ydCAqIHByb3BvcnRpb247XG4gICAgICAgICAgICB0b3RhbEltcG9ydCArPSBsLmltcG9ydCAqIHByb3BvcnRpb247XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ld0xpbmUuYmFzZUltcG9ydCA9IGJhc2UgKiAoIDEtIHJ1bGUuYXBwbHlEaXNjb3VudFBDLzEwMCk7XG4gICAgICAgIG5ld0xpbmUuaW1wb3J0ID0gYmFzZSAqICggMS0gcnVsZS5hcHBseURpc2NvdW50UEMvMTAwKTtcblxuICAgICAgICBuZXdMaW5lLnRheGVzID0gbmV3TGluZS50YXhlcyB8fCBbXTtcblxuICAgICAgICB2YXIgdGF4ID0gXy5maW5kV2hlcmUobmV3TGluZS50YXhlcyx7dHlwZTogXCJWQVRcIn0pO1xuICAgICAgICBpZiAoIXRheCkge1xuICAgICAgICAgICAgdGF4ID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFwiVkFUXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBuZXdMaW5lLnRheGVzLnB1c2ggPSB0YXg7XG4gICAgICAgIH1cbiAgICAgICAgdGF4LlBDID0gdmF0O1xuXG4gICAgICAgIHJldHVybiBuZXdMaW5lO1xuICAgIH1cblxuXG4gICAgdmFyIHNhbWVQaGFzZURpc2NvdW50cyA9IFtdO1xuICAgIHZhciBwb3N0cG9uZWREaXNjb3VudHMgPSBbXTtcblxuICAgIHZhciBpLGw7XG4gICAgZm9yIChpPTA7IGk8dHJlZS5jaGlsZHMubGVuZ3RoOyBpKz0xKSB7XG4gICAgICAgIGw9dHJlZS5jaGlsZHNbaV07XG4gICAgICAgIGlmIChsLmNsYXNzID09PSBcIkRJU0NPVU5UXCIpIHtcbiAgICAgICAgICAgIGlmIChsLnBoYXNlID09PSBzZWxmLmxpbmUucGhhc2UpIHsgLy8gUmVtb3ZlIGFuZCBnZXQgdGhlIGJlc3RcbiAgICAgICAgICAgICAgICBzYW1lUGhhc2VEaXNjb3VudHMucHVzaChsKTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgICAgICBpLT0xO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsLnBoYXNlID4gc2VsZi5saW5lLnBoYXNlKSB7IC8vIFJlbW92ZSBhbmQgcmVwcmNlc3MgIGxhdGVyXG4gICAgICAgICAgICAgICAgcG9zdHBvbmVkRGlzY291bnRzLnB1c2gobCk7XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHMucG9wKCk7XG4gICAgICAgICAgICAgICAgaS09MTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhcHBsaWVkUnVsZXMgPSBfLmZpbHRlcih0aGlzLnJ1bGVzLCBydWxlRG9lc0FwcGx5KTtcblxuICAgIHZhciBiZXN0TGluZSA9IF8ucmVkdWNlKGFwcGxpZWRSdWxlcywgZnVuY3Rpb24oYmVzdExpbmUsIHJ1bGUpIHtcbiAgICAgICAgdmFyIGwgPSBsaW5lRnJvbVJ1bGUocnVsZSk7XG4gICAgICAgIGlmICghYmVzdExpbmUpIHJldHVybiBsO1xuICAgICAgICByZXR1cm4gKGwuaW1wb3J0IDwgYmVzdExpbmUuaW1wb3J0KSA/IGwgOiBiZXN0TGluZTtcbiAgICB9KTtcblxuICAgIGlmIChiZXN0TGluZSkge1xuICAgICAgICBzYW1lUGhhc2VEaXNjb3VudHMucHVzaChiZXN0TGluZSk7XG5cbiAgICAgICAgdmFyIGJlc3RMaW5lSW5QaGFzZSA9IF8ucmVkdWNlKHNhbWVQaGFzZURpc2NvdW50cywgZnVuY3Rpb24oYmVzdExpbmUsIGxpbmUpIHtcbiAgICAgICAgICAgIGlmICghbGluZSkgcmV0dXJuIGJlc3RMaW5lO1xuICAgICAgICAgICAgcmV0dXJuIChsaW5lLmltcG9ydCA8IGJlc3RMaW5lLmltcG9ydCkgPyBsaW5lIDogYmVzdExpbmU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRyZWUuY2hpbGRzLnB1c2goYmVzdExpbmVJblBoYXNlKTtcblxuICAgICAgICBwb3N0cG9uZWREaXNjb3VudHMgPSBfLnNvcnRCeShwb3N0cG9uZWREaXNjb3VudHMsICdwaGFzZScpO1xuICAgIH1cblxuICAgIF8uZWFjaChwb3N0cG9uZWREaXNjb3VudHMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgdmFyIG1vZGlmaWVyID0gbmV3IFByaWNlRGlzY291bnQobCk7XG4gICAgICAgIG1vZGlmaWVyLmFwcGx5KHRyZWUsIG9wdGlvbnMpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZURpc2NvdW50O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbnZhciBQcmljZUxpbmUgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDA7XG59O1xuXG5QcmljZUxpbmUucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgICB2YXIgbCA9IF8uY2xvbmUodGhpcy5saW5lKTtcblxuICAgIHZhciBwcmljZSA9IGwucHJpY2U7XG5cbiAgICBsLmltcG9ydCA9IGwucHJpY2UgKiBsLnF1YW50aXR5O1xuICAgIGlmICghaXNOYU4obC5wZXJpb2RzKSkge1xuICAgICAgICBsLmltcG9ydCA9IGwuaW1wb3J0ICogbC5wZXJpb2RzO1xuICAgIH1cblxuICAgIGlmIChsLmRpc2NvdW50KSB7XG4gICAgICAgIGwuaW1wb3J0ID0gbC5pbXBvcnQgKiAoMSAtIGwuZGlzY291bnQvMTAwKTtcbiAgICB9XG5cbiAgICBsLmJhc2VJbXBvcnQgPSBsLmltcG9ydDtcblxuICAgIHRyZWUuY2hpbGRzLnB1c2gobCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlTGluZTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgUHJpY2VWYXRJbmNsdWRlZCA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgOTtcbn07XG5cblByaWNlVmF0SW5jbHVkZWQucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUpIHtcblxuICAgIGZ1bmN0aW9uIGFwcGx5VmF0Tm9kZShub2RlKSB7XG4gICAgICAgIF8uZWFjaChub2RlLnRheGVzLCBmdW5jdGlvbih0YXgpIHtcbiAgICAgICAgICAgIGlmICh0YXgudHlwZSA9PT0gXCJWQVRcIikge1xuICAgICAgICAgICAgICAgIG5vZGUuaW1wb3J0ID0gbm9kZS5pbXBvcnQgKiAoMSArIHRheC5QQy8xMDApO1xuICAgICAgICAgICAgICAgIG5vZGUucHJpY2UgPSBub2RlLnByaWNlICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgYXBwbHlWYXROb2RlKTtcbiAgICB9XG5cbiAgICBhcHBseVZhdE5vZGUodHJlZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlVmF0SW5jbHVkZWQ7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcm91bmQodmFsLCByb3VuZGluZ1R5cGUsIHJvdW5kaW5nKSB7XG4gICAgdmFyIHY7XG4gICAgaWYgKCghcm91bmRpbmdUeXBlKSB8fCAocm91bmRpbmdUeXBlID09PSBcIk5PTkVcIikpIHtcbiAgICAgICAgdiA9IE1hdGgucm91bmQodmFsIC8gMC4wMSkgKiAwLjAxO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJGTE9PUlwiKSkge1xuICAgICAgICB2PSBNYXRoLmZsb29yKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMikgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJST1VORFwiKSkge1xuICAgICAgICB2PSBNYXRoLnJvdW5kKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMykgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJDRUlMXCIpKSB7XG4gICAgICAgIHY9IE1hdGguY2VpbCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHJvdW5kaW5nVHlwZTogcm91bmRpbmdUeXBlXCIpO1xuICAgIH1cbiAgICByZXR1cm4gKyhNYXRoLnJvdW5kKHYgKyBcImUrMlwiKSAgKyBcImUtMlwiKTtcbn07XG4iXX0=
