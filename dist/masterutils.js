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
        if (typeof d === "string") {
            d = new Date(d);
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
        Price:  null,
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
},{"./creditcard.js":1,"./date_utils.js":2,"./price2.js":4,"./round.js":9}],4:[function(require,module,exports){
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

    function setLevel(node, level) {
        node.level = level;
        _.each(node.childs, function(n) {
            setLevel(n, level+1);
        });
    }

    if (self.renderTreeValid) {
        return self.renderTreeResult;
    }

    self.constructTree();

    self.renderTreeResult = null;

    renderTreeNode(self.total, null);

    setLevel(self.renderTreeResult, 0);

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
},{"./date_utils":2,"./price_agregator.js":5,"./price_discount.js":6,"./price_line.js":7,"./price_vatincluded.js":8,"./round":9}],5:[function(require,module,exports){
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
/*
    function lineFromRule(rule) {
        var newLine = _.clone(self.line);
        var proportion;
        var vat =0;
        var base =0;
        var totalImport =0;

        _.each(tree.childs, function(l) {
            if (! _.contains(l.attributes, rule.applyIdConceptAtribute)) return;
            if (! l.baseImport) return;

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
*/

    function daysInRule(line, rule) {
        var a,b,i;
        var days = [];
        var lFrom = l.from ? du.date2int(l.from) : du.date2int(options.checkin);
        var lTo = l.to ? du.date2int(l.to) : du.date2int(options.checkout);
        if (rule.applicationType === "WHOLE") {
            a = lFrom;
            b = lTo;
        } else if (rule.applicationType === "BYDAY") {
            var rFrom = du.date2int(rule.applyFrom);
            var rTo = du.date2int(rule.applyTo);

            a = Math.max(rFrom, lFrom);
            b = Math.min(rTo, lTo);
        }
        for (i=a; i<b; i+=1) {
            days.push(i);
        }
        return days;
    }

    function daysInLine(line) {
        var i;
        var days = [];
        var lFrom = l.from ? du.date2int(l.from) : du.date2int(options.checkin);
        var lTo = l.to ? du.date2int(l.to) : du.date2int(options.checkout);
        for (i=lFrom; i<lTo; i+=1) {
            days.push(i);
        }
        return days;
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

    var appliedRules = _.filter(self.line.rules, ruleDoesApply);

    // This hash contains the best discount for each line and day
    // discountPerDay['3|18475']= 15 Means that the line tree[3] will applys
    // a 15% discount at day 18475
    var discountPerDay = {};
    _.each(appliedRules, function(rule) {
        _.each(tree.childs, function(l, lineIdx) {
            _.each(daysInRule(l, rule), function(d) {
                var k= lineIdx+'|'+d;
                if (!discountPerDay[k]) discountPerDay[k]=0;
                discountPerDay[k] = Math.max(discountPerDay[k], rule.applyDiscountPC);
            });
        });
    });

    var vat =0;
    var base =0;
    var totalImport =0;

    _.each(tree.childs, function(l, lineIdx) {
        var dsc=0;
        var n =0;
        _.each(daysInLine(l), function(d) {
            var k= lineIdx+'|'+d;
            if (discountPerDay[k]) {
                dsc += discountPerDay[k];
            }
            n+=1;
        });
        if (n === 0) return;
        dsc = dsc / n;

        var lVat = 0;
        _.each(l.taxes, function(tax) {
            if (tax.type === "VAT") {
                lVat = tax.PC;
            }
        });

        vat = (vat*base + lVat*l.baseImport*dsc/100) / (base + l.baseImport*dsc/100);
        base = base + l.baseImport * dsc/100;
        totalImport = totalImport + l.import * dsc/100;
    });

    var bestLine = _.clone(self.line);

    bestLine.baseImport = -base;
    bestLine.basePrice = -base;
    bestLine.import = -totalImport;
    bestLine.quantity = 1;
    bestLine.class = "LINE";

    bestLine.taxes = bestLine.taxes || [];

    var tax = _.findWhere(bestLine.taxes,{type: "VAT"});
    if (!tax) {
        tax = {
            type: "VAT"
        };
        bestLine.taxes.push(tax);
    }
    tax.PC = vat;

    samePhaseDiscounts.push(bestLine);

    var bestLineInPhase = _.reduce(samePhaseDiscounts, function(bestLine, line) {
        if (!line) return bestLine;
        return (line.import < bestLine.import) ? line : bestLine;
    });

    tree.childs.push(bestLineInPhase);

    postponedDiscounts = _.sortBy(postponedDiscounts, 'phase');

    _.each(postponedDiscounts, function(l) {
        var modifier = new PriceDiscount(l);
        modifier.apply(tree, options);
    });
};

module.exports = PriceDiscount;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils.js":2}],7:[function(require,module,exports){
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
    l.basePrice = l.price;

    tree.childs.push(l);
};

module.exports = PriceLine;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvY3JlZGl0Y2FyZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2RhdGVfdXRpbHMuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9mYWtlXzZjZDkwNTcxLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2UyLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfYWdyZWdhdG9yLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfZGlzY291bnQuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV9saW5lLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfdmF0aW5jbHVkZWQuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9yb3VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cclxuXHJcbi8qXHJcblxyXG5UaGlzIHJvdXRpbmUgY2hlY2tzIHRoZSBjcmVkaXQgY2FyZCBudW1iZXIuIFRoZSBmb2xsb3dpbmcgY2hlY2tzIGFyZSBtYWRlOlxyXG5cclxuMS4gQSBudW1iZXIgaGFzIGJlZW4gcHJvdmlkZWRcclxuMi4gVGhlIG51bWJlciBpcyBhIHJpZ2h0IGxlbmd0aCBmb3IgdGhlIGNhcmRcclxuMy4gVGhlIG51bWJlciBoYXMgYW4gYXBwcm9wcmlhdGUgcHJlZml4IGZvciB0aGUgY2FyZFxyXG40LiBUaGUgbnVtYmVyIGhhcyBhIHZhbGlkIG1vZHVsdXMgMTAgbnVtYmVyIGNoZWNrIGRpZ2l0IGlmIHJlcXVpcmVkXHJcblxyXG5JZiB0aGUgdmFsaWRhdGlvbiBmYWlscyBhbiBlcnJvciBpcyByZXBvcnRlZC5cclxuXHJcblRoZSBzdHJ1Y3R1cmUgb2YgY3JlZGl0IGNhcmQgZm9ybWF0cyB3YXMgZ2xlYW5lZCBmcm9tIGEgdmFyaWV0eSBvZiBzb3VyY2VzIG9uIHRoZSB3ZWIsIGFsdGhvdWdoIHRoZSBcclxuYmVzdCBpcyBwcm9iYWJseSBvbiBXaWtlcGVkaWEgKFwiQ3JlZGl0IGNhcmQgbnVtYmVyXCIpOlxyXG5cclxuICBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NyZWRpdF9jYXJkX251bWJlclxyXG5cclxuUGFyYW1ldGVyczpcclxuICAgICAgICAgICAgY2FyZG51bWJlciAgICAgICAgICAgbnVtYmVyIG9uIHRoZSBjYXJkXHJcbiAgICAgICAgICAgIGNhcmRuYW1lICAgICAgICAgICAgIG5hbWUgb2YgY2FyZCBhcyBkZWZpbmVkIGluIHRoZSBjYXJkIGxpc3QgYmVsb3dcclxuXHJcbkF1dGhvcjogICAgIEpvaG4gR2FyZG5lclxyXG5EYXRlOiAgICAgICAxc3QgTm92ZW1iZXIgMjAwM1xyXG5VcGRhdGVkOiAgICAyNnRoIEZlYi4gMjAwNSAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgYnkgcmVxdWVzdFxyXG5VcGRhdGVkOiAgICAyN3RoIE5vdi4gMjAwNiAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgZnJvbSBXaWtpcGVkaWFcclxuVXBkYXRlZDogICAgMTh0aCBKYW4uIDIwMDggICAgICBBZGRpdGlvbmFsIGNhcmRzIGFkZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDI2dGggTm92LiAyMDA4ICAgICAgTWFlc3RybyBjYXJkcyBleHRlbmRlZFxyXG5VcGRhdGVkOiAgICAxOXRoIEp1bi4gMjAwOSAgICAgIExhc2VyIGNhcmRzIGV4dGVuZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDExdGggU2VwLiAyMDEwICAgICAgVHlwb3MgcmVtb3ZlZCBmcm9tIERpbmVycyBhbmQgU29sbyBkZWZpbml0aW9ucyAodGhhbmtzIHRvIE5vZSBMZW9uKVxyXG5VcGRhdGVkOiAgICAxMHRoIEFwcmlsIDIwMTIgICAgIE5ldyBtYXRjaGVzIGZvciBNYWVzdHJvLCBEaW5lcnMgRW5yb3V0ZSBhbmQgU3dpdGNoXHJcblVwZGF0ZWQ6ICAgIDE3dGggT2N0b2JlciAyMDEyICAgRGluZXJzIENsdWIgcHJlZml4IDM4IG5vdCBlbmNvZGVkXHJcblxyXG4qL1xyXG5cclxuLypcclxuICAgSWYgYSBjcmVkaXQgY2FyZCBudW1iZXIgaXMgaW52YWxpZCwgYW4gZXJyb3IgcmVhc29uIGlzIGxvYWRlZCBpbnRvIHRoZSBnbG9iYWwgY2NFcnJvck5vIHZhcmlhYmxlLlxyXG4gICBUaGlzIGNhbiBiZSBiZSB1c2VkIHRvIGluZGV4IGludG8gdGhlIGdsb2JhbCBlcnJvciAgc3RyaW5nIGFycmF5IHRvIHJlcG9ydCB0aGUgcmVhc29uIHRvIHRoZSB1c2VyXHJcbiAgIGlmIHJlcXVpcmVkOlxyXG5cclxuICAgZS5nLiBpZiAoIWNoZWNrQ3JlZGl0Q2FyZCAobnVtYmVyLCBuYW1lKSBhbGVydCAoY2NFcnJvcnMoY2NFcnJvck5vKTtcclxuKi9cclxuXHJcbnZhciBjY0Vycm9yTm8gPSAwO1xyXG52YXIgY2NFcnJvcnMgPSBbXTtcclxuXHJcbmNjRXJyb3JzIFswXSA9IFwiVW5rbm93biBjYXJkIHR5cGVcIjtcclxuY2NFcnJvcnMgWzFdID0gXCJObyBjYXJkIG51bWJlciBwcm92aWRlZFwiO1xyXG5jY0Vycm9ycyBbMl0gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBpcyBpbiBpbnZhbGlkIGZvcm1hdFwiO1xyXG5jY0Vycm9ycyBbM10gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBpcyBpbnZhbGlkXCI7XHJcbmNjRXJyb3JzIFs0XSA9IFwiQ3JlZGl0IGNhcmQgbnVtYmVyIGhhcyBhbiBpbmFwcHJvcHJpYXRlIG51bWJlciBvZiBkaWdpdHNcIjtcclxuY2NFcnJvcnMgWzVdID0gXCJXYXJuaW5nISBUaGlzIGNyZWRpdCBjYXJkIG51bWJlciBpcyBhc3NvY2lhdGVkIHdpdGggYSBzY2FtIGF0dGVtcHRcIjtcclxuXHJcbmZ1bmN0aW9uIGNoZWNrQ3JlZGl0Q2FyZCAoY2FyZG51bWJlcikge1xyXG5cclxuICAvLyBBcnJheSB0byBob2xkIHRoZSBwZXJtaXR0ZWQgY2FyZCBjaGFyYWN0ZXJpc3RpY3NcclxuICB2YXIgY2FyZHMgPSBbXTtcclxuXHJcbiAgLy8gRGVmaW5lIHRoZSBjYXJkcyB3ZSBzdXBwb3J0LiBZb3UgbWF5IGFkZCBhZGR0aW9uYWwgY2FyZCB0eXBlcyBhcyBmb2xsb3dzLlxyXG4gIC8vICBOYW1lOiAgICAgICAgIEFzIGluIHRoZSBzZWxlY3Rpb24gYm94IG9mIHRoZSBmb3JtIC0gbXVzdCBiZSBzYW1lIGFzIHVzZXInc1xyXG4gIC8vICBMZW5ndGg6ICAgICAgIExpc3Qgb2YgcG9zc2libGUgdmFsaWQgbGVuZ3RocyBvZiB0aGUgY2FyZCBudW1iZXIgZm9yIHRoZSBjYXJkXHJcbiAgLy8gIHByZWZpeGVzOiAgICAgTGlzdCBvZiBwb3NzaWJsZSBwcmVmaXhlcyBmb3IgdGhlIGNhcmRcclxuICAvLyAgY2hlY2tkaWdpdDogICBCb29sZWFuIHRvIHNheSB3aGV0aGVyIHRoZXJlIGlzIGEgY2hlY2sgZGlnaXRcclxuXHJcbiAgY2FyZHMgWzBdID0ge25hbWU6IFwiVmlzYVwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTMsMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNFwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMV0gPSB7bmFtZTogXCJNYXN0ZXJDYXJkXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI1MSw1Miw1Myw1NCw1NVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMl0gPSB7bmFtZTogXCJEaW5lcnNDbHViXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNCwxNlwiLCBcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzYsMzgsNTQsNTVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzNdID0ge25hbWU6IFwiQ2FydGVCbGFuY2hlXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNFwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzMDAsMzAxLDMwMiwzMDMsMzA0LDMwNVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNF0gPSB7bmFtZTogXCJBbUV4XCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNCwzN1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNV0gPSB7bmFtZTogXCJEaXNjb3ZlclwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjAxMSw2MjIsNjQsNjVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzZdID0ge25hbWU6IFwiSkNCXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbN10gPSB7bmFtZTogXCJlblJvdXRlXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIyMDE0LDIxNDlcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzhdID0ge25hbWU6IFwiU29sb1wiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjMzNCw2NzY3XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs5XSA9IHtuYW1lOiBcIlN3aXRjaFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNDkwMyw0OTA1LDQ5MTEsNDkzNiw1NjQxODIsNjMzMTEwLDYzMzMsNjc1OVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTBdID0ge25hbWU6IFwiTWFlc3Ryb1wiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTIsMTMsMTQsMTUsMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNTAxOCw1MDIwLDUwMzgsNjMwNCw2NzU5LDY3NjEsNjc2Miw2NzYzXCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxMV0gPSB7bmFtZTogXCJWaXNhRWxlY3Ryb25cIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjQwMjYsNDE3NTAwLDQ1MDgsNDg0NCw0OTEzLDQ5MTdcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzEyXSA9IHtuYW1lOiBcIkxhc2VyQ2FyZFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTcsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjMwNCw2NzA2LDY3NzEsNjcwOVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTNdID0ge25hbWU6IFwiVGVzdFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMTkxMlwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiBmYWxzZX07XHJcbiAgdmFyIHJlcyA9IHtcclxuICAgIHZhbGlkOiBmYWxzZVxyXG4gIH07XHJcblxyXG5cclxuICAvLyBFbnN1cmUgdGhhdCB0aGUgdXNlciBoYXMgcHJvdmlkZWQgYSBjcmVkaXQgY2FyZCBudW1iZXJcclxuICBpZiAoY2FyZG51bWJlci5sZW5ndGggPT09IDApICB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDE7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIE5vdyByZW1vdmUgYW55IHNwYWNlcyBmcm9tIHRoZSBjcmVkaXQgY2FyZCBudW1iZXJcclxuICBjYXJkbnVtYmVyID0gY2FyZG51bWJlci5yZXBsYWNlICgvXFxzL2csIFwiXCIpO1xyXG5cclxuICAvLyBDaGVjayB0aGF0IHRoZSBudW1iZXIgaXMgbnVtZXJpY1xyXG4gIHZhciBjYXJkTm8gPSBjYXJkbnVtYmVyO1xyXG4gIHZhciBjYXJkZXhwID0gL15bMC05XXsxMywxOX0kLztcclxuICBpZiAoIWNhcmRleHAuZXhlYyhjYXJkTm8pKSAge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSAyO1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICAvLyBFc3RhYmxpc2ggY2FyZCB0eXBlXHJcbiAgdmFyIGNhcmRUeXBlID0gLTE7XHJcbiAgZm9yICh2YXIgaT0wOyBpPGNhcmRzLmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgLy8gTG9hZCBhbiBhcnJheSB3aXRoIHRoZSB2YWxpZCBwcmVmaXhlcyBmb3IgdGhpcyBjYXJkXHJcbiAgICBwcmVmaXggPSBjYXJkc1tpXS5wcmVmaXhlcy5zcGxpdChcIixcIik7XHJcblxyXG4gICAgLy8gTm93IHNlZSBpZiBhbnkgb2YgdGhlbSBtYXRjaCB3aGF0IHdlIGhhdmUgaW4gdGhlIGNhcmQgbnVtYmVyXHJcbiAgICBmb3IgKGo9MDsgajxwcmVmaXgubGVuZ3RoOyBqKyspIHtcclxuICAgICAgdmFyIGV4cCA9IG5ldyBSZWdFeHAgKFwiXlwiICsgcHJlZml4W2pdKTtcclxuICAgICAgaWYgKGV4cC50ZXN0IChjYXJkTm8pKSBjYXJkVHlwZSA9IGk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBJZiBjYXJkIHR5cGUgbm90IGZvdW5kLCByZXBvcnQgYW4gZXJyb3JcclxuICBpZiAoY2FyZFR5cGUgPT0gLTEpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gMjtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXMuY2NOYW1lID0gY2FyZHNbY2FyZFR5cGVdLm5hbWU7XHJcblxyXG5cclxuXHJcbiAgdmFyIGo7XHJcbiAgLy8gTm93IGNoZWNrIHRoZSBtb2R1bHVzIDEwIGNoZWNrIGRpZ2l0IC0gaWYgcmVxdWlyZWRcclxuICBpZiAoY2FyZHNbY2FyZFR5cGVdLmNoZWNrZGlnaXQpIHtcclxuICAgIHZhciBjaGVja3N1bSA9IDA7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJ1bm5pbmcgY2hlY2tzdW0gdG90YWxcclxuICAgIHZhciBteWNoYXIgPSBcIlwiOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dCBjaGFyIHRvIHByb2Nlc3NcclxuICAgIGogPSAxOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFrZXMgdmFsdWUgb2YgMSBvciAyXHJcblxyXG4gICAgLy8gUHJvY2VzcyBlYWNoIGRpZ2l0IG9uZSBieSBvbmUgc3RhcnRpbmcgYXQgdGhlIHJpZ2h0XHJcbiAgICB2YXIgY2FsYztcclxuICAgIGZvciAoaSA9IGNhcmROby5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCB0aGUgbmV4dCBkaWdpdCBhbmQgbXVsdGlwbHkgYnkgMSBvciAyIG9uIGFsdGVybmF0aXZlIGRpZ2l0cy5cclxuICAgICAgY2FsYyA9IE51bWJlcihjYXJkTm8uY2hhckF0KGkpKSAqIGo7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzdWx0IGlzIGluIHR3byBkaWdpdHMgYWRkIDEgdG8gdGhlIGNoZWNrc3VtIHRvdGFsXHJcbiAgICAgIGlmIChjYWxjID4gOSkge1xyXG4gICAgICAgIGNoZWNrc3VtID0gY2hlY2tzdW0gKyAxO1xyXG4gICAgICAgIGNhbGMgPSBjYWxjIC0gMTA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEFkZCB0aGUgdW5pdHMgZWxlbWVudCB0byB0aGUgY2hlY2tzdW0gdG90YWxcclxuICAgICAgY2hlY2tzdW0gPSBjaGVja3N1bSArIGNhbGM7XHJcblxyXG4gICAgICAvLyBTd2l0Y2ggdGhlIHZhbHVlIG9mIGpcclxuICAgICAgaWYgKGogPT0xKSB7XHJcbiAgICAgICAgaiA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaiA9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBbGwgZG9uZSAtIGlmIGNoZWNrc3VtIGlzIGRpdmlzaWJsZSBieSAxMCwgaXQgaXMgYSB2YWxpZCBtb2R1bHVzIDEwLlxyXG4gICAgLy8gSWYgbm90LCByZXBvcnQgYW4gZXJyb3IuXHJcbiAgICBpZiAoY2hlY2tzdW0gJSAxMCAhPT0gMCkgIHtcclxuICAgICAgcmVzLmNjRXJyb3JObyA9IDM7XHJcbiAgICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgICByZXR1cm4gcmVzO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgaXQncyBub3QgYSBzcGFtIG51bWJlclxyXG4gIGlmIChjYXJkTm8gPT0gJzU0OTA5OTc3NzEwOTIwNjQnKSB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDU7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIFRoZSBmb2xsb3dpbmcgYXJlIHRoZSBjYXJkLXNwZWNpZmljIGNoZWNrcyB3ZSB1bmRlcnRha2UuXHJcbiAgdmFyIExlbmd0aFZhbGlkID0gZmFsc2U7XHJcbiAgdmFyIFByZWZpeFZhbGlkID0gZmFsc2U7XHJcblxyXG4gIC8vIFdlIHVzZSB0aGVzZSBmb3IgaG9sZGluZyB0aGUgdmFsaWQgbGVuZ3RocyBhbmQgcHJlZml4ZXMgb2YgYSBjYXJkIHR5cGVcclxuICB2YXIgcHJlZml4ID0gW107XHJcbiAgdmFyIGxlbmd0aHMgPSBbXTtcclxuXHJcbiAgLy8gU2VlIGlmIHRoZSBsZW5ndGggaXMgdmFsaWQgZm9yIHRoaXMgY2FyZFxyXG4gIGxlbmd0aHMgPSBjYXJkc1tjYXJkVHlwZV0ubGVuZ3RoLnNwbGl0KFwiLFwiKTtcclxuICBmb3IgKGo9MDsgajxsZW5ndGhzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBpZiAoY2FyZE5vLmxlbmd0aCA9PSBsZW5ndGhzW2pdKSBMZW5ndGhWYWxpZCA9IHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyBTZWUgaWYgYWxsIGlzIE9LIGJ5IHNlZWluZyBpZiB0aGUgbGVuZ3RoIHdhcyB2YWxpZC4gV2Ugb25seSBjaGVjayB0aGUgbGVuZ3RoIGlmIGFsbCBlbHNlIHdhcyBcclxuICAvLyBodW5reSBkb3J5LlxyXG4gIGlmICghTGVuZ3RoVmFsaWQpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gNDtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgcmVzLnZhbGlkID0gdHJ1ZTtcclxuXHJcbiAgLy8gVGhlIGNyZWRpdCBjYXJkIGlzIGluIHRoZSByZXF1aXJlZCBmb3JtYXQuXHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuLyo9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xyXG5cclxubW9kdWxlLmV4cG9ydHMuY2hlY2tDcmVkaXRDYXJkID0gY2hlY2tDcmVkaXRDYXJkO1xyXG5cclxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cblxudmFyIG1vbWVudCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wydtb21lbnQnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ21vbWVudCddIDogbnVsbCk7XG5cbnZhciB2aXJ0dWFsVGltZSA9IG51bGw7XG5leHBvcnRzLm5vdyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh2aXJ0dWFsVGltZSkge1xuICAgICAgICByZXR1cm4gdmlydHVhbFRpbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5zZXRWaXJ0dWFsVGltZSA9IGZ1bmN0aW9uKHQpIHtcbiAgICB2aXJ0dWFsVGltZSA9IHQ7XG59O1xuXG5leHBvcnRzLmRhdGUyc3RyID0gZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmRhdGUyaW50ID0gZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAodHlwZW9mIGQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgZCA9IG5ldyBEYXRlKGQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKGQuZ2V0VGltZSgpIC8gODY0MDAwMDApO1xufTtcblxuXG5leHBvcnRzLmludERhdGUyc3RyID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBkdDtcbiAgICBpZiAoZCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgZHQgPSBkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgfVxuICAgIHJldHVybiBkdC50b0lTT1N0cmluZygpLnN1YnN0cmluZygwLDEwKTtcbn07XG5cbmV4cG9ydHMuaW50MmRhdGUgPSBmdW5jdGlvbihkKSB7XG4gICAgaWYgKGQgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gZDtcbiAgICB2YXIgZHQgPSBuZXcgRGF0ZShkKjg2NDAwMDAwKTtcbiAgICByZXR1cm4gZHQ7XG59O1xuXG5leHBvcnRzLnRvZGF5ID0gZnVuY3Rpb24odHopIHtcbiAgICB0eiA9IHR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KHR6KTtcbiAgICB2YXIgZGF0ZVN0ciA9IGR0LmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgIHZhciBkdDIgPSBuZXcgRGF0ZShkYXRlU3RyKydUMDA6MDA6MDAuMDAwWicpO1xuXG4gICAgcmV0dXJuIGR0Mi5nZXRUaW1lKCkgLyA4NjQwMDAwMDtcbn07XG5cblxuXG5cblxuLy8vIENST04gSU1QTEVNRU5UQVRJT05cblxuZnVuY3Rpb24gbWF0Y2hOdW1iZXIobiwgZmlsdGVyKSB7XG4gICAgbiA9IHBhcnNlSW50KG4pO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSAnKicpIHJldHVybiB0cnVlO1xuICAgIGlmIChmaWx0ZXIgPT09IG4pIHJldHVybiB0cnVlO1xuICAgIHZhciBmID0gZmlsdGVyLnRvU3RyaW5nKCk7XG4gICAgdmFyIG9wdGlvbnMgPSBmLnNwbGl0KCcsJyk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG9wdGlvbnM7IGkrPTEpIHtcbiAgICAgICAgdmFyIGFyciA9IG9wdGlvbnNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgaWYgKGFyci5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGlmIChwYXJzZUludChhcnJbMF0sMTApID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChhcnIubGVuZ3RoID09PTIpIHtcbiAgICAgICAgICAgIHZhciBmcm9tID0gcGFyc2VJbnQoYXJyWzBdLDEwKTtcbiAgICAgICAgICAgIHZhciB0byA9IHBhcnNlSW50KGFyclsxXSwxMCk7XG4gICAgICAgICAgICBpZiAoKG4+PWZyb20gKSAmJiAobjw9IHRvKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpIHtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigwLDIpLCBqb2IubWludXRlKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDIsMiksIGpvYi5ob3VyKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDQsMiksIGpvYi5kYXlPZk1vbnRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDYsMiksIGpvYi5tb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig4LDEpLCBqb2IuZGF5T2ZXZWVrKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG52YXIgY3JvbkpvYnMgPSBbXTtcbmV4cG9ydHMuYWRkQ3JvbkpvYiA9IGZ1bmN0aW9uKGpvYikge1xuXG5cbiAgICBqb2IudHogPSBqb2IudHogfHwgJ1VUQyc7XG5cbiAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuICAgIGpvYi5sYXN0ID0gY3JvbkRhdGU7XG4gICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgIGNyb25Kb2JzLnB1c2goam9iKTtcbiAgICByZXR1cm4gY3JvbkpvYnMubGVuZ3RoIC0xO1xufTtcblxuZXhwb3J0cy5kZWxldGVDcm9uSm9iID0gZnVuY3Rpb24oaWRKb2IpIHtcbiAgICBkZWxldGUgY3JvbkpvYnNbaWRKb2JdO1xufTtcblxuLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25lIGEgbWludXRlIGluIHRoZSBiZWdpbmluZyBvZiBlYWNoIG1pbnV0ZS5cbi8vIGl0IGlzIHVzZWQgdG8gY3JvbiBhbnkgZnVuY3Rpb25cbnZhciBvbk1pbnV0ZSA9IGZ1bmN0aW9uKCkge1xuXG5cbiAgICBjcm9uSm9icy5mb3JFYWNoKGZ1bmN0aW9uKGpvYikge1xuICAgICAgICBpZiAoIWpvYikgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eihqb2IudHopO1xuICAgICAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuXG4gICAgICAgIGlmICgoY3JvbkRhdGUgIT09IGpvYi5sYXN0KSAmJiAobWF0Y2hKb2Ioam9iLCBjcm9uRGF0ZSkpKSB7XG4gICAgICAgICAgICBpZiAoam9iLmV4ZWN1dGluZykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSm9iIHRha2VzIHRvbyBsb25nIHRvIGV4ZWN1dGU6IFwiICsgam9iLm5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGpvYi5jYihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbm93ID0gZXhwb3J0cy5ub3coKS5nZXRUaW1lKCk7XG4gICAgdmFyIG1pbGxzVG9OZXh0TWludXRlID0gNjAwMDAgLSBub3cgJSA2MDAwMDtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBvbk1pbnV0ZSgpO1xuICAgIH0sIG1pbGxzVG9OZXh0TWludXRlKTtcbn07XG5cbm9uTWludXRlKCk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbWFzdGVyVXRpbHMgPSB7XG4gICAgICAgIGRhdGVVdGlsczogcmVxdWlyZSgnLi9kYXRlX3V0aWxzLmpzJyksXG4gICAgICAgIHJvdW5kOiByZXF1aXJlKCcuL3JvdW5kLmpzJyksXG4gICAgICAgIFByaWNlOiAgbnVsbCxcbiAgICAgICAgUHJpY2UyOiByZXF1aXJlKCcuL3ByaWNlMi5qcycpLFxuICAgICAgICBjaGVja3M6IHtcbiAgICAgICAgICAgIGNoZWNrQ3JlZGl0Q2FyZDogcmVxdWlyZSgnLi9jcmVkaXRjYXJkLmpzJykuY2hlY2tDcmVkaXRDYXJkXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHJvb3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmICYmIHNlbGYgfHxcbiAgICAgICAgICAgIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IG1hc3RlclV0aWxzO1xuICAgICAgICB9XG4gICAgICAgIGV4cG9ydHMubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgd2luZG93Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgcm91bmQgPSByZXF1aXJlKCcuL3JvdW5kJyk7XG52YXIgZHUgPSByZXF1aXJlKCcuL2RhdGVfdXRpbHMnKTtcblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG52YXIgcmVnaXN0ZXJlZE1vZGlmaWVycyA9IHtcbiAgICBcIkFHUkVHQVRPUlwiOiByZXF1aXJlKFwiLi9wcmljZV9hZ3JlZ2F0b3IuanNcIiksXG4gICAgXCJMSU5FXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2xpbmUuanNcIiksXG4gICAgXCJWQVRJTkNMVURFRFwiOiByZXF1aXJlKFwiLi9wcmljZV92YXRpbmNsdWRlZC5qc1wiKSxcbiAgICBcIkRJU0NPVU5UXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2Rpc2NvdW50LmpzXCIpXG59O1xuXG52YXIgUHJpY2UyID0gZnVuY3Rpb24ocDEsIHAyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYubGluZXMgPSBbXTtcbiAgICBzZWxmLm9wdGlvbnMgPSB7fTtcbiAgICBfLmVhY2goYXJndW1lbnRzLCBmdW5jdGlvbihwKSB7XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICBpZiAoKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSYmKHAubGluZXMpKSB7XG4gICAgICAgICAgICAgICAgXy5lYWNoKHAubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUobCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBfLmVhY2gocCwgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJihwLmNsYXNzIHx8IHAubGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUocCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucyA9IHA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHNlbGYudHJlZVZhbGlkPWZhbHNlO1xuICAgIHNlbGYucmVuZGVyVmFsaWQ9ZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJUcmVlVmFsaWQ9ZmFsc2U7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLmFkZFByaWNlID0gZnVuY3Rpb24ocCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXApIHJldHVybjtcbiAgICB2YXIgY3A7XG4gICAgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJiAocC5saW5lcykpIHtcbiAgICAgICAgY3AgPSBwLmxpbmVzO1xuICAgIH0gZWxzZSBpZiAoY3AgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjcCA9IHA7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBjcCA9IFtwXTtcbiAgICB9XG4gICAgXy5lYWNoKGNwLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKGwpKTtcbiAgICB9KTtcbiAgICBzZWxmLnRyZWVWYWxpZD1mYWxzZTtcbiAgICBzZWxmLnJlbmRlclZhbGlkID0gZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJUcmVlVmFsaWQgPSBmYWxzZTtcbn07XG5cblxuUHJpY2UyLnByb3RvdHlwZS5jb25zdHJ1Y3RUcmVlID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBzb3J0VHJlZShub2RlKSB7XG4gICAgICAgIGlmIChub2RlLmNoaWxkcykge1xuICAgICAgICAgICAgbm9kZS5jaGlsZHMgPSBfLnNvcnRCeUFsbChub2RlLmNoaWxkcywgW1wib3JkZXJcIiwgXCJzdWJvcmRlclwiXSk7XG4gICAgICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIHNvcnRUcmVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGNUb3RhbChub2RlKSB7XG4gICAgICAgIG5vZGUuaW1wb3J0ID0gbm9kZS5pbXBvcnQgfHwgMDtcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRzKSB7XG4gICAgICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICAgICAgICBub2RlLmltcG9ydCArPSBjYWxjVG90YWwoYyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZS5pbXBvcnQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcm91bmRJbXBvcnRzKG5vZGUpIHtcbiAgICAgICAgbm9kZS5pbXBvcnQgPSByb3VuZChub2RlLmltcG9ydCwgXCJST1VORFwiLCAwLjAxKTtcbiAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCByb3VuZEltcG9ydHMpO1xuICAgIH1cblxuICAgIGlmIChzZWxmLnRyZWVWYWxpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi50b3RhbDtcbiAgICB9XG5cbiAgICBzZWxmLnRvdGFsID0ge1xuICAgICAgICBpZDogXCJ0b3RhbFwiLFxuICAgICAgICBsYWJlbDogXCJAVG90YWxcIixcbiAgICAgICAgY2hpbGRzOiBbXSxcblxuICAgICAgICBzaG93SWZaZXJvOiB0cnVlLFxuICAgICAgICB0b3RhbE9uQm90dG9tOiB0cnVlXG4gICAgfTtcblxuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcblxuICAgIHZhciBpID0wO1xuXG4gICAgXy5lYWNoKHNlbGYubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgbC5zdWJvcmRlciA9IGkrKzsgICAgICAgICAgICAgICAvLyBzdWJvcmRlciBpcyB0aGUgb3JpZ2luYWwgb3JkZXIuIEluIGNhc2Ugb2YgdGllIHVzZSB0aGlzLlxuICAgICAgICBsLmNsYXNzID0gbC5jbGFzcyB8fCBcIkxJTkVcIjtcbiAgICAgICAgaWYgKCFyZWdpc3RlcmVkTW9kaWZpZXJzW2wuY2xhc3NdKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb2RpZmllciBcIiArIGwuY2xhc3MgKyBcIiBub3QgZGVmaW5lZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1vZGlmaWVyID0gbmV3IHJlZ2lzdGVyZWRNb2RpZmllcnNbbC5jbGFzc10obCk7XG4gICAgICAgIG1vZGlmaWVyLnN1Ym9yZGVyID0gaTtcbiAgICAgICAgbW9kaWZpZXJzLnB1c2gobW9kaWZpZXIpO1xuICAgIH0pO1xuXG4gICAgbW9kaWZpZXJzID0gXy5zb3J0QnlBbGwobW9kaWZpZXJzLCBbXCJleGVjT3JkZXJcIiwgXCJleGVjU3ViT3JkZXJcIiwgXCJzdWJvcmRlclwiXSk7XG5cbiAgICBfLmVhY2gobW9kaWZpZXJzLCBmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ubW9kaWZ5KHNlbGYudG90YWwsIHNlbGYub3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgICBzb3J0VHJlZShzZWxmLnRvdGFsKTtcblxuICAgIGNhbGNUb3RhbChzZWxmLnRvdGFsKTtcbiAgICByb3VuZEltcG9ydHMoc2VsZi50b3RhbCk7XG5cbiAgICBzZWxmLnRyZWVWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYudG90YWw7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG4gICAgZnVuY3Rpb24gcmVuZGVyTm9kZShub2RlLCBsZXZlbCkge1xuXG4gICAgICAgIHZhciByZW5kZXJUb3RhbCA9IHRydWU7XG4gICAgICAgIHZhciByZW5kZXJEZXRhaWwgPSB0cnVlO1xuICAgICAgICBpZiAoKCFub2RlLnNob3dJZlplcm8pICYmIChub2RlLmltcG9ydCA9PT0gMCkpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgIGlmICgobm9kZS5jaGlsZHMpJiYobm9kZS5jaGlsZHMubGVuZ3RoID09PSAxKSYmKCFub2RlLmhpZGVEZXRhaWwpKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVQYXJlbnQpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVDaGlsZCkgcmVuZGVyRGV0YWlsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUuaGlkZURldGFpbCkgcmVuZGVyRGV0YWlsPSBmYWxzZTtcbiAgICAgICAgaWYgKG5vZGUuaGlkZVRvdGFsKSByZW5kZXJUb3RhbD1mYWxzZTtcblxuICAgICAgICB2YXIgbmV3Tm9kZSA9IF8uY2xvbmUobm9kZSk7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmNoaWxkcztcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuc2hvd0lmWmVybztcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaGlkZURldGFpbDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaGlkZVRvdGFsO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5pZk9uZUhpZGVQYXJlbnQ7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmlmT25lSGlkZUNoaWxkO1xuICAgICAgICBuZXdOb2RlLmxldmVsID0gbGV2ZWw7XG5cbiAgICAgICAgaWYgKChyZW5kZXJUb3RhbCkgJiYgKCFub2RlLnRvdGFsT25Cb3R0b20pKSB7XG4gICAgICAgICAgICBzZWxmLnJlbmRlclJlc3VsdC5wdXNoKG5ld05vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbmRlckRldGFpbCkge1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZW5kZXJOb2RlKGNoaWxkTm9kZSwgcmVuZGVyVG90YWwgPyBsZXZlbCArMSA6IGxldmVsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICgocmVuZGVyVG90YWwpICYmIChub2RlLnRvdGFsT25Cb3R0b20pKSB7XG4gICAgICAgICAgICBzZWxmLnJlbmRlclJlc3VsdC5wdXNoKG5ld05vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYucmVuZGVyVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyUmVzdWx0O1xuICAgIH1cblxuICAgIHNlbGYucmVuZGVyUmVzdWx0ID0gW107XG5cbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHJlbmRlck5vZGUoc2VsZi50b3RhbCwgMCk7XG5cbiAgICBzZWxmLnJlbmRlclZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi5yZW5kZXJSZXN1bHQ7XG59O1xuXG5cblByaWNlMi5wcm90b3R5cGUucmVuZGVyVHJlZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG4gICAgZnVuY3Rpb24gcmVuZGVyVHJlZU5vZGUobm9kZSwgcGFyZW50Tm9kZSkge1xuXG5cbiAgICAgICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKG5vZGUpO1xuICAgICAgICBuZXdOb2RlLmNoaWxkcyA9IFtdO1xuXG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24oY2hpbGROb2RlKSB7XG4gICAgICAgICAgICByZW5kZXJUcmVlTm9kZShjaGlsZE5vZGUsIG5ld05vZGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgcmVuZGVyVG90YWwgPSB0cnVlO1xuICAgICAgICB2YXIgcmVuZGVyRGV0YWlsID0gdHJ1ZTtcbiAgICAgICAgaWYgKCghbm9kZS5zaG93SWZaZXJvKSAmJiAobm9kZS5pbXBvcnQgPT09IDApKSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICBpZiAoKG5ld05vZGUuY2hpbGRzLmxlbmd0aCA9PT0gMSkmJighbm9kZS5oaWRlRGV0YWlsKSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlUGFyZW50KSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlQ2hpbGQpIHJlbmRlckRldGFpbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlLmhpZGVEZXRhaWwpIHJlbmRlckRldGFpbD0gZmFsc2U7XG4gICAgICAgIGlmIChub2RlLmhpZGVUb3RhbCkgcmVuZGVyVG90YWw9ZmFsc2U7XG5cbiAgICAgICAgLy8gICAgICAgICAgICBuZXdOb2RlLnBhcmVudCA9IHBhcmVudE5vZGU7XG5cbiAgICAgICAgaWYgKCFyZW5kZXJEZXRhaWwpIHtcbiAgICAgICAgICAgIG5ld05vZGUuY2hpbGRzID0gW107XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChyZW5kZXJUb3RhbCkge1xuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlLmNoaWxkcy5wdXNoKG5ld05vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHNlbGYucmVuZGVyVHJlZVJlc3VsdCA9IG5ld05vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0ge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBoaWRlVG90YWw6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5lYWNoKG5ld05vZGUuY2hpbGRzLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZS5jaGlsZHMucHVzaChuKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRMZXZlbChub2RlLCBsZXZlbCkge1xuICAgICAgICBub2RlLmxldmVsID0gbGV2ZWw7XG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgc2V0TGV2ZWwobiwgbGV2ZWwrMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChzZWxmLnJlbmRlclRyZWVWYWxpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi5yZW5kZXJUcmVlUmVzdWx0O1xuICAgIH1cblxuICAgIHNlbGYuY29uc3RydWN0VHJlZSgpO1xuXG4gICAgc2VsZi5yZW5kZXJUcmVlUmVzdWx0ID0gbnVsbDtcblxuICAgIHJlbmRlclRyZWVOb2RlKHNlbGYudG90YWwsIG51bGwpO1xuXG4gICAgc2V0TGV2ZWwoc2VsZi5yZW5kZXJUcmVlUmVzdWx0LCAwKTtcblxuICAgIHNlbGYucmVuZGVyVHJlZVZhbGlkID0gdHJ1ZTtcbiAgICByZXR1cm4gc2VsZi5yZW5kZXJUcmVlUmVzdWx0O1xufTtcblxuZnVuY3Rpb24gZmluZE5vZGUobm9kZSwgaWQpIHtcbiAgICB2YXIgaTtcbiAgICBpZiAoIW5vZGUpIHJldHVybiBudWxsO1xuICAgIGlmIChub2RlLmlkID09PSBpZCkgcmV0dXJuIG5vZGU7XG4gICAgaWYgKCFub2RlLmNoaWxkcykgcmV0dXJuIG51bGw7XG4gICAgZm9yIChpPTA7IGk8bm9kZS5jaGlsZHMubGVuZ3RoOyBpKz0xKSB7XG4gICAgICAgIHZhciBmTm9kZSA9IGZpbmROb2RlKG5vZGUuY2hpbGRzW2ldLCBpZCk7XG4gICAgICAgIGlmIChmTm9kZSkgcmV0dXJuIGZOb2RlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuUHJpY2UyLnByb3RvdHlwZS5nZXRJbXBvcnQgPSBmdW5jdGlvbihpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZCA9IGlkIHx8IFwidG90YWxcIjtcbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHZhciBub2RlID0gZmluZE5vZGUoc2VsZi50b3RhbCwgaWQpO1xuXG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuaW1wb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cblByaWNlMi5wcm90b3R5cGUuYWRkQXR0cmlidXRlcyA9IGZ1bmN0aW9uKGF0cmlidXRlKSB7XG4gICAgdmFyIHNlbGY9dGhpcztcbiAgICB2YXIgYXR0cnM7XG4gICAgaWYgKHR5cGVvZiBhdHJpYnV0ZSA9PT0gXCJzdHJpbmdcIiApIHtcbiAgICAgICAgYXR0cnMgPSBbYXRyaWJ1dGVdO1xuICAgIH0gZWxzZSBpZiAoYXRyaWJ1dGUgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBhdHRycyA9IGF0cmlidXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgQXR0cmlidXRlXCIpO1xuICAgIH1cbiAgICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgXy5lYWNoKHNlbGYubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgIGlmICghbC5hdHRyaWJ1dGVzKSBsLmF0dHJpYnV0ZXMgPSBbXTtcbiAgICAgICAgICAgIGlmICghXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIGEpKSB7XG4gICAgICAgICAgICAgICAgbC5hdHRyaWJ1dGVzLnB1c2goYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqLmxpbmVzID0gXy5tYXAodGhpcy5saW5lcywgXy5jbG9uZSk7XG4gICAgXy5lYWNoKG9iai5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICBpZiAodHlwZW9mIGwuZnJvbSA9PT0gXCJudW1iZXJcIikgbC5mcm9tID0gZHUuaW50MmRhdGUobC5mcm9tKTtcbiAgICAgICAgaWYgKHR5cGVvZiBsLnRvID09PSBcIm51bWJlclwiKSBsLnRvID0gZHUuaW50MmRhdGUobC50byk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbn07XG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZTI7XG5cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG4vKlxuXG5BZ3JlZ2F0ZSBNb2RpZmllclxuPT09PT09PT09PT09PT09PT1cblxuICAgIGdyb3VwQnkgICAgICAgICAgICAgRmxhZyBvZiB0aGUgbGluZXMgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWRcbiAgICBleGVjT3JkZXIgICAgICAgICAgIE9yZGVyIGluIHdoaWNoIHRoaXMgbW9kaWZpZXIgaSBleGNldnV0ZWQuXG5cbn1cblxuKi9cblxudmFyIFByaWNlQWdyZWdhdG9yID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA1O1xuICAgIHRoaXMuZ3JvdXBCeSA9IGxpbmUuZ3JvdXBCeTtcbn07XG5cblByaWNlQWdyZWdhdG9yLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZSh0aGlzLmxpbmUpO1xuICAgIG5ld05vZGUuY2hpbGRzID0gW107XG4gICAgdmFyIGksbDtcbiAgICBmb3IgKGk9MDsgaTx0cmVlLmNoaWxkcy5sZW5ndGg7IGkrPTEpIHtcbiAgICAgICAgbD10cmVlLmNoaWxkc1tpXTtcbiAgICAgICAgaWYgKF8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBzZWxmLmdyb3VwQnkpKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcy5wdXNoKGwpO1xuICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgIGktPTE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdHJlZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VBZ3JlZ2F0b3I7XG5cblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgZHU9IHJlcXVpcmUoXCIuL2RhdGVfdXRpbHMuanNcIik7XG5cbi8qXG5cbkRpc2NvdW50IE1vZGlmaWVyXG49PT09PT09PT09PT09PT09PVxuXG4gICAgcGhhc2UgICAgICAgICAgICAgRmxhZyBvZiB0aGUgbGluZXMgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWRcbiAgICBleGVjT3JkZXIgICAgICAgICAgIE9yZGVyIGluIHdoaWNoIHRoaXMgbW9kaWZpZXIgaSBleGNldnV0ZWQuXG4gICAgcnVsZXMgICAgICAgICAgICAgIEFycmF5IG9mIHJ1bGVzXG5cblxuXG59XG5cbiovXG5cbnZhciBQcmljZURpc2NvdW50ID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMuZXhlY1N1Ym9yZGVyID0gbGluZS5waGFzZTtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgNTtcblxufTtcblxuUHJpY2VEaXNjb3VudC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSwgb3B0aW9ucykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gcnVsZURvZXNBcHBseSAocnVsZSkge1xuICAgICAgICB2YXIgaVJlc2VydmF0aW9uID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5yZXNlcnZhdGlvbik7XG4gICAgICAgIGlmICgocnVsZS5yZXNlcnZhdGlvbk1pbikmJihpUmVzZXJ2YXRpb24gPCBkdS5kYXRlMmludChydWxlLnJlc2VydmF0aW9uTWluKSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLnJlc2VydmF0aW9uTWF4KSYmKGlSZXNlcnZhdGlvbiA+IGR1LmRhdGUyaW50KHJ1bGUucmVzZXJ2YXRpb25NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgaUNoZWNraW4gPSBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgaUNoZWNrb3V0ID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGlmICgocnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbikmJiggaUNoZWNraW4gLSBpUmVzZXJ2YXRpb24gPCBydWxlLmRheXNCZWZvcmVDaGVja2luTWluICkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmRheXNCZWZvcmVDaGVja2luTWluIHx8IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW49PT0wKSYmKCBpQ2hlY2tpbiAtIGlSZXNlcnZhdGlvbiA+IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NYXggKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1pbikmJiggaUNoZWNraW4gPCBkdS5kYXRlMmludChydWxlLmNoZWNraW5NaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1heCkmJiggaUNoZWNraW4gPiBkdS5kYXRlMmludChydWxlLmNoZWNraW5NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNaW4pJiYoIGlDaGVja291dCA8IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNYXgpJiYoIGlDaGVja291dCA+IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUubWluU3RheSkmJiggaUNoZWNrb3V0IC0gaUNoZWNraW4gPCBydWxlLm1pblN0YXkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5tYXhTdGF5IHx8IHJ1bGUubWF4U3RheT09PTApJiYoIGlDaGVja291dCAtIGlDaGVja2luIDwgcnVsZS5tYXhTdGF5KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHByb3BvcnRpb25BcHBseShpSW4sIGlPdXQsIGlBcHBseUZyb20sIGlBcHBseVRvKSB7XG4gICAgICAgIHZhciBhID0gaUluID4gaUFwcGx5RnJvbSA/IGlJbiA6IGlBcHBseUZyb207XG4gICAgICAgIHZhciBiID0gaU91dCA8IGlBcHBseVRvID8gaU91dCA6IGlBcHBseVRvO1xuICAgICAgICBpZiAoYj5hKSByZXR1cm4gMDtcbiAgICAgICAgcmV0dXJuIChiLWEpLyhpT3V0LWlJbik7XG4gICAgfVxuLypcbiAgICBmdW5jdGlvbiBsaW5lRnJvbVJ1bGUocnVsZSkge1xuICAgICAgICB2YXIgbmV3TGluZSA9IF8uY2xvbmUoc2VsZi5saW5lKTtcbiAgICAgICAgdmFyIHByb3BvcnRpb247XG4gICAgICAgIHZhciB2YXQgPTA7XG4gICAgICAgIHZhciBiYXNlID0wO1xuICAgICAgICB2YXIgdG90YWxJbXBvcnQgPTA7XG5cbiAgICAgICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBpZiAoISBfLmNvbnRhaW5zKGwuYXR0cmlidXRlcywgcnVsZS5hcHBseUlkQ29uY2VwdEF0cmlidXRlKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCEgbC5iYXNlSW1wb3J0KSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChydWxlLmFwcGxpY2F0aW9uVHlwZSA9PT0gXCJXSE9MRVwiKSB7XG4gICAgICAgICAgICAgICAgcHJvcG9ydGlvbiA9IDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByb3BvcnRpb24gPSBwcm9wb3J0aW9uQXBwbHkoXG4gICAgICAgICAgICAgICAgICAgIGwuZnJvbSA/IGR1LmRhdGUyaW50KGwuZnJvbSkgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pLFxuICAgICAgICAgICAgICAgICAgICBsLnRvID8gZHUuZGF0ZTJpbnQobC50bykgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNrb3V0KSxcbiAgICAgICAgICAgICAgICAgICAgZHUuZGF0ZTJpbnQocnVsZS5hcHBseUZyb20pLFxuICAgICAgICAgICAgICAgICAgICBkdS5kYXRlMmludChydWxlLmFwcGx5VG8pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxWYXQgPSAwO1xuICAgICAgICAgICAgXy5lYWNoKGwudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgICAgIGlmICh0YXgudHlwZSA9PT0gXCJWQVRcIikge1xuICAgICAgICAgICAgICAgICAgICBsVmF0ID0gdGF4LlBDO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXQgPSAodmF0KmJhc2UgKyBsVmF0KmwuYmFzZUltcG9ydCAqIHByb3BvcnRpb24pIC8gKGJhc2UgKyBsLmJhc2VJbXBvcnQgKiBwcm9wb3J0aW9uKTtcbiAgICAgICAgICAgIGJhc2UgPSBiYXNlICsgbC5iYXNlSW1wb3J0ICogcHJvcG9ydGlvbjtcbiAgICAgICAgICAgIHRvdGFsSW1wb3J0ICs9IGwuaW1wb3J0ICogcHJvcG9ydGlvbjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3TGluZS5iYXNlSW1wb3J0ID0gYmFzZSAqICggMS0gcnVsZS5hcHBseURpc2NvdW50UEMvMTAwKTtcbiAgICAgICAgbmV3TGluZS5pbXBvcnQgPSBiYXNlICogKCAxLSBydWxlLmFwcGx5RGlzY291bnRQQy8xMDApO1xuXG4gICAgICAgIG5ld0xpbmUudGF4ZXMgPSBuZXdMaW5lLnRheGVzIHx8IFtdO1xuXG4gICAgICAgIHZhciB0YXggPSBfLmZpbmRXaGVyZShuZXdMaW5lLnRheGVzLHt0eXBlOiBcIlZBVFwifSk7XG4gICAgICAgIGlmICghdGF4KSB7XG4gICAgICAgICAgICB0YXggPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJWQVRcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG5ld0xpbmUudGF4ZXMucHVzaCA9IHRheDtcbiAgICAgICAgfVxuICAgICAgICB0YXguUEMgPSB2YXQ7XG5cbiAgICAgICAgcmV0dXJuIG5ld0xpbmU7XG4gICAgfVxuKi9cblxuICAgIGZ1bmN0aW9uIGRheXNJblJ1bGUobGluZSwgcnVsZSkge1xuICAgICAgICB2YXIgYSxiLGk7XG4gICAgICAgIHZhciBkYXlzID0gW107XG4gICAgICAgIHZhciBsRnJvbSA9IGwuZnJvbSA/IGR1LmRhdGUyaW50KGwuZnJvbSkgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgbFRvID0gbC50byA/IGR1LmRhdGUyaW50KGwudG8pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGlmIChydWxlLmFwcGxpY2F0aW9uVHlwZSA9PT0gXCJXSE9MRVwiKSB7XG4gICAgICAgICAgICBhID0gbEZyb207XG4gICAgICAgICAgICBiID0gbFRvO1xuICAgICAgICB9IGVsc2UgaWYgKHJ1bGUuYXBwbGljYXRpb25UeXBlID09PSBcIkJZREFZXCIpIHtcbiAgICAgICAgICAgIHZhciByRnJvbSA9IGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlGcm9tKTtcbiAgICAgICAgICAgIHZhciByVG8gPSBkdS5kYXRlMmludChydWxlLmFwcGx5VG8pO1xuXG4gICAgICAgICAgICBhID0gTWF0aC5tYXgockZyb20sIGxGcm9tKTtcbiAgICAgICAgICAgIGIgPSBNYXRoLm1pbihyVG8sIGxUbyk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpPWE7IGk8YjsgaSs9MSkge1xuICAgICAgICAgICAgZGF5cy5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheXNJbkxpbmUobGluZSkge1xuICAgICAgICB2YXIgaTtcbiAgICAgICAgdmFyIGRheXMgPSBbXTtcbiAgICAgICAgdmFyIGxGcm9tID0gbC5mcm9tID8gZHUuZGF0ZTJpbnQobC5mcm9tKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbik7XG4gICAgICAgIHZhciBsVG8gPSBsLnRvID8gZHUuZGF0ZTJpbnQobC50bykgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNrb3V0KTtcbiAgICAgICAgZm9yIChpPWxGcm9tOyBpPGxUbzsgaSs9MSkge1xuICAgICAgICAgICAgZGF5cy5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXlzO1xuICAgIH1cblxuICAgIHZhciBzYW1lUGhhc2VEaXNjb3VudHMgPSBbXTtcbiAgICB2YXIgcG9zdHBvbmVkRGlzY291bnRzID0gW107XG5cbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAobC5jbGFzcyA9PT0gXCJESVNDT1VOVFwiKSB7XG4gICAgICAgICAgICBpZiAobC5waGFzZSA9PT0gc2VsZi5saW5lLnBoYXNlKSB7IC8vIFJlbW92ZSBhbmQgZ2V0IHRoZSBiZXN0XG4gICAgICAgICAgICAgICAgc2FtZVBoYXNlRGlzY291bnRzLnB1c2gobCk7XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHMucG9wKCk7XG4gICAgICAgICAgICAgICAgaS09MTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobC5waGFzZSA+IHNlbGYubGluZS5waGFzZSkgeyAvLyBSZW1vdmUgYW5kIHJlcHJjZXNzICBsYXRlclxuICAgICAgICAgICAgICAgIHBvc3Rwb25lZERpc2NvdW50cy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzW2ldID0gdHJlZS5jaGlsZHNbdHJlZS5jaGlsZHMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGktPTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYXBwbGllZFJ1bGVzID0gXy5maWx0ZXIoc2VsZi5saW5lLnJ1bGVzLCBydWxlRG9lc0FwcGx5KTtcblxuICAgIC8vIFRoaXMgaGFzaCBjb250YWlucyB0aGUgYmVzdCBkaXNjb3VudCBmb3IgZWFjaCBsaW5lIGFuZCBkYXlcbiAgICAvLyBkaXNjb3VudFBlckRheVsnM3wxODQ3NSddPSAxNSBNZWFucyB0aGF0IHRoZSBsaW5lIHRyZWVbM10gd2lsbCBhcHBseXNcbiAgICAvLyBhIDE1JSBkaXNjb3VudCBhdCBkYXkgMTg0NzVcbiAgICB2YXIgZGlzY291bnRQZXJEYXkgPSB7fTtcbiAgICBfLmVhY2goYXBwbGllZFJ1bGVzLCBmdW5jdGlvbihydWxlKSB7XG4gICAgICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCwgbGluZUlkeCkge1xuICAgICAgICAgICAgXy5lYWNoKGRheXNJblJ1bGUobCwgcnVsZSksIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaz0gbGluZUlkeCsnfCcrZDtcbiAgICAgICAgICAgICAgICBpZiAoIWRpc2NvdW50UGVyRGF5W2tdKSBkaXNjb3VudFBlckRheVtrXT0wO1xuICAgICAgICAgICAgICAgIGRpc2NvdW50UGVyRGF5W2tdID0gTWF0aC5tYXgoZGlzY291bnRQZXJEYXlba10sIHJ1bGUuYXBwbHlEaXNjb3VudFBDKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciB2YXQgPTA7XG4gICAgdmFyIGJhc2UgPTA7XG4gICAgdmFyIHRvdGFsSW1wb3J0ID0wO1xuXG4gICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsLCBsaW5lSWR4KSB7XG4gICAgICAgIHZhciBkc2M9MDtcbiAgICAgICAgdmFyIG4gPTA7XG4gICAgICAgIF8uZWFjaChkYXlzSW5MaW5lKGwpLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgaz0gbGluZUlkeCsnfCcrZDtcbiAgICAgICAgICAgIGlmIChkaXNjb3VudFBlckRheVtrXSkge1xuICAgICAgICAgICAgICAgIGRzYyArPSBkaXNjb3VudFBlckRheVtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG4rPTE7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobiA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBkc2MgPSBkc2MgLyBuO1xuXG4gICAgICAgIHZhciBsVmF0ID0gMDtcbiAgICAgICAgXy5lYWNoKGwudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgbFZhdCA9IHRheC5QQztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmF0ID0gKHZhdCpiYXNlICsgbFZhdCpsLmJhc2VJbXBvcnQqZHNjLzEwMCkgLyAoYmFzZSArIGwuYmFzZUltcG9ydCpkc2MvMTAwKTtcbiAgICAgICAgYmFzZSA9IGJhc2UgKyBsLmJhc2VJbXBvcnQgKiBkc2MvMTAwO1xuICAgICAgICB0b3RhbEltcG9ydCA9IHRvdGFsSW1wb3J0ICsgbC5pbXBvcnQgKiBkc2MvMTAwO1xuICAgIH0pO1xuXG4gICAgdmFyIGJlc3RMaW5lID0gXy5jbG9uZShzZWxmLmxpbmUpO1xuXG4gICAgYmVzdExpbmUuYmFzZUltcG9ydCA9IC1iYXNlO1xuICAgIGJlc3RMaW5lLmJhc2VQcmljZSA9IC1iYXNlO1xuICAgIGJlc3RMaW5lLmltcG9ydCA9IC10b3RhbEltcG9ydDtcbiAgICBiZXN0TGluZS5xdWFudGl0eSA9IDE7XG4gICAgYmVzdExpbmUuY2xhc3MgPSBcIkxJTkVcIjtcblxuICAgIGJlc3RMaW5lLnRheGVzID0gYmVzdExpbmUudGF4ZXMgfHwgW107XG5cbiAgICB2YXIgdGF4ID0gXy5maW5kV2hlcmUoYmVzdExpbmUudGF4ZXMse3R5cGU6IFwiVkFUXCJ9KTtcbiAgICBpZiAoIXRheCkge1xuICAgICAgICB0YXggPSB7XG4gICAgICAgICAgICB0eXBlOiBcIlZBVFwiXG4gICAgICAgIH07XG4gICAgICAgIGJlc3RMaW5lLnRheGVzLnB1c2godGF4KTtcbiAgICB9XG4gICAgdGF4LlBDID0gdmF0O1xuXG4gICAgc2FtZVBoYXNlRGlzY291bnRzLnB1c2goYmVzdExpbmUpO1xuXG4gICAgdmFyIGJlc3RMaW5lSW5QaGFzZSA9IF8ucmVkdWNlKHNhbWVQaGFzZURpc2NvdW50cywgZnVuY3Rpb24oYmVzdExpbmUsIGxpbmUpIHtcbiAgICAgICAgaWYgKCFsaW5lKSByZXR1cm4gYmVzdExpbmU7XG4gICAgICAgIHJldHVybiAobGluZS5pbXBvcnQgPCBiZXN0TGluZS5pbXBvcnQpID8gbGluZSA6IGJlc3RMaW5lO1xuICAgIH0pO1xuXG4gICAgdHJlZS5jaGlsZHMucHVzaChiZXN0TGluZUluUGhhc2UpO1xuXG4gICAgcG9zdHBvbmVkRGlzY291bnRzID0gXy5zb3J0QnkocG9zdHBvbmVkRGlzY291bnRzLCAncGhhc2UnKTtcblxuICAgIF8uZWFjaChwb3N0cG9uZWREaXNjb3VudHMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgdmFyIG1vZGlmaWVyID0gbmV3IFByaWNlRGlzY291bnQobCk7XG4gICAgICAgIG1vZGlmaWVyLmFwcGx5KHRyZWUsIG9wdGlvbnMpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZURpc2NvdW50O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbnZhciBQcmljZUxpbmUgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDA7XG59O1xuXG5QcmljZUxpbmUucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgICB2YXIgbCA9IF8uY2xvbmUodGhpcy5saW5lKTtcblxuICAgIHZhciBwcmljZSA9IGwucHJpY2U7XG5cbiAgICBsLmltcG9ydCA9IGwucHJpY2UgKiBsLnF1YW50aXR5O1xuICAgIGlmICghaXNOYU4obC5wZXJpb2RzKSkge1xuICAgICAgICBsLmltcG9ydCA9IGwuaW1wb3J0ICogbC5wZXJpb2RzO1xuICAgIH1cblxuICAgIGlmIChsLmRpc2NvdW50KSB7XG4gICAgICAgIGwuaW1wb3J0ID0gbC5pbXBvcnQgKiAoMSAtIGwuZGlzY291bnQvMTAwKTtcbiAgICB9XG5cbiAgICBsLmJhc2VJbXBvcnQgPSBsLmltcG9ydDtcbiAgICBsLmJhc2VQcmljZSA9IGwucHJpY2U7XG5cbiAgICB0cmVlLmNoaWxkcy5wdXNoKGwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUxpbmU7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxudmFyIFByaWNlVmF0SW5jbHVkZWQgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDk7XG59O1xuXG5QcmljZVZhdEluY2x1ZGVkLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG5cbiAgICBmdW5jdGlvbiBhcHBseVZhdE5vZGUobm9kZSkge1xuICAgICAgICBfLmVhY2gobm9kZS50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICBpZiAodGF4LnR5cGUgPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlLmltcG9ydCA9IG5vZGUuaW1wb3J0ICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgICAgICBub2RlLnByaWNlID0gbm9kZS5wcmljZSAqICgxICsgdGF4LlBDLzEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGFwcGx5VmF0Tm9kZSk7XG4gICAgfVxuXG4gICAgYXBwbHlWYXROb2RlKHRyZWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZVZhdEluY2x1ZGVkO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJvdW5kKHZhbCwgcm91bmRpbmdUeXBlLCByb3VuZGluZykge1xuICAgIHZhciB2O1xuICAgIGlmICgoIXJvdW5kaW5nVHlwZSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJOT05FXCIpKSB7XG4gICAgICAgIHYgPSBNYXRoLnJvdW5kKHZhbCAvIDAuMDEpICogMC4wMTtcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDEpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiRkxPT1JcIikpIHtcbiAgICAgICAgdj0gTWF0aC5mbG9vcih2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDIpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiUk9VTkRcIikpIHtcbiAgICAgICAgdj0gTWF0aC5yb3VuZCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDMpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiQ0VJTFwiKSkge1xuICAgICAgICB2PSBNYXRoLmNlaWwodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCByb3VuZGluZ1R5cGU6IHJvdW5kaW5nVHlwZVwiKTtcbiAgICB9XG4gICAgcmV0dXJuICsoTWF0aC5yb3VuZCh2ICsgXCJlKzJcIikgICsgXCJlLTJcIik7XG59O1xuIl19
