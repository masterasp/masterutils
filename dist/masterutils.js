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
                _.each(p.lines, function(l) {
                    self.lines.push(_.clone(l));
                });
            } else if (p instanceof Array) {
                _.each(p, function(l) {
                    self.lines.push(_.clone(l));
                });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvY3JlZGl0Y2FyZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2RhdGVfdXRpbHMuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9mYWtlXzYwYmExYWQuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlMi5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2FncmVnYXRvci5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2Rpc2NvdW50LmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfbGluZS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX3ZhdGluY2x1ZGVkLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcm91bmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXHJcblxyXG4vKlxyXG5cclxuVGhpcyByb3V0aW5lIGNoZWNrcyB0aGUgY3JlZGl0IGNhcmQgbnVtYmVyLiBUaGUgZm9sbG93aW5nIGNoZWNrcyBhcmUgbWFkZTpcclxuXHJcbjEuIEEgbnVtYmVyIGhhcyBiZWVuIHByb3ZpZGVkXHJcbjIuIFRoZSBudW1iZXIgaXMgYSByaWdodCBsZW5ndGggZm9yIHRoZSBjYXJkXHJcbjMuIFRoZSBudW1iZXIgaGFzIGFuIGFwcHJvcHJpYXRlIHByZWZpeCBmb3IgdGhlIGNhcmRcclxuNC4gVGhlIG51bWJlciBoYXMgYSB2YWxpZCBtb2R1bHVzIDEwIG51bWJlciBjaGVjayBkaWdpdCBpZiByZXF1aXJlZFxyXG5cclxuSWYgdGhlIHZhbGlkYXRpb24gZmFpbHMgYW4gZXJyb3IgaXMgcmVwb3J0ZWQuXHJcblxyXG5UaGUgc3RydWN0dXJlIG9mIGNyZWRpdCBjYXJkIGZvcm1hdHMgd2FzIGdsZWFuZWQgZnJvbSBhIHZhcmlldHkgb2Ygc291cmNlcyBvbiB0aGUgd2ViLCBhbHRob3VnaCB0aGUgXHJcbmJlc3QgaXMgcHJvYmFibHkgb24gV2lrZXBlZGlhIChcIkNyZWRpdCBjYXJkIG51bWJlclwiKTpcclxuXHJcbiAgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9DcmVkaXRfY2FyZF9udW1iZXJcclxuXHJcblBhcmFtZXRlcnM6XHJcbiAgICAgICAgICAgIGNhcmRudW1iZXIgICAgICAgICAgIG51bWJlciBvbiB0aGUgY2FyZFxyXG4gICAgICAgICAgICBjYXJkbmFtZSAgICAgICAgICAgICBuYW1lIG9mIGNhcmQgYXMgZGVmaW5lZCBpbiB0aGUgY2FyZCBsaXN0IGJlbG93XHJcblxyXG5BdXRob3I6ICAgICBKb2huIEdhcmRuZXJcclxuRGF0ZTogICAgICAgMXN0IE5vdmVtYmVyIDIwMDNcclxuVXBkYXRlZDogICAgMjZ0aCBGZWIuIDIwMDUgICAgICBBZGRpdGlvbmFsIGNhcmRzIGFkZGVkIGJ5IHJlcXVlc3RcclxuVXBkYXRlZDogICAgMjd0aCBOb3YuIDIwMDYgICAgICBBZGRpdGlvbmFsIGNhcmRzIGFkZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDE4dGggSmFuLiAyMDA4ICAgICAgQWRkaXRpb25hbCBjYXJkcyBhZGRlZCBmcm9tIFdpa2lwZWRpYVxyXG5VcGRhdGVkOiAgICAyNnRoIE5vdi4gMjAwOCAgICAgIE1hZXN0cm8gY2FyZHMgZXh0ZW5kZWRcclxuVXBkYXRlZDogICAgMTl0aCBKdW4uIDIwMDkgICAgICBMYXNlciBjYXJkcyBleHRlbmRlZCBmcm9tIFdpa2lwZWRpYVxyXG5VcGRhdGVkOiAgICAxMXRoIFNlcC4gMjAxMCAgICAgIFR5cG9zIHJlbW92ZWQgZnJvbSBEaW5lcnMgYW5kIFNvbG8gZGVmaW5pdGlvbnMgKHRoYW5rcyB0byBOb2UgTGVvbilcclxuVXBkYXRlZDogICAgMTB0aCBBcHJpbCAyMDEyICAgICBOZXcgbWF0Y2hlcyBmb3IgTWFlc3RybywgRGluZXJzIEVucm91dGUgYW5kIFN3aXRjaFxyXG5VcGRhdGVkOiAgICAxN3RoIE9jdG9iZXIgMjAxMiAgIERpbmVycyBDbHViIHByZWZpeCAzOCBub3QgZW5jb2RlZFxyXG5cclxuKi9cclxuXHJcbi8qXHJcbiAgIElmIGEgY3JlZGl0IGNhcmQgbnVtYmVyIGlzIGludmFsaWQsIGFuIGVycm9yIHJlYXNvbiBpcyBsb2FkZWQgaW50byB0aGUgZ2xvYmFsIGNjRXJyb3JObyB2YXJpYWJsZS5cclxuICAgVGhpcyBjYW4gYmUgYmUgdXNlZCB0byBpbmRleCBpbnRvIHRoZSBnbG9iYWwgZXJyb3IgIHN0cmluZyBhcnJheSB0byByZXBvcnQgdGhlIHJlYXNvbiB0byB0aGUgdXNlclxyXG4gICBpZiByZXF1aXJlZDpcclxuXHJcbiAgIGUuZy4gaWYgKCFjaGVja0NyZWRpdENhcmQgKG51bWJlciwgbmFtZSkgYWxlcnQgKGNjRXJyb3JzKGNjRXJyb3JObyk7XHJcbiovXHJcblxyXG52YXIgY2NFcnJvck5vID0gMDtcclxudmFyIGNjRXJyb3JzID0gW107XHJcblxyXG5jY0Vycm9ycyBbMF0gPSBcIlVua25vd24gY2FyZCB0eXBlXCI7XHJcbmNjRXJyb3JzIFsxXSA9IFwiTm8gY2FyZCBudW1iZXIgcHJvdmlkZWRcIjtcclxuY2NFcnJvcnMgWzJdID0gXCJDcmVkaXQgY2FyZCBudW1iZXIgaXMgaW4gaW52YWxpZCBmb3JtYXRcIjtcclxuY2NFcnJvcnMgWzNdID0gXCJDcmVkaXQgY2FyZCBudW1iZXIgaXMgaW52YWxpZFwiO1xyXG5jY0Vycm9ycyBbNF0gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBoYXMgYW4gaW5hcHByb3ByaWF0ZSBudW1iZXIgb2YgZGlnaXRzXCI7XHJcbmNjRXJyb3JzIFs1XSA9IFwiV2FybmluZyEgVGhpcyBjcmVkaXQgY2FyZCBudW1iZXIgaXMgYXNzb2NpYXRlZCB3aXRoIGEgc2NhbSBhdHRlbXB0XCI7XHJcblxyXG5mdW5jdGlvbiBjaGVja0NyZWRpdENhcmQgKGNhcmRudW1iZXIpIHtcclxuXHJcbiAgLy8gQXJyYXkgdG8gaG9sZCB0aGUgcGVybWl0dGVkIGNhcmQgY2hhcmFjdGVyaXN0aWNzXHJcbiAgdmFyIGNhcmRzID0gW107XHJcblxyXG4gIC8vIERlZmluZSB0aGUgY2FyZHMgd2Ugc3VwcG9ydC4gWW91IG1heSBhZGQgYWRkdGlvbmFsIGNhcmQgdHlwZXMgYXMgZm9sbG93cy5cclxuICAvLyAgTmFtZTogICAgICAgICBBcyBpbiB0aGUgc2VsZWN0aW9uIGJveCBvZiB0aGUgZm9ybSAtIG11c3QgYmUgc2FtZSBhcyB1c2VyJ3NcclxuICAvLyAgTGVuZ3RoOiAgICAgICBMaXN0IG9mIHBvc3NpYmxlIHZhbGlkIGxlbmd0aHMgb2YgdGhlIGNhcmQgbnVtYmVyIGZvciB0aGUgY2FyZFxyXG4gIC8vICBwcmVmaXhlczogICAgIExpc3Qgb2YgcG9zc2libGUgcHJlZml4ZXMgZm9yIHRoZSBjYXJkXHJcbiAgLy8gIGNoZWNrZGlnaXQ6ICAgQm9vbGVhbiB0byBzYXkgd2hldGhlciB0aGVyZSBpcyBhIGNoZWNrIGRpZ2l0XHJcblxyXG4gIGNhcmRzIFswXSA9IHtuYW1lOiBcIlZpc2FcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjEzLDE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjRcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzFdID0ge25hbWU6IFwiTWFzdGVyQ2FyZFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNTEsNTIsNTMsNTQsNTVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzJdID0ge25hbWU6IFwiRGluZXJzQ2x1YlwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTQsMTZcIiwgXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjM2LDM4LDU0LDU1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFszXSA9IHtuYW1lOiBcIkNhcnRlQmxhbmNoZVwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTRcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzAwLDMwMSwzMDIsMzAzLDMwNCwzMDVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzRdID0ge25hbWU6IFwiQW1FeFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTVcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzQsMzdcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzVdID0ge25hbWU6IFwiRGlzY292ZXJcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjYwMTEsNjIyLDY0LDY1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs2XSA9IHtuYW1lOiBcIkpDQlwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzddID0ge25hbWU6IFwiZW5Sb3V0ZVwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTVcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMjAxNCwyMTQ5XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs4XSA9IHtuYW1lOiBcIlNvbG9cIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjYzMzQsNjc2N1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbOV0gPSB7bmFtZTogXCJTd2l0Y2hcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjQ5MDMsNDkwNSw0OTExLDQ5MzYsNTY0MTgyLDYzMzExMCw2MzMzLDY3NTlcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzEwXSA9IHtuYW1lOiBcIk1hZXN0cm9cIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjEyLDEzLDE0LDE1LDE2LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjUwMTgsNTAyMCw1MDM4LDYzMDQsNjc1OSw2NzYxLDY3NjIsNjc2M1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTFdID0ge25hbWU6IFwiVmlzYUVsZWN0cm9uXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI0MDI2LDQxNzUwMCw0NTA4LDQ4NDQsNDkxMyw0OTE3XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxMl0gPSB7bmFtZTogXCJMYXNlckNhcmRcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2LDE3LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjYzMDQsNjcwNiw2NzcxLDY3MDlcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzEzXSA9IHtuYW1lOiBcIlRlc3RcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjE5MTJcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogZmFsc2V9O1xyXG4gIHZhciByZXMgPSB7XHJcbiAgICB2YWxpZDogZmFsc2VcclxuICB9O1xyXG5cclxuXHJcbiAgLy8gRW5zdXJlIHRoYXQgdGhlIHVzZXIgaGFzIHByb3ZpZGVkIGEgY3JlZGl0IGNhcmQgbnVtYmVyXHJcbiAgaWYgKGNhcmRudW1iZXIubGVuZ3RoID09PSAwKSAge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSAxO1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICAvLyBOb3cgcmVtb3ZlIGFueSBzcGFjZXMgZnJvbSB0aGUgY3JlZGl0IGNhcmQgbnVtYmVyXHJcbiAgY2FyZG51bWJlciA9IGNhcmRudW1iZXIucmVwbGFjZSAoL1xccy9nLCBcIlwiKTtcclxuXHJcbiAgLy8gQ2hlY2sgdGhhdCB0aGUgbnVtYmVyIGlzIG51bWVyaWNcclxuICB2YXIgY2FyZE5vID0gY2FyZG51bWJlcjtcclxuICB2YXIgY2FyZGV4cCA9IC9eWzAtOV17MTMsMTl9JC87XHJcbiAgaWYgKCFjYXJkZXhwLmV4ZWMoY2FyZE5vKSkgIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gMjtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgLy8gRXN0YWJsaXNoIGNhcmQgdHlwZVxyXG4gIHZhciBjYXJkVHlwZSA9IC0xO1xyXG4gIGZvciAodmFyIGk9MDsgaTxjYXJkcy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgIC8vIExvYWQgYW4gYXJyYXkgd2l0aCB0aGUgdmFsaWQgcHJlZml4ZXMgZm9yIHRoaXMgY2FyZFxyXG4gICAgcHJlZml4ID0gY2FyZHNbaV0ucHJlZml4ZXMuc3BsaXQoXCIsXCIpO1xyXG5cclxuICAgIC8vIE5vdyBzZWUgaWYgYW55IG9mIHRoZW0gbWF0Y2ggd2hhdCB3ZSBoYXZlIGluIHRoZSBjYXJkIG51bWJlclxyXG4gICAgZm9yIChqPTA7IGo8cHJlZml4Lmxlbmd0aDsgaisrKSB7XHJcbiAgICAgIHZhciBleHAgPSBuZXcgUmVnRXhwIChcIl5cIiArIHByZWZpeFtqXSk7XHJcbiAgICAgIGlmIChleHAudGVzdCAoY2FyZE5vKSkgY2FyZFR5cGUgPSBpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gSWYgY2FyZCB0eXBlIG5vdCBmb3VuZCwgcmVwb3J0IGFuIGVycm9yXHJcbiAgaWYgKGNhcmRUeXBlID09IC0xKSB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDI7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmVzLmNjTmFtZSA9IGNhcmRzW2NhcmRUeXBlXS5uYW1lO1xyXG5cclxuXHJcblxyXG4gIHZhciBqO1xyXG4gIC8vIE5vdyBjaGVjayB0aGUgbW9kdWx1cyAxMCBjaGVjayBkaWdpdCAtIGlmIHJlcXVpcmVkXHJcbiAgaWYgKGNhcmRzW2NhcmRUeXBlXS5jaGVja2RpZ2l0KSB7XHJcbiAgICB2YXIgY2hlY2tzdW0gPSAwOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBydW5uaW5nIGNoZWNrc3VtIHRvdGFsXHJcbiAgICB2YXIgbXljaGFyID0gXCJcIjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHQgY2hhciB0byBwcm9jZXNzXHJcbiAgICBqID0gMTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRha2VzIHZhbHVlIG9mIDEgb3IgMlxyXG5cclxuICAgIC8vIFByb2Nlc3MgZWFjaCBkaWdpdCBvbmUgYnkgb25lIHN0YXJ0aW5nIGF0IHRoZSByaWdodFxyXG4gICAgdmFyIGNhbGM7XHJcbiAgICBmb3IgKGkgPSBjYXJkTm8ubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHJcbiAgICAgIC8vIEV4dHJhY3QgdGhlIG5leHQgZGlnaXQgYW5kIG11bHRpcGx5IGJ5IDEgb3IgMiBvbiBhbHRlcm5hdGl2ZSBkaWdpdHMuXHJcbiAgICAgIGNhbGMgPSBOdW1iZXIoY2FyZE5vLmNoYXJBdChpKSkgKiBqO1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3VsdCBpcyBpbiB0d28gZGlnaXRzIGFkZCAxIHRvIHRoZSBjaGVja3N1bSB0b3RhbFxyXG4gICAgICBpZiAoY2FsYyA+IDkpIHtcclxuICAgICAgICBjaGVja3N1bSA9IGNoZWNrc3VtICsgMTtcclxuICAgICAgICBjYWxjID0gY2FsYyAtIDEwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBZGQgdGhlIHVuaXRzIGVsZW1lbnQgdG8gdGhlIGNoZWNrc3VtIHRvdGFsXHJcbiAgICAgIGNoZWNrc3VtID0gY2hlY2tzdW0gKyBjYWxjO1xyXG5cclxuICAgICAgLy8gU3dpdGNoIHRoZSB2YWx1ZSBvZiBqXHJcbiAgICAgIGlmIChqID09MSkge1xyXG4gICAgICAgIGogPSAyO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGogPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWxsIGRvbmUgLSBpZiBjaGVja3N1bSBpcyBkaXZpc2libGUgYnkgMTAsIGl0IGlzIGEgdmFsaWQgbW9kdWx1cyAxMC5cclxuICAgIC8vIElmIG5vdCwgcmVwb3J0IGFuIGVycm9yLlxyXG4gICAgaWYgKGNoZWNrc3VtICUgMTAgIT09IDApICB7XHJcbiAgICAgIHJlcy5jY0Vycm9yTm8gPSAzO1xyXG4gICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICAgcmV0dXJuIHJlcztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGl0J3Mgbm90IGEgc3BhbSBudW1iZXJcclxuICBpZiAoY2FyZE5vID09ICc1NDkwOTk3NzcxMDkyMDY0Jykge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSA1O1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICAvLyBUaGUgZm9sbG93aW5nIGFyZSB0aGUgY2FyZC1zcGVjaWZpYyBjaGVja3Mgd2UgdW5kZXJ0YWtlLlxyXG4gIHZhciBMZW5ndGhWYWxpZCA9IGZhbHNlO1xyXG4gIHZhciBQcmVmaXhWYWxpZCA9IGZhbHNlO1xyXG5cclxuICAvLyBXZSB1c2UgdGhlc2UgZm9yIGhvbGRpbmcgdGhlIHZhbGlkIGxlbmd0aHMgYW5kIHByZWZpeGVzIG9mIGEgY2FyZCB0eXBlXHJcbiAgdmFyIHByZWZpeCA9IFtdO1xyXG4gIHZhciBsZW5ndGhzID0gW107XHJcblxyXG4gIC8vIFNlZSBpZiB0aGUgbGVuZ3RoIGlzIHZhbGlkIGZvciB0aGlzIGNhcmRcclxuICBsZW5ndGhzID0gY2FyZHNbY2FyZFR5cGVdLmxlbmd0aC5zcGxpdChcIixcIik7XHJcbiAgZm9yIChqPTA7IGo8bGVuZ3Rocy5sZW5ndGg7IGorKykge1xyXG4gICAgaWYgKGNhcmROby5sZW5ndGggPT0gbGVuZ3Roc1tqXSkgTGVuZ3RoVmFsaWQgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gU2VlIGlmIGFsbCBpcyBPSyBieSBzZWVpbmcgaWYgdGhlIGxlbmd0aCB3YXMgdmFsaWQuIFdlIG9ubHkgY2hlY2sgdGhlIGxlbmd0aCBpZiBhbGwgZWxzZSB3YXMgXHJcbiAgLy8gaHVua3kgZG9yeS5cclxuICBpZiAoIUxlbmd0aFZhbGlkKSB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDQ7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIHJlcy52YWxpZCA9IHRydWU7XHJcblxyXG4gIC8vIFRoZSBjcmVkaXQgY2FyZCBpcyBpbiB0aGUgcmVxdWlyZWQgZm9ybWF0LlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbi8qPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cclxuXHJcbm1vZHVsZS5leHBvcnRzLmNoZWNrQ3JlZGl0Q2FyZCA9IGNoZWNrQ3JlZGl0Q2FyZDtcclxuXHJcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5cbnZhciBtb21lbnQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snbW9tZW50J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydtb21lbnQnXSA6IG51bGwpO1xuXG52YXIgdmlydHVhbFRpbWUgPSBudWxsO1xuZXhwb3J0cy5ub3cgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodmlydHVhbFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIHZpcnR1YWxUaW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgpO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuc2V0VmlydHVhbFRpbWUgPSBmdW5jdGlvbih0KSB7XG4gICAgdmlydHVhbFRpbWUgPSB0O1xufTtcblxuZXhwb3J0cy5kYXRlMnN0ciA9IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsMTApO1xufTtcblxuZXhwb3J0cy5kYXRlMmludCA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihkLmdldFRpbWUoKSAvIDg2NDAwMDAwKTtcbn07XG5cblxuZXhwb3J0cy5pbnREYXRlMnN0ciA9IGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgZHQ7XG4gICAgaWYgKGQgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIGR0ID0gZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkdCA9IG5ldyBEYXRlKGQqODY0MDAwMDApO1xuICAgIH1cbiAgICByZXR1cm4gZHQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmludDJkYXRlID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChkIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIGQ7XG4gICAgdmFyIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgcmV0dXJuIGR0O1xufTtcblxuZXhwb3J0cy50b2RheSA9IGZ1bmN0aW9uKHR6KSB7XG4gICAgdHogPSB0eiB8fCAnVVRDJztcblxuICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eih0eik7XG4gICAgdmFyIGRhdGVTdHIgPSBkdC5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICB2YXIgZHQyID0gbmV3IERhdGUoZGF0ZVN0cisnVDAwOjAwOjAwLjAwMFonKTtcblxuICAgIHJldHVybiBkdDIuZ2V0VGltZSgpIC8gODY0MDAwMDA7XG59O1xuXG5cblxuXG5cbi8vLyBDUk9OIElNUExFTUVOVEFUSU9OXG5cbmZ1bmN0aW9uIG1hdGNoTnVtYmVyKG4sIGZpbHRlcikge1xuICAgIG4gPSBwYXJzZUludChuKTtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZpbHRlciA9PT0gJyonKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgZiA9IGZpbHRlci50b1N0cmluZygpO1xuICAgIHZhciBvcHRpb25zID0gZi5zcGxpdCgnLCcpO1xuICAgIGZvciAodmFyIGk9MDsgaTxvcHRpb25zOyBpKz0xKSB7XG4gICAgICAgIHZhciBhcnIgPSBvcHRpb25zW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGlmIChhcnIubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAocGFyc2VJbnQoYXJyWzBdLDEwKSA9PT0gbikgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJyLmxlbmd0aCA9PT0yKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHBhcnNlSW50KGFyclswXSwxMCk7XG4gICAgICAgICAgICB2YXIgdG8gPSBwYXJzZUludChhcnJbMV0sMTApO1xuICAgICAgICAgICAgaWYgKChuPj1mcm9tICkgJiYgKG48PSB0bykpIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBtYXRjaEpvYihqb2IsIGNyb25EYXRlKSB7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoMCwyKSwgam9iLm1pbnV0ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigyLDIpLCBqb2IuaG91cikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig0LDIpLCBqb2IuZGF5T2ZNb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig2LDIpLCBqb2IubW9udGgpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoOCwxKSwgam9iLmRheU9mV2VlaykpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxudmFyIGNyb25Kb2JzID0gW107XG5leHBvcnRzLmFkZENyb25Kb2IgPSBmdW5jdGlvbihqb2IpIHtcblxuXG4gICAgam9iLnR6ID0gam9iLnR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KGpvYi50eik7XG4gICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcbiAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICBjcm9uSm9icy5wdXNoKGpvYik7XG4gICAgcmV0dXJuIGNyb25Kb2JzLmxlbmd0aCAtMTtcbn07XG5cbmV4cG9ydHMuZGVsZXRlQ3JvbkpvYiA9IGZ1bmN0aW9uKGlkSm9iKSB7XG4gICAgZGVsZXRlIGNyb25Kb2JzW2lkSm9iXTtcbn07XG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uZSBhIG1pbnV0ZSBpbiB0aGUgYmVnaW5pbmcgb2YgZWFjaCBtaW51dGUuXG4vLyBpdCBpcyB1c2VkIHRvIGNyb24gYW55IGZ1bmN0aW9uXG52YXIgb25NaW51dGUgPSBmdW5jdGlvbigpIHtcblxuXG4gICAgY3JvbkpvYnMuZm9yRWFjaChmdW5jdGlvbihqb2IpIHtcbiAgICAgICAgaWYgKCFqb2IpIHJldHVybjtcblxuICAgICAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICAgICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcblxuICAgICAgICBpZiAoKGNyb25EYXRlICE9PSBqb2IubGFzdCkgJiYgKG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpKSkge1xuICAgICAgICAgICAgaWYgKGpvYi5leGVjdXRpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkpvYiB0YWtlcyB0b28gbG9uZyB0byBleGVjdXRlOiBcIiArIGpvYi5uYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgam9iLmxhc3QgPSBjcm9uRGF0ZTtcbiAgICAgICAgICAgICAgICBqb2IuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBqb2IuY2IoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG5vdyA9IGV4cG9ydHMubm93KCkuZ2V0VGltZSgpO1xuICAgIHZhciBtaWxsc1RvTmV4dE1pbnV0ZSA9IDYwMDAwIC0gbm93ICUgNjAwMDA7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgb25NaW51dGUoKTtcbiAgICB9LCBtaWxsc1RvTmV4dE1pbnV0ZSk7XG59O1xuXG5vbk1pbnV0ZSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIG1hc3RlclV0aWxzID0ge1xuICAgICAgICBkYXRlVXRpbHM6IHJlcXVpcmUoJy4vZGF0ZV91dGlscy5qcycpLFxuICAgICAgICByb3VuZDogcmVxdWlyZSgnLi9yb3VuZC5qcycpLFxuICAgICAgICBQcmljZTogIHJlcXVpcmUoJy4vcHJpY2UuanMnKSxcbiAgICAgICAgUHJpY2UyOiByZXF1aXJlKCcuL3ByaWNlMi5qcycpLFxuICAgICAgICBjaGVja3M6IHtcbiAgICAgICAgICAgIGNoZWNrQ3JlZGl0Q2FyZDogcmVxdWlyZSgnLi9jcmVkaXRjYXJkLmpzJykuY2hlY2tDcmVkaXRDYXJkXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHJvb3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmICYmIHNlbGYgfHxcbiAgICAgICAgICAgIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IG1hc3RlclV0aWxzO1xuICAgICAgICB9XG4gICAgICAgIGV4cG9ydHMubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgd2luZG93Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgcm91bmQgPSByZXF1aXJlKCcuL3JvdW5kJyk7XG52YXIgZHUgPSByZXF1aXJlKCcuL2RhdGVfdXRpbHMnKTtcblxudmFyIFByaWNlID0gZnVuY3Rpb24obGluZXMpIHtcbiAgICBpZiAoIWxpbmVzKSBsaW5lcyA9W107XG5cbiAgICAvLyBJZiBhbm90aGVyIHByaWNlIChoYXMgbGluZXMpXG4gICAgaWYgKGxpbmVzLmxpbmVzKSB7XG4gICAgICAgIGxpbmVzID0gbGluZXMubGluZXM7XG4gICAgfVxuXG4vLyBDbG9uZSB0aGUgYXJyYXk7XG4gICAgdGhpcy5saW5lcyA9IF8ubWFwKGxpbmVzLCBfLmNsb25lKTtcbn07XG5cblByaWNlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqLmxpbmVzID0gXy5tYXAodGhpcy5saW5lcywgXy5jbG9uZSk7XG4gICAgXy5lYWNoKG9iai5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICBpZiAodHlwZW9mIGwuZnJvbSA9PT0gXCJudW1iZXJcIikgbC5mcm9tID0gZHUuaW50MmRhdGUobC5mcm9tKTtcbiAgICAgICAgaWYgKHR5cGVvZiBsLnRvID09PSBcIm51bWJlclwiKSBsLnRvID0gZHUuaW50MmRhdGUobC50byk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbn07XG5cblByaWNlLnByb3RvdHlwZS5saW5lUHJpY2UgPSBmdW5jdGlvbihsaW5lLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IF8uZXh0ZW5kKHtcbiAgICAgICAgd2l0aFRheGVzOiB0cnVlLFxuICAgICAgICB3aXRoRGlzY291bnRzOiB0cnVlLFxuICAgICAgICByb3VuZGVkOiB0cnVlLFxuICAgICAgICBiYXNlOiAwXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgcHJpY2U7XG4gICAgaWYgKHR5cGVvZiBsaW5lLnByaWNlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIHByaWNlID0gbGluZS5wcmljZTtcbiAgICB9IGVsc2UgaWYgKCAodHlwZW9mIGxpbmUucHJpY2U9PT1cIm9iamVjdFwiKSAmJiAobGluZS5wcmljZS50eXBlID09PSAnUEVSJykgKSB7XG4gICAgICAgIHByaWNlID0gb3B0aW9ucy5iYXNlICogbGluZS5wcmljZS5wcmljZVBDLzEwMDtcbiAgICAgICAgaWYgKHByaWNlPGxpbmUucHJpY2UucHJpY2VNaW4pIHByaWNlID0gbGluZS5wcmljZS5wcmljZU1pbjtcbiAgICB9IGVsc2UgaWYgKCAodHlwZW9mIGxpbmUucHJpY2U9PT1cIm9iamVjdFwiKSAmJiAobGluZS5wcmljZS50eXBlID09PSAnRVNDJykgKSB7XG4gICAgICAgIHByaWNlPU51bWJlci5NQVhfVkFMVUU7XG4gICAgICAgIF8uZWFjaChsaW5lLnByaWNlLnNjYWxlUHJpY2VzLCBmdW5jdGlvbihzcCkge1xuICAgICAgICAgICAgaWYgKChvcHRpb25zLmJhc2UgPD0gc3Auc3RheVByaWNlTWF4KSAmJiAoc3AucHJpY2UgPCBwcmljZSkpIHtcbiAgICAgICAgICAgICAgICBwcmljZSA9IHNwLnByaWNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHByaWNlID09PSBOdW1iZXIuTUFYX1ZBTFVFKSB7XG4gICAgICAgICAgICBwcmljZSA9IE5hTjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwcmljZTtcbn07XG5cblxuUHJpY2UucHJvdG90eXBlLmxpbmVJbXBvcnQgPSBmdW5jdGlvbihsaW5lLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IF8uZXh0ZW5kKHtcbiAgICAgICAgd2l0aFRheGVzOiB0cnVlLFxuICAgICAgICB3aXRoRGlzY291bnRzOiB0cnVlLFxuICAgICAgICByb3VuZGVkOiB0cnVlLFxuICAgICAgICBiYXNlOiAwXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgcHJpY2UgPSB0aGlzLmxpbmVQcmljZShsaW5lLG9wdGlvbnMpO1xuXG4gICAgdmFyIGxpbmVJbXBvcnQgPSBwcmljZSAqIGxpbmUucXVhbnRpdHk7XG4gICAgaWYgKCFpc05hTihsaW5lLnBlcmlvZHMpKSB7XG4gICAgICAgIGxpbmVJbXBvcnQgPSBsaW5lSW1wb3J0ICogbGluZS5wZXJpb2RzO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLndpdGhEaXNjb3VudHMpIHtcbiAgICAgICAgdmFyIGJhc2UgPSBsaW5lSW1wb3J0O1xuICAgICAgICBfLmVhY2gobGluZS5kaXNjb3VudHMsIGZ1bmN0aW9uKGRpc2NvdW50KSB7XG4gICAgICAgICAgICBpZiAoZGlzY291bnQudHlwZSA9PT0gXCJQQ1wiKSB7XG4gICAgICAgICAgICAgICAgbGluZUltcG9ydCA9IGxpbmVJbXBvcnQgLSBiYXNlICogZGlzY291bnQuUEMvMTAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy53aXRoVGF4ZXMpIHtcbiAgICAgICAgXy5lYWNoKGxpbmUudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgaWYgKHRheC50eXBlPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICBsaW5lSW1wb3J0ID0gbGluZUltcG9ydCAqICgxICsgdGF4LlBDLzEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnJvdW5kZWQpIHtcbiAgICAgICAgbGluZUltcG9ydCA9IHJvdW5kKGxpbmVJbXBvcnQsIFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpbmVJbXBvcnQ7XG59O1xuXG5QcmljZS5wcm90b3R5cGUuZ2V0SW1wb3J0ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gXy5leHRlbmQoe1xuICAgICAgICB3aXRoVGF4ZXM6IHRydWUsXG4gICAgICAgIHdpdGhEaXNjb3VudHM6IHRydWUsXG4gICAgICAgIHJvdW5kZWQ6IHRydWVcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBvbGRSb3VuZGVkID0gb3B0aW9ucy5yb3VuZGVkO1xuXG4gICAgb3B0aW9ucy5yb3VuZGVkID0gZmFsc2U7XG4gICAgdmFyIGFjID0gXy5yZWR1Y2Uoc2VsZi5saW5lcywgZnVuY3Rpb24obWVtbywgbGluZSkge1xuICAgICAgICByZXR1cm4gbWVtbyArIHNlbGYubGluZUltcG9ydChsaW5lLCBvcHRpb25zKTtcbiAgICB9LDApO1xuXG4gICAgaWYgKG9sZFJvdW5kZWQpIHtcbiAgICAgICAgYWMgPSByb3VuZChhYywgXCJST1VORFwiLCAwLjAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWM7XG59O1xuXG5QcmljZS5wcm90b3R5cGUuYWRkUHJpY2UgPSBmdW5jdGlvbihwKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYgKCFwKSByZXR1cm47XG4gICAgICAgIHZhciBjcCA9IF8uY2xvbmUocCk7XG4gICAgICAgIF8uZWFjaChjcC5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKGwpO1xuICAgICAgICB9KTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIHJvdW5kID0gcmVxdWlyZSgnLi9yb3VuZCcpO1xudmFyIGR1ID0gcmVxdWlyZSgnLi9kYXRlX3V0aWxzJyk7XG5cbi8qXG4vLyBWSVNVQUxJWkFUSU9OIEZMQUdTIElOIEVBQ0ggTk9ERVxuICAgIHNob3dJZlplcm86ICAgICAgICAgU2hvdyBldmVuIGlmIFRvdGFsIGlzIHplcm9cbiAgICBpZk9uZUhpZGVQYXJlbnQ6ICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhpcyBncm91cCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2UgaXQgd2l0aCB0aGUgY2hhbGRcbiAgICBpZk9uZUhpZGVDaGlsZDogICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhlIGNoaWxkXG4gICAgaGlkZVRvdGFsOiAgICAgICAgICBKdXN0IHJlbW92ZSAgdGhlIHRvdGFsIGFuZCBwdXQgYWxsIHRoZSBjaGlsZHNcbiAgICB0b3RhbE9uQm90dG9tOiAgICAgICAgIFB1dCB0aGUgVG90YWwgb24gdGhlIGRvcFxuICAgIGhpZGVEZXRhaWw6ICAgICAgICAgRG8gbm90IHNob3cgdGhlIGRldGFpbHNcbiovXG5cblxudmFyIHJlZ2lzdGVyZWRNb2RpZmllcnMgPSB7XG4gICAgXCJBR1JFR0FUT1JcIjogcmVxdWlyZShcIi4vcHJpY2VfYWdyZWdhdG9yLmpzXCIpLFxuICAgIFwiTElORVwiOiByZXF1aXJlKFwiLi9wcmljZV9saW5lLmpzXCIpLFxuICAgIFwiVkFUSU5DTFVERURcIjogcmVxdWlyZShcIi4vcHJpY2VfdmF0aW5jbHVkZWQuanNcIiksXG4gICAgXCJESVNDT1VOVFwiOiByZXF1aXJlKFwiLi9wcmljZV9kaXNjb3VudC5qc1wiKVxufTtcblxudmFyIFByaWNlMiA9IGZ1bmN0aW9uKHAxLCBwMikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLmxpbmVzID0gW107XG4gICAgc2VsZi5vcHRpb25zID0ge307XG4gICAgXy5lYWNoKGFyZ3VtZW50cywgZnVuY3Rpb24ocCkge1xuICAgICAgICBpZiAocCkge1xuICAgICAgICAgICAgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJihwLmxpbmVzKSkge1xuICAgICAgICAgICAgICAgIF8uZWFjaChwLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKGwpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgXy5lYWNoKHAsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUobCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYocC5jbGFzcyB8fCBwLmxhYmVsKSkge1xuICAgICAgICAgICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKHApKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMgPSBwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBzZWxmLnRyZWVWYWxpZD1mYWxzZTtcbiAgICBzZWxmLnJlbmRlclZhbGlkPWZhbHNlO1xuICAgIHNlbGYucmVuZGVyVHJlZVZhbGlkPWZhbHNlO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS5hZGRQcmljZSA9IGZ1bmN0aW9uKHApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFwKSByZXR1cm47XG4gICAgdmFyIGNwO1xuICAgIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYgKHAubGluZXMpKSB7XG4gICAgICAgIGNwID0gcC5saW5lcztcbiAgICB9IGVsc2UgaWYgKGNwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3AgPSBwO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgY3AgPSBbcF07XG4gICAgfVxuICAgIF8uZWFjaChjcCwgZnVuY3Rpb24obCkge1xuICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgfSk7XG4gICAgc2VsZi50cmVlVmFsaWQ9ZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJWYWxpZCA9IGZhbHNlO1xuICAgIHNlbGYucmVuZGVyVHJlZVZhbGlkID0gZmFsc2U7XG59O1xuXG5cblByaWNlMi5wcm90b3R5cGUuY29uc3RydWN0VHJlZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gc29ydFRyZWUobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5jaGlsZHMpIHtcbiAgICAgICAgICAgIG5vZGUuY2hpbGRzID0gXy5zb3J0QnlBbGwobm9kZS5jaGlsZHMsIFtcIm9yZGVyXCIsIFwic3Vib3JkZXJcIl0pO1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBzb3J0VHJlZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjVG90YWwobm9kZSkge1xuICAgICAgICBub2RlLmltcG9ydCA9IG5vZGUuaW1wb3J0IHx8IDA7XG4gICAgICAgIGlmIChub2RlLmNoaWxkcykge1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5pbXBvcnQgKz0gY2FsY1RvdGFsKGMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGUuaW1wb3J0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJvdW5kSW1wb3J0cyhub2RlKSB7XG4gICAgICAgIG5vZGUuaW1wb3J0ID0gcm91bmQobm9kZS5pbXBvcnQsIFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgcm91bmRJbXBvcnRzKTtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi50cmVlVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYudG90YWw7XG4gICAgfVxuXG4gICAgc2VsZi50b3RhbCA9IHtcbiAgICAgICAgaWQ6IFwidG90YWxcIixcbiAgICAgICAgbGFiZWw6IFwiQFRvdGFsXCIsXG4gICAgICAgIGNoaWxkczogW10sXG5cbiAgICAgICAgc2hvd0lmWmVybzogdHJ1ZSxcbiAgICAgICAgdG90YWxPbkJvdHRvbTogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgbW9kaWZpZXJzID0gW107XG5cbiAgICB2YXIgaSA9MDtcblxuICAgIF8uZWFjaChzZWxmLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGwuc3Vib3JkZXIgPSBpKys7ICAgICAgICAgICAgICAgLy8gc3Vib3JkZXIgaXMgdGhlIG9yaWdpbmFsIG9yZGVyLiBJbiBjYXNlIG9mIHRpZSB1c2UgdGhpcy5cbiAgICAgICAgbC5jbGFzcyA9IGwuY2xhc3MgfHwgXCJMSU5FXCI7XG4gICAgICAgIGlmICghcmVnaXN0ZXJlZE1vZGlmaWVyc1tsLmNsYXNzXSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9kaWZpZXIgXCIgKyBsLmNsYXNzICsgXCIgbm90IGRlZmluZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtb2RpZmllciA9IG5ldyByZWdpc3RlcmVkTW9kaWZpZXJzW2wuY2xhc3NdKGwpO1xuICAgICAgICBtb2RpZmllci5zdWJvcmRlciA9IGk7XG4gICAgICAgIG1vZGlmaWVycy5wdXNoKG1vZGlmaWVyKTtcbiAgICB9KTtcblxuICAgIG1vZGlmaWVycyA9IF8uc29ydEJ5QWxsKG1vZGlmaWVycywgW1wiZXhlY09yZGVyXCIsIFwiZXhlY1N1Yk9yZGVyXCIsIFwic3Vib3JkZXJcIl0pO1xuXG4gICAgXy5lYWNoKG1vZGlmaWVycywgZnVuY3Rpb24obSkge1xuICAgICAgICBtLm1vZGlmeShzZWxmLnRvdGFsLCBzZWxmLm9wdGlvbnMpO1xuICAgIH0pO1xuXG4gICAgc29ydFRyZWUoc2VsZi50b3RhbCk7XG5cbiAgICBjYWxjVG90YWwoc2VsZi50b3RhbCk7XG4gICAgcm91bmRJbXBvcnRzKHNlbGYudG90YWwpO1xuXG4gICAgc2VsZi50cmVlVmFsaWQgPSB0cnVlO1xuICAgIHJldHVybiBzZWxmLnRvdGFsO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuXG5cbi8qXG4vLyBWSVNVQUxJWkFUSU9OIEZMQUdTIElOIEVBQ0ggTk9ERVxuICAgIHNob3dJZlplcm86ICAgICAgICAgU2hvdyBldmVuIGlmIFRvdGFsIGlzIHplcm9cbiAgICBpZk9uZUhpZGVQYXJlbnQ6ICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhpcyBncm91cCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2UgaXQgd2l0aCB0aGUgY2hhbGRcbiAgICBpZk9uZUhpZGVDaGlsZDogICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhlIGNoaWxkXG4gICAgaGlkZVRvdGFsOiAgICAgICAgICBKdXN0IHJlbW92ZSAgdGhlIHRvdGFsIGFuZCBwdXQgYWxsIHRoZSBjaGlsZHNcbiAgICB0b3RhbE9uQm90dG9tOiAgICAgICAgIFB1dCB0aGUgVG90YWwgb24gdGhlIGRvcFxuICAgIGhpZGVEZXRhaWw6ICAgICAgICAgRG8gbm90IHNob3cgdGhlIGRldGFpbHNcbiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbmRlck5vZGUobm9kZSwgbGV2ZWwpIHtcblxuICAgICAgICB2YXIgcmVuZGVyVG90YWwgPSB0cnVlO1xuICAgICAgICB2YXIgcmVuZGVyRGV0YWlsID0gdHJ1ZTtcbiAgICAgICAgaWYgKCghbm9kZS5zaG93SWZaZXJvKSAmJiAobm9kZS5pbXBvcnQgPT09IDApKSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICBpZiAoKG5vZGUuY2hpbGRzKSYmKG5vZGUuY2hpbGRzLmxlbmd0aCA9PT0gMSkmJighbm9kZS5oaWRlRGV0YWlsKSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlUGFyZW50KSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlQ2hpbGQpIHJlbmRlckRldGFpbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlLmhpZGVEZXRhaWwpIHJlbmRlckRldGFpbD0gZmFsc2U7XG4gICAgICAgIGlmIChub2RlLmhpZGVUb3RhbCkgcmVuZGVyVG90YWw9ZmFsc2U7XG5cbiAgICAgICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKG5vZGUpO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5jaGlsZHM7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLnNob3dJZlplcm87XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmhpZGVEZXRhaWw7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmhpZGVUb3RhbDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaWZPbmVIaWRlUGFyZW50O1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5pZk9uZUhpZGVDaGlsZDtcbiAgICAgICAgbmV3Tm9kZS5sZXZlbCA9IGxldmVsO1xuXG4gICAgICAgIGlmICgocmVuZGVyVG90YWwpICYmICghbm9kZS50b3RhbE9uQm90dG9tKSkge1xuICAgICAgICAgICAgc2VsZi5yZW5kZXJSZXN1bHQucHVzaChuZXdOb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZW5kZXJEZXRhaWwpIHtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24oY2hpbGROb2RlKSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyTm9kZShjaGlsZE5vZGUsIHJlbmRlclRvdGFsID8gbGV2ZWwgKzEgOiBsZXZlbCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHJlbmRlclRvdGFsKSAmJiAobm9kZS50b3RhbE9uQm90dG9tKSkge1xuICAgICAgICAgICAgc2VsZi5yZW5kZXJSZXN1bHQucHVzaChuZXdOb2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLnJlbmRlclZhbGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnJlbmRlclJlc3VsdDtcbiAgICB9XG5cbiAgICBzZWxmLnJlbmRlclJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICByZW5kZXJOb2RlKHNlbGYudG90YWwsIDApO1xuXG4gICAgc2VsZi5yZW5kZXJWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYucmVuZGVyUmVzdWx0O1xufTtcblxuXG5QcmljZTIucHJvdG90eXBlLnJlbmRlclRyZWUgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuXG5cbi8qXG4vLyBWSVNVQUxJWkFUSU9OIEZMQUdTIElOIEVBQ0ggTk9ERVxuICAgIHNob3dJZlplcm86ICAgICAgICAgU2hvdyBldmVuIGlmIFRvdGFsIGlzIHplcm9cbiAgICBpZk9uZUhpZGVQYXJlbnQ6ICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhpcyBncm91cCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2UgaXQgd2l0aCB0aGUgY2hhbGRcbiAgICBpZk9uZUhpZGVDaGlsZDogICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhlIGNoaWxkXG4gICAgaGlkZVRvdGFsOiAgICAgICAgICBKdXN0IHJlbW92ZSAgdGhlIHRvdGFsIGFuZCBwdXQgYWxsIHRoZSBjaGlsZHNcbiAgICB0b3RhbE9uQm90dG9tOiAgICAgICAgIFB1dCB0aGUgVG90YWwgb24gdGhlIGRvcFxuICAgIGhpZGVEZXRhaWw6ICAgICAgICAgRG8gbm90IHNob3cgdGhlIGRldGFpbHNcbiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbmRlclRyZWVOb2RlKG5vZGUsIHBhcmVudE5vZGUpIHtcblxuXG4gICAgICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZShub2RlKTtcbiAgICAgICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcblxuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgcmVuZGVyVHJlZU5vZGUoY2hpbGROb2RlLCBuZXdOb2RlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJlbmRlclRvdGFsID0gdHJ1ZTtcbiAgICAgICAgdmFyIHJlbmRlckRldGFpbCA9IHRydWU7XG4gICAgICAgIGlmICgoIW5vZGUuc2hvd0lmWmVybykgJiYgKG5vZGUuaW1wb3J0ID09PSAwKSkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgaWYgKChuZXdOb2RlLmNoaWxkcy5sZW5ndGggPT09IDEpJiYoIW5vZGUuaGlkZURldGFpbCkpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZVBhcmVudCkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZUNoaWxkKSByZW5kZXJEZXRhaWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS5oaWRlRGV0YWlsKSByZW5kZXJEZXRhaWw9IGZhbHNlO1xuICAgICAgICBpZiAobm9kZS5oaWRlVG90YWwpIHJlbmRlclRvdGFsPWZhbHNlO1xuXG4gICAgICAgIC8vICAgICAgICAgICAgbmV3Tm9kZS5wYXJlbnQgPSBwYXJlbnROb2RlO1xuXG4gICAgICAgIGlmICghcmVuZGVyRGV0YWlsKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcyA9IFtdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAocmVuZGVyVG90YWwpIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnJlbmRlclRyZWVSZXN1bHQgPSBuZXdOb2RlO1xuICAgICAgICAgICAgICAgIG5ld05vZGUubGV2ZWw9MDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZS5sZXZlbCA9IHBhcmVudE5vZGUubGV2ZWwgKzE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0ge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBoaWRlVG90YWw6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5lYWNoKG5ld05vZGUuY2hpbGRzLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZS5jaGlsZHMucHVzaChuKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBpZiAoc2VsZi5yZW5kZXJUcmVlVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyVHJlZVJlc3VsdDtcbiAgICB9XG5cbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHNlbGYucmVuZGVyVHJlZVJlc3VsdCA9IG51bGw7XG5cbiAgICByZW5kZXJUcmVlTm9kZShzZWxmLnRvdGFsLCBudWxsKTtcblxuICAgIHNlbGYucmVuZGVyVHJlZVZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi5yZW5kZXJUcmVlUmVzdWx0O1xufTtcblxuZnVuY3Rpb24gZmluZE5vZGUobm9kZSwgaWQpIHtcbiAgICB2YXIgaTtcbiAgICBpZiAoIW5vZGUpIHJldHVybiBudWxsO1xuICAgIGlmIChub2RlLmlkID09PSBpZCkgcmV0dXJuIG5vZGU7XG4gICAgaWYgKCFub2RlLmNoaWxkcykgcmV0dXJuIG51bGw7XG4gICAgZm9yIChpPTA7IGk8bm9kZS5jaGlsZHMubGVuZ3RoOyBpKz0xKSB7XG4gICAgICAgIHZhciBmTm9kZSA9IGZpbmROb2RlKG5vZGUuY2hpbGRzW2ldLCBpZCk7XG4gICAgICAgIGlmIChmTm9kZSkgcmV0dXJuIGZOb2RlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuUHJpY2UyLnByb3RvdHlwZS5nZXRJbXBvcnQgPSBmdW5jdGlvbihpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZCA9IGlkIHx8IFwidG90YWxcIjtcbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHZhciBub2RlID0gZmluZE5vZGUoc2VsZi50b3RhbCwgaWQpO1xuXG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuaW1wb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cblByaWNlMi5wcm90b3R5cGUuYWRkQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGF0cmlidXRlKSB7XG4gICAgdmFyIHNlbGY9dGhpcztcbiAgICB2YXIgYXR0cnM7XG4gICAgaWYgKHR5cGVvZiBhdHJpYnV0ZSA9PT0gXCJzdHJpbmdcIiApIHtcbiAgICAgICAgYXR0cnMgPSBbYXRyaWJ1dGVdO1xuICAgIH0gZWxzZSBpZiAoYXRyaWJ1dGUgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBhdHRycyA9IGF0cmlidXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgQXR0cmlidXRlXCIpO1xuICAgIH1cbiAgICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgXy5lYWNoKHNlbGYubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgIGlmICghbC5hdHRyaWJ1dGVzKSBsLmF0dHJpYnV0ZXMgPSBbXTtcbiAgICAgICAgICAgIGlmICghXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIGEpKSB7XG4gICAgICAgICAgICAgICAgbC5hdHRyaWJ1dGVzLnB1c2goYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqLmxpbmVzID0gXy5tYXAodGhpcy5saW5lcywgXy5jbG9uZSk7XG4gICAgXy5lYWNoKG9iai5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICBpZiAodHlwZW9mIGwuZnJvbSA9PT0gXCJudW1iZXJcIikgbC5mcm9tID0gZHUuaW50MmRhdGUobC5mcm9tKTtcbiAgICAgICAgaWYgKHR5cGVvZiBsLnRvID09PSBcIm51bWJlclwiKSBsLnRvID0gZHUuaW50MmRhdGUobC50byk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbn07XG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZTI7XG5cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG4vKlxuXG5BZ3JlZ2F0ZSBNb2RpZmllclxuPT09PT09PT09PT09PT09PT1cblxuICAgIGdyb3VwQnkgICAgICAgICAgICAgRmxhZyBvZiB0aGUgbGluZXMgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWRcbiAgICBleGVjT3JkZXIgICAgICAgICAgIE9yZGVyIGluIHdoaWNoIHRoaXMgbW9kaWZpZXIgaSBleGNldnV0ZWQuXG5cbn1cblxuKi9cblxudmFyIFByaWNlQWdyZWdhdG9yID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA1O1xuICAgIHRoaXMuZ3JvdXBCeSA9IGxpbmUuZ3JvdXBCeTtcbn07XG5cblByaWNlQWdyZWdhdG9yLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZSh0aGlzLmxpbmUpO1xuICAgIG5ld05vZGUuY2hpbGRzID0gW107XG4gICAgdmFyIGksbDtcbiAgICBmb3IgKGk9MDsgaTx0cmVlLmNoaWxkcy5sZW5ndGg7IGkrPTEpIHtcbiAgICAgICAgbD10cmVlLmNoaWxkc1tpXTtcbiAgICAgICAgaWYgKF8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBzZWxmLmdyb3VwQnkpKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcy5wdXNoKGwpO1xuICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgIGktPTE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdHJlZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VBZ3JlZ2F0b3I7XG5cblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgZHU9IHJlcXVpcmUoXCIuL2RhdGVfdXRpbHMuanNcIik7XG5cbi8qXG5cbkRpc2NvdW50IE1vZGlmaWVyXG49PT09PT09PT09PT09PT09PVxuXG4gICAgcGhhc2UgICAgICAgICAgICAgRmxhZyBvZiB0aGUgbGluZXMgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWRcbiAgICBleGVjT3JkZXIgICAgICAgICAgIE9yZGVyIGluIHdoaWNoIHRoaXMgbW9kaWZpZXIgaSBleGNldnV0ZWQuXG4gICAgcnVsZXMgICAgICAgICAgICAgIEFycmF5IG9mIHJ1bGVzXG5cblxuXG59XG5cbiovXG5cbnZhciBQcmljZURpc2NvdW50ID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMuZXhlY1N1Ym9yZGVyID0gbGluZS5waGFzZTtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgNTtcblxufTtcblxuUHJpY2VEaXNjb3VudC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSwgb3B0aW9ucykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gcnVsZURvZXNBcHBseSAocnVsZSkge1xuICAgICAgICB2YXIgaVJlc2VydmF0aW9uID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5yZXNlcnZhdGlvbik7XG4gICAgICAgIGlmICgocnVsZS5yZXNlcnZhdGlvbk1pbikmJihpUmVzZXJ2YXRpb24gPCBkdS5kYXRlMmludChydWxlLnJlc2VydmF0aW9uTWluKSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLnJlc2VydmF0aW9uTWF4KSYmKGlSZXNlcnZhdGlvbiA+IGR1LmRhdGUyaW50KHJ1bGUucmVzZXJ2YXRpb25NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgaUNoZWNraW4gPSBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgaUNoZWNrb3V0ID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGlmICgocnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbikmJiggaUNoZWNraW4gLSBpUmVzZXJ2YXRpb24gPCBydWxlLmRheXNCZWZvcmVDaGVja2luTWluICkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmRheXNCZWZvcmVDaGVja2luTWluIHx8IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW49PT0wKSYmKCBpQ2hlY2tpbiAtIGlSZXNlcnZhdGlvbiA+IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NYXggKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1pbikmJiggaUNoZWNraW4gPCBkdS5kYXRlMmludChydWxlLmNoZWNraW5NaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1heCkmJiggaUNoZWNraW4gPiBkdS5kYXRlMmludChydWxlLmNoZWNraW5NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNaW4pJiYoIGlDaGVja291dCA8IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNYXgpJiYoIGlDaGVja291dCA+IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUubWluU3RheSkmJiggaUNoZWNrb3V0IC0gaUNoZWNraW4gPCBydWxlLm1pblN0YXkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5tYXhTdGF5IHx8IHJ1bGUubWF4U3RheT09PTApJiYoIGlDaGVja291dCAtIGlDaGVja2luIDwgcnVsZS5tYXhTdGF5KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHByb3BvcnRpb25BcHBseShpSW4sIGlPdXQsIGlBcHBseUZyb20sIGlBcHBseVRvKSB7XG4gICAgICAgIHZhciBhID0gaUluID4gaUFwcGx5RnJvbSA/IGlJbiA6IGlBcHBseUZyb207XG4gICAgICAgIHZhciBiID0gaU91dCA8IGlBcHBseVRvID8gaU91dCA6IGlBcHBseVRvO1xuICAgICAgICBpZiAoYj5hKSByZXR1cm4gMDtcbiAgICAgICAgcmV0dXJuIChiLWEpLyhpT3V0LWlJbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGluZUZyb21SdWxlKHJ1bGUpIHtcbiAgICAgICAgdmFyIG5ld0xpbmUgPSBfLmNsb25lKHNlbGYubGluZSk7XG4gICAgICAgIHZhciBwcm9wb3J0aW9uO1xuICAgICAgICB2YXIgdmF0ID0wO1xuICAgICAgICB2YXIgYmFzZSA9MDtcbiAgICAgICAgdmFyIHRvdGFsSW1wb3J0ID0wO1xuXG4gICAgICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgaWYgKCEgXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIHJ1bGUuYXBwbHlJZENvbmNlcHRBdHJpYnV0ZSkpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChsLmJhc2VJbXBvcnQpIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHJ1bGUuYXBwbGljYXRpb25UeXBlID09PSBcIldIT0xFXCIpIHtcbiAgICAgICAgICAgICAgICBwcm9wb3J0aW9uID0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvcG9ydGlvbiA9IHByb3BvcnRpb25BcHBseShcbiAgICAgICAgICAgICAgICAgICAgbC5mcm9tID8gZHUuZGF0ZTJpbnQobC5mcm9tKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbiksXG4gICAgICAgICAgICAgICAgICAgIGwudG8gPyBkdS5kYXRlMmludChsLnRvKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tvdXQpLFxuICAgICAgICAgICAgICAgICAgICBkdS5kYXRlMmludChydWxlLmFwcGx5RnJvbSksXG4gICAgICAgICAgICAgICAgICAgIGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlUbykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbFZhdCA9IDA7XG4gICAgICAgICAgICBfLmVhY2gobC50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxWYXQgPSB0YXguUEM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhdCA9ICh2YXQqYmFzZSArIGxWYXQqbC5iYXNlSW1wb3J0ICogcHJvcG9ydGlvbikgLyAoYmFzZSArIGwuYmFzZUltcG9ydCAqIHByb3BvcnRpb24pO1xuICAgICAgICAgICAgYmFzZSA9IGJhc2UgKyBsLmJhc2VJbXBvcnQgKiBwcm9wb3J0aW9uO1xuICAgICAgICAgICAgdG90YWxJbXBvcnQgKz0gbC5pbXBvcnQgKiBwcm9wb3J0aW9uO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZXdMaW5lLmJhc2VJbXBvcnQgPSBiYXNlICogKCAxLSBydWxlLmFwcGx5RGlzY291bnRQQy8xMDApO1xuICAgICAgICBuZXdMaW5lLmltcG9ydCA9IGJhc2UgKiAoIDEtIHJ1bGUuYXBwbHlEaXNjb3VudFBDLzEwMCk7XG5cbiAgICAgICAgbmV3TGluZS50YXhlcyA9IG5ld0xpbmUudGF4ZXMgfHwgW107XG5cbiAgICAgICAgdmFyIHRheCA9IF8uZmluZFdoZXJlKG5ld0xpbmUudGF4ZXMse3R5cGU6IFwiVkFUXCJ9KTtcbiAgICAgICAgaWYgKCF0YXgpIHtcbiAgICAgICAgICAgIHRheCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlZBVFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbmV3TGluZS50YXhlcy5wdXNoID0gdGF4O1xuICAgICAgICB9XG4gICAgICAgIHRheC5QQyA9IHZhdDtcblxuICAgICAgICByZXR1cm4gbmV3TGluZTtcbiAgICB9XG5cblxuICAgIHZhciBzYW1lUGhhc2VEaXNjb3VudHMgPSBbXTtcbiAgICB2YXIgcG9zdHBvbmVkRGlzY291bnRzID0gW107XG5cbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAobC5jbGFzcyA9PT0gXCJESVNDT1VOVFwiKSB7XG4gICAgICAgICAgICBpZiAobC5waGFzZSA9PT0gc2VsZi5saW5lLnBoYXNlKSB7IC8vIFJlbW92ZSBhbmQgZ2V0IHRoZSBiZXN0XG4gICAgICAgICAgICAgICAgc2FtZVBoYXNlRGlzY291bnRzLnB1c2gobCk7XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHMucG9wKCk7XG4gICAgICAgICAgICAgICAgaS09MTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobC5waGFzZSA+IHNlbGYubGluZS5waGFzZSkgeyAvLyBSZW1vdmUgYW5kIHJlcHJjZXNzICBsYXRlclxuICAgICAgICAgICAgICAgIHBvc3Rwb25lZERpc2NvdW50cy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzW2ldID0gdHJlZS5jaGlsZHNbdHJlZS5jaGlsZHMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGktPTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYXBwbGllZFJ1bGVzID0gXy5maWx0ZXIodGhpcy5ydWxlcywgcnVsZURvZXNBcHBseSk7XG5cbiAgICB2YXIgYmVzdExpbmUgPSBfLnJlZHVjZShhcHBsaWVkUnVsZXMsIGZ1bmN0aW9uKGJlc3RMaW5lLCBydWxlKSB7XG4gICAgICAgIHZhciBsID0gbGluZUZyb21SdWxlKHJ1bGUpO1xuICAgICAgICBpZiAoIWJlc3RMaW5lKSByZXR1cm4gbDtcbiAgICAgICAgcmV0dXJuIChsLmltcG9ydCA8IGJlc3RMaW5lLmltcG9ydCkgPyBsIDogYmVzdExpbmU7XG4gICAgfSk7XG5cbiAgICBpZiAoYmVzdExpbmUpIHtcbiAgICAgICAgc2FtZVBoYXNlRGlzY291bnRzLnB1c2goYmVzdExpbmUpO1xuXG4gICAgICAgIHZhciBiZXN0TGluZUluUGhhc2UgPSBfLnJlZHVjZShzYW1lUGhhc2VEaXNjb3VudHMsIGZ1bmN0aW9uKGJlc3RMaW5lLCBsaW5lKSB7XG4gICAgICAgICAgICBpZiAoIWxpbmUpIHJldHVybiBiZXN0TGluZTtcbiAgICAgICAgICAgIHJldHVybiAobGluZS5pbXBvcnQgPCBiZXN0TGluZS5pbXBvcnQpID8gbGluZSA6IGJlc3RMaW5lO1xuICAgICAgICB9KTtcblxuICAgICAgICB0cmVlLmNoaWxkcy5wdXNoKGJlc3RMaW5lSW5QaGFzZSk7XG5cbiAgICAgICAgcG9zdHBvbmVkRGlzY291bnRzID0gXy5zb3J0QnkocG9zdHBvbmVkRGlzY291bnRzLCAncGhhc2UnKTtcbiAgICB9XG5cbiAgICBfLmVhY2gocG9zdHBvbmVkRGlzY291bnRzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIHZhciBtb2RpZmllciA9IG5ldyBQcmljZURpc2NvdW50KGwpO1xuICAgICAgICBtb2RpZmllci5hcHBseSh0cmVlLCBvcHRpb25zKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VEaXNjb3VudDtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgUHJpY2VMaW5lID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCAwO1xufTtcblxuUHJpY2VMaW5lLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIGwgPSBfLmNsb25lKHRoaXMubGluZSk7XG5cbiAgICB2YXIgcHJpY2UgPSBsLnByaWNlO1xuXG4gICAgbC5pbXBvcnQgPSBsLnByaWNlICogbC5xdWFudGl0eTtcbiAgICBpZiAoIWlzTmFOKGwucGVyaW9kcykpIHtcbiAgICAgICAgbC5pbXBvcnQgPSBsLmltcG9ydCAqIGwucGVyaW9kcztcbiAgICB9XG5cbiAgICBpZiAobC5kaXNjb3VudCkge1xuICAgICAgICBsLmltcG9ydCA9IGwuaW1wb3J0ICogKDEgLSBsLmRpc2NvdW50LzEwMCk7XG4gICAgfVxuXG4gICAgbC5iYXNlSW1wb3J0ID0gbC5pbXBvcnQ7XG5cbiAgICB0cmVlLmNoaWxkcy5wdXNoKGwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUxpbmU7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxudmFyIFByaWNlVmF0SW5jbHVkZWQgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDk7XG59O1xuXG5QcmljZVZhdEluY2x1ZGVkLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG5cbiAgICBmdW5jdGlvbiBhcHBseVZhdE5vZGUobm9kZSkge1xuICAgICAgICBfLmVhY2gobm9kZS50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICBpZiAodGF4LnR5cGUgPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlLmltcG9ydCA9IG5vZGUuaW1wb3J0ICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgICAgICBub2RlLnByaWNlID0gbm9kZS5wcmljZSAqICgxICsgdGF4LlBDLzEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGFwcGx5VmF0Tm9kZSk7XG4gICAgfVxuXG4gICAgYXBwbHlWYXROb2RlKHRyZWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZVZhdEluY2x1ZGVkO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJvdW5kKHZhbCwgcm91bmRpbmdUeXBlLCByb3VuZGluZykge1xuICAgIHZhciB2O1xuICAgIGlmICgoIXJvdW5kaW5nVHlwZSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJOT05FXCIpKSB7XG4gICAgICAgIHYgPSBNYXRoLnJvdW5kKHZhbCAvIDAuMDEpICogMC4wMTtcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDEpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiRkxPT1JcIikpIHtcbiAgICAgICAgdj0gTWF0aC5mbG9vcih2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDIpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiUk9VTkRcIikpIHtcbiAgICAgICAgdj0gTWF0aC5yb3VuZCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDMpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiQ0VJTFwiKSkge1xuICAgICAgICB2PSBNYXRoLmNlaWwodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCByb3VuZGluZ1R5cGU6IHJvdW5kaW5nVHlwZVwiKTtcbiAgICB9XG4gICAgcmV0dXJuICsoTWF0aC5yb3VuZCh2ICsgXCJlKzJcIikgICsgXCJlLTJcIik7XG59O1xuIl19
