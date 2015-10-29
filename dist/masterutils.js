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
},{"./creditcard.js":1,"./date_utils.js":2,"./price2.js":4,"./round.js":10}],4:[function(require,module,exports){
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
    "DISCOUNT": require("./price_discount.js"),
    "INSURANCE": require("./price_insurance.js")
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
},{"./date_utils":2,"./price_agregator.js":5,"./price_discount.js":6,"./price_insurance.js":7,"./price_line.js":8,"./price_vatincluded.js":9,"./round":10}],5:[function(require,module,exports){
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
    this.execOrder = line.execOrder || 9;
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
            if (! _.contains(l.attributes, rule.applyIdConceptAttribute)) return;
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
            if (! _.contains(l.attributes, rule.applyIdConceptAttribute.toString())) return;
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

var PriceInsurance = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 8;
};

PriceInsurance.prototype.modify = function(tree) {
    var self = this;
    var l = _.clone(this.line);


    var base = 0;
    _.each(tree.childs, function(l) {
        base += l.import;
    });

    var price;
    if (typeof self.line.price === "number") {
        price = self.line.price;
    } else if ( (typeof self.line.price==="object") && (self.line.price.type === 'PER') ) {
        price = base * self.line.price.pricePC/100;
        if (price<self.line.price.priceMin) price = self.line.price.priceMin;
    } else if ( (typeof self.line.price==="object") && (self.line.price.type === 'ESC') ) {
        price=Number.MAX_VALUE;
        _.each(self.line.price.scalePrices, function(sp) {
            if ((base <= sp.stayPriceMax) && (sp.price < price)) {
                price = sp.price;
            }
        });
        if (price === Number.MAX_VALUE) {
            price = NaN;
        }
    }


    l.import = price;
    l.baseImport = price;
    l.basePrice = price;
    l.quantity = 1;

    tree.childs.push(l);
};

module.exports = PriceInsurance;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var PriceVatIncluded = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 7;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvY3JlZGl0Y2FyZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2RhdGVfdXRpbHMuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9mYWtlXzJlNDRmYjQ5LmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2UyLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfYWdyZWdhdG9yLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfZGlzY291bnQuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV9pbnN1cmFuY2UuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9wcmljZV9saW5lLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfdmF0aW5jbHVkZWQuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9yb3VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cclxuXHJcbi8qXHJcblxyXG5UaGlzIHJvdXRpbmUgY2hlY2tzIHRoZSBjcmVkaXQgY2FyZCBudW1iZXIuIFRoZSBmb2xsb3dpbmcgY2hlY2tzIGFyZSBtYWRlOlxyXG5cclxuMS4gQSBudW1iZXIgaGFzIGJlZW4gcHJvdmlkZWRcclxuMi4gVGhlIG51bWJlciBpcyBhIHJpZ2h0IGxlbmd0aCBmb3IgdGhlIGNhcmRcclxuMy4gVGhlIG51bWJlciBoYXMgYW4gYXBwcm9wcmlhdGUgcHJlZml4IGZvciB0aGUgY2FyZFxyXG40LiBUaGUgbnVtYmVyIGhhcyBhIHZhbGlkIG1vZHVsdXMgMTAgbnVtYmVyIGNoZWNrIGRpZ2l0IGlmIHJlcXVpcmVkXHJcblxyXG5JZiB0aGUgdmFsaWRhdGlvbiBmYWlscyBhbiBlcnJvciBpcyByZXBvcnRlZC5cclxuXHJcblRoZSBzdHJ1Y3R1cmUgb2YgY3JlZGl0IGNhcmQgZm9ybWF0cyB3YXMgZ2xlYW5lZCBmcm9tIGEgdmFyaWV0eSBvZiBzb3VyY2VzIG9uIHRoZSB3ZWIsIGFsdGhvdWdoIHRoZSBcclxuYmVzdCBpcyBwcm9iYWJseSBvbiBXaWtlcGVkaWEgKFwiQ3JlZGl0IGNhcmQgbnVtYmVyXCIpOlxyXG5cclxuICBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NyZWRpdF9jYXJkX251bWJlclxyXG5cclxuUGFyYW1ldGVyczpcclxuICAgICAgICAgICAgY2FyZG51bWJlciAgICAgICAgICAgbnVtYmVyIG9uIHRoZSBjYXJkXHJcbiAgICAgICAgICAgIGNhcmRuYW1lICAgICAgICAgICAgIG5hbWUgb2YgY2FyZCBhcyBkZWZpbmVkIGluIHRoZSBjYXJkIGxpc3QgYmVsb3dcclxuXHJcbkF1dGhvcjogICAgIEpvaG4gR2FyZG5lclxyXG5EYXRlOiAgICAgICAxc3QgTm92ZW1iZXIgMjAwM1xyXG5VcGRhdGVkOiAgICAyNnRoIEZlYi4gMjAwNSAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgYnkgcmVxdWVzdFxyXG5VcGRhdGVkOiAgICAyN3RoIE5vdi4gMjAwNiAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgZnJvbSBXaWtpcGVkaWFcclxuVXBkYXRlZDogICAgMTh0aCBKYW4uIDIwMDggICAgICBBZGRpdGlvbmFsIGNhcmRzIGFkZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDI2dGggTm92LiAyMDA4ICAgICAgTWFlc3RybyBjYXJkcyBleHRlbmRlZFxyXG5VcGRhdGVkOiAgICAxOXRoIEp1bi4gMjAwOSAgICAgIExhc2VyIGNhcmRzIGV4dGVuZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDExdGggU2VwLiAyMDEwICAgICAgVHlwb3MgcmVtb3ZlZCBmcm9tIERpbmVycyBhbmQgU29sbyBkZWZpbml0aW9ucyAodGhhbmtzIHRvIE5vZSBMZW9uKVxyXG5VcGRhdGVkOiAgICAxMHRoIEFwcmlsIDIwMTIgICAgIE5ldyBtYXRjaGVzIGZvciBNYWVzdHJvLCBEaW5lcnMgRW5yb3V0ZSBhbmQgU3dpdGNoXHJcblVwZGF0ZWQ6ICAgIDE3dGggT2N0b2JlciAyMDEyICAgRGluZXJzIENsdWIgcHJlZml4IDM4IG5vdCBlbmNvZGVkXHJcblxyXG4qL1xyXG5cclxuLypcclxuICAgSWYgYSBjcmVkaXQgY2FyZCBudW1iZXIgaXMgaW52YWxpZCwgYW4gZXJyb3IgcmVhc29uIGlzIGxvYWRlZCBpbnRvIHRoZSBnbG9iYWwgY2NFcnJvck5vIHZhcmlhYmxlLlxyXG4gICBUaGlzIGNhbiBiZSBiZSB1c2VkIHRvIGluZGV4IGludG8gdGhlIGdsb2JhbCBlcnJvciAgc3RyaW5nIGFycmF5IHRvIHJlcG9ydCB0aGUgcmVhc29uIHRvIHRoZSB1c2VyXHJcbiAgIGlmIHJlcXVpcmVkOlxyXG5cclxuICAgZS5nLiBpZiAoIWNoZWNrQ3JlZGl0Q2FyZCAobnVtYmVyLCBuYW1lKSBhbGVydCAoY2NFcnJvcnMoY2NFcnJvck5vKTtcclxuKi9cclxuXHJcbnZhciBjY0Vycm9yTm8gPSAwO1xyXG52YXIgY2NFcnJvcnMgPSBbXTtcclxuXHJcbmNjRXJyb3JzIFswXSA9IFwiVW5rbm93biBjYXJkIHR5cGVcIjtcclxuY2NFcnJvcnMgWzFdID0gXCJObyBjYXJkIG51bWJlciBwcm92aWRlZFwiO1xyXG5jY0Vycm9ycyBbMl0gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBpcyBpbiBpbnZhbGlkIGZvcm1hdFwiO1xyXG5jY0Vycm9ycyBbM10gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBpcyBpbnZhbGlkXCI7XHJcbmNjRXJyb3JzIFs0XSA9IFwiQ3JlZGl0IGNhcmQgbnVtYmVyIGhhcyBhbiBpbmFwcHJvcHJpYXRlIG51bWJlciBvZiBkaWdpdHNcIjtcclxuY2NFcnJvcnMgWzVdID0gXCJXYXJuaW5nISBUaGlzIGNyZWRpdCBjYXJkIG51bWJlciBpcyBhc3NvY2lhdGVkIHdpdGggYSBzY2FtIGF0dGVtcHRcIjtcclxuXHJcbmZ1bmN0aW9uIGNoZWNrQ3JlZGl0Q2FyZCAoY2FyZG51bWJlcikge1xyXG5cclxuICAvLyBBcnJheSB0byBob2xkIHRoZSBwZXJtaXR0ZWQgY2FyZCBjaGFyYWN0ZXJpc3RpY3NcclxuICB2YXIgY2FyZHMgPSBbXTtcclxuXHJcbiAgLy8gRGVmaW5lIHRoZSBjYXJkcyB3ZSBzdXBwb3J0LiBZb3UgbWF5IGFkZCBhZGR0aW9uYWwgY2FyZCB0eXBlcyBhcyBmb2xsb3dzLlxyXG4gIC8vICBOYW1lOiAgICAgICAgIEFzIGluIHRoZSBzZWxlY3Rpb24gYm94IG9mIHRoZSBmb3JtIC0gbXVzdCBiZSBzYW1lIGFzIHVzZXInc1xyXG4gIC8vICBMZW5ndGg6ICAgICAgIExpc3Qgb2YgcG9zc2libGUgdmFsaWQgbGVuZ3RocyBvZiB0aGUgY2FyZCBudW1iZXIgZm9yIHRoZSBjYXJkXHJcbiAgLy8gIHByZWZpeGVzOiAgICAgTGlzdCBvZiBwb3NzaWJsZSBwcmVmaXhlcyBmb3IgdGhlIGNhcmRcclxuICAvLyAgY2hlY2tkaWdpdDogICBCb29sZWFuIHRvIHNheSB3aGV0aGVyIHRoZXJlIGlzIGEgY2hlY2sgZGlnaXRcclxuXHJcbiAgY2FyZHMgWzBdID0ge25hbWU6IFwiVmlzYVwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTMsMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNFwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMV0gPSB7bmFtZTogXCJNYXN0ZXJDYXJkXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI1MSw1Miw1Myw1NCw1NVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMl0gPSB7bmFtZTogXCJEaW5lcnNDbHViXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNCwxNlwiLCBcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzYsMzgsNTQsNTVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzNdID0ge25hbWU6IFwiQ2FydGVCbGFuY2hlXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNFwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzMDAsMzAxLDMwMiwzMDMsMzA0LDMwNVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNF0gPSB7bmFtZTogXCJBbUV4XCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNCwzN1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNV0gPSB7bmFtZTogXCJEaXNjb3ZlclwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjAxMSw2MjIsNjQsNjVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzZdID0ge25hbWU6IFwiSkNCXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbN10gPSB7bmFtZTogXCJlblJvdXRlXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIyMDE0LDIxNDlcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzhdID0ge25hbWU6IFwiU29sb1wiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjMzNCw2NzY3XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs5XSA9IHtuYW1lOiBcIlN3aXRjaFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNDkwMyw0OTA1LDQ5MTEsNDkzNiw1NjQxODIsNjMzMTEwLDYzMzMsNjc1OVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTBdID0ge25hbWU6IFwiTWFlc3Ryb1wiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTIsMTMsMTQsMTUsMTYsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNTAxOCw1MDIwLDUwMzgsNjMwNCw2NzU5LDY3NjEsNjc2Miw2NzYzXCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxMV0gPSB7bmFtZTogXCJWaXNhRWxlY3Ryb25cIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjQwMjYsNDE3NTAwLDQ1MDgsNDg0NCw0OTEzLDQ5MTdcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzEyXSA9IHtuYW1lOiBcIkxhc2VyQ2FyZFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTYsMTcsMTgsMTlcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNjMwNCw2NzA2LDY3NzEsNjcwOVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTNdID0ge25hbWU6IFwiVGVzdFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMTkxMlwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiBmYWxzZX07XHJcbiAgdmFyIHJlcyA9IHtcclxuICAgIHZhbGlkOiBmYWxzZVxyXG4gIH07XHJcblxyXG5cclxuICAvLyBFbnN1cmUgdGhhdCB0aGUgdXNlciBoYXMgcHJvdmlkZWQgYSBjcmVkaXQgY2FyZCBudW1iZXJcclxuICBpZiAoY2FyZG51bWJlci5sZW5ndGggPT09IDApICB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDE7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIE5vdyByZW1vdmUgYW55IHNwYWNlcyBmcm9tIHRoZSBjcmVkaXQgY2FyZCBudW1iZXJcclxuICBjYXJkbnVtYmVyID0gY2FyZG51bWJlci5yZXBsYWNlICgvXFxzL2csIFwiXCIpO1xyXG5cclxuICAvLyBDaGVjayB0aGF0IHRoZSBudW1iZXIgaXMgbnVtZXJpY1xyXG4gIHZhciBjYXJkTm8gPSBjYXJkbnVtYmVyO1xyXG4gIHZhciBjYXJkZXhwID0gL15bMC05XXsxMywxOX0kLztcclxuICBpZiAoIWNhcmRleHAuZXhlYyhjYXJkTm8pKSAge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSAyO1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICAvLyBFc3RhYmxpc2ggY2FyZCB0eXBlXHJcbiAgdmFyIGNhcmRUeXBlID0gLTE7XHJcbiAgZm9yICh2YXIgaT0wOyBpPGNhcmRzLmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgLy8gTG9hZCBhbiBhcnJheSB3aXRoIHRoZSB2YWxpZCBwcmVmaXhlcyBmb3IgdGhpcyBjYXJkXHJcbiAgICBwcmVmaXggPSBjYXJkc1tpXS5wcmVmaXhlcy5zcGxpdChcIixcIik7XHJcblxyXG4gICAgLy8gTm93IHNlZSBpZiBhbnkgb2YgdGhlbSBtYXRjaCB3aGF0IHdlIGhhdmUgaW4gdGhlIGNhcmQgbnVtYmVyXHJcbiAgICBmb3IgKGo9MDsgajxwcmVmaXgubGVuZ3RoOyBqKyspIHtcclxuICAgICAgdmFyIGV4cCA9IG5ldyBSZWdFeHAgKFwiXlwiICsgcHJlZml4W2pdKTtcclxuICAgICAgaWYgKGV4cC50ZXN0IChjYXJkTm8pKSBjYXJkVHlwZSA9IGk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBJZiBjYXJkIHR5cGUgbm90IGZvdW5kLCByZXBvcnQgYW4gZXJyb3JcclxuICBpZiAoY2FyZFR5cGUgPT0gLTEpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gMjtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXMuY2NOYW1lID0gY2FyZHNbY2FyZFR5cGVdLm5hbWU7XHJcblxyXG5cclxuXHJcbiAgdmFyIGo7XHJcbiAgLy8gTm93IGNoZWNrIHRoZSBtb2R1bHVzIDEwIGNoZWNrIGRpZ2l0IC0gaWYgcmVxdWlyZWRcclxuICBpZiAoY2FyZHNbY2FyZFR5cGVdLmNoZWNrZGlnaXQpIHtcclxuICAgIHZhciBjaGVja3N1bSA9IDA7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJ1bm5pbmcgY2hlY2tzdW0gdG90YWxcclxuICAgIHZhciBteWNoYXIgPSBcIlwiOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmV4dCBjaGFyIHRvIHByb2Nlc3NcclxuICAgIGogPSAxOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFrZXMgdmFsdWUgb2YgMSBvciAyXHJcblxyXG4gICAgLy8gUHJvY2VzcyBlYWNoIGRpZ2l0IG9uZSBieSBvbmUgc3RhcnRpbmcgYXQgdGhlIHJpZ2h0XHJcbiAgICB2YXIgY2FsYztcclxuICAgIGZvciAoaSA9IGNhcmROby5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCB0aGUgbmV4dCBkaWdpdCBhbmQgbXVsdGlwbHkgYnkgMSBvciAyIG9uIGFsdGVybmF0aXZlIGRpZ2l0cy5cclxuICAgICAgY2FsYyA9IE51bWJlcihjYXJkTm8uY2hhckF0KGkpKSAqIGo7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzdWx0IGlzIGluIHR3byBkaWdpdHMgYWRkIDEgdG8gdGhlIGNoZWNrc3VtIHRvdGFsXHJcbiAgICAgIGlmIChjYWxjID4gOSkge1xyXG4gICAgICAgIGNoZWNrc3VtID0gY2hlY2tzdW0gKyAxO1xyXG4gICAgICAgIGNhbGMgPSBjYWxjIC0gMTA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEFkZCB0aGUgdW5pdHMgZWxlbWVudCB0byB0aGUgY2hlY2tzdW0gdG90YWxcclxuICAgICAgY2hlY2tzdW0gPSBjaGVja3N1bSArIGNhbGM7XHJcblxyXG4gICAgICAvLyBTd2l0Y2ggdGhlIHZhbHVlIG9mIGpcclxuICAgICAgaWYgKGogPT0xKSB7XHJcbiAgICAgICAgaiA9IDI7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaiA9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBbGwgZG9uZSAtIGlmIGNoZWNrc3VtIGlzIGRpdmlzaWJsZSBieSAxMCwgaXQgaXMgYSB2YWxpZCBtb2R1bHVzIDEwLlxyXG4gICAgLy8gSWYgbm90LCByZXBvcnQgYW4gZXJyb3IuXHJcbiAgICBpZiAoY2hlY2tzdW0gJSAxMCAhPT0gMCkgIHtcclxuICAgICAgcmVzLmNjRXJyb3JObyA9IDM7XHJcbiAgICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgICByZXR1cm4gcmVzO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgaXQncyBub3QgYSBzcGFtIG51bWJlclxyXG4gIGlmIChjYXJkTm8gPT0gJzU0OTA5OTc3NzEwOTIwNjQnKSB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDU7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIFRoZSBmb2xsb3dpbmcgYXJlIHRoZSBjYXJkLXNwZWNpZmljIGNoZWNrcyB3ZSB1bmRlcnRha2UuXHJcbiAgdmFyIExlbmd0aFZhbGlkID0gZmFsc2U7XHJcbiAgdmFyIFByZWZpeFZhbGlkID0gZmFsc2U7XHJcblxyXG4gIC8vIFdlIHVzZSB0aGVzZSBmb3IgaG9sZGluZyB0aGUgdmFsaWQgbGVuZ3RocyBhbmQgcHJlZml4ZXMgb2YgYSBjYXJkIHR5cGVcclxuICB2YXIgcHJlZml4ID0gW107XHJcbiAgdmFyIGxlbmd0aHMgPSBbXTtcclxuXHJcbiAgLy8gU2VlIGlmIHRoZSBsZW5ndGggaXMgdmFsaWQgZm9yIHRoaXMgY2FyZFxyXG4gIGxlbmd0aHMgPSBjYXJkc1tjYXJkVHlwZV0ubGVuZ3RoLnNwbGl0KFwiLFwiKTtcclxuICBmb3IgKGo9MDsgajxsZW5ndGhzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBpZiAoY2FyZE5vLmxlbmd0aCA9PSBsZW5ndGhzW2pdKSBMZW5ndGhWYWxpZCA9IHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyBTZWUgaWYgYWxsIGlzIE9LIGJ5IHNlZWluZyBpZiB0aGUgbGVuZ3RoIHdhcyB2YWxpZC4gV2Ugb25seSBjaGVjayB0aGUgbGVuZ3RoIGlmIGFsbCBlbHNlIHdhcyBcclxuICAvLyBodW5reSBkb3J5LlxyXG4gIGlmICghTGVuZ3RoVmFsaWQpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gNDtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgcmVzLnZhbGlkID0gdHJ1ZTtcclxuXHJcbiAgLy8gVGhlIGNyZWRpdCBjYXJkIGlzIGluIHRoZSByZXF1aXJlZCBmb3JtYXQuXHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuLyo9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xyXG5cclxubW9kdWxlLmV4cG9ydHMuY2hlY2tDcmVkaXRDYXJkID0gY2hlY2tDcmVkaXRDYXJkO1xyXG5cclxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cblxudmFyIG1vbWVudCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93Wydtb21lbnQnXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ21vbWVudCddIDogbnVsbCk7XG5cbnZhciB2aXJ0dWFsVGltZSA9IG51bGw7XG5leHBvcnRzLm5vdyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh2aXJ0dWFsVGltZSkge1xuICAgICAgICByZXR1cm4gdmlydHVhbFRpbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5zZXRWaXJ0dWFsVGltZSA9IGZ1bmN0aW9uKHQpIHtcbiAgICB2aXJ0dWFsVGltZSA9IHQ7XG59O1xuXG5leHBvcnRzLmRhdGUyc3RyID0gZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgcmV0dXJuIGQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmRhdGUyaW50ID0gZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAodHlwZW9mIGQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBkO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgZCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgZCA9IG5ldyBEYXRlKGQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKGQuZ2V0VGltZSgpIC8gODY0MDAwMDApO1xufTtcblxuXG5leHBvcnRzLmludERhdGUyc3RyID0gZnVuY3Rpb24oZCkge1xuICAgIHZhciBkdDtcbiAgICBpZiAoZCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgZHQgPSBkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgfVxuICAgIHJldHVybiBkdC50b0lTT1N0cmluZygpLnN1YnN0cmluZygwLDEwKTtcbn07XG5cbmV4cG9ydHMuaW50MmRhdGUgPSBmdW5jdGlvbihkKSB7XG4gICAgaWYgKGQgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gZDtcbiAgICB2YXIgZHQgPSBuZXcgRGF0ZShkKjg2NDAwMDAwKTtcbiAgICByZXR1cm4gZHQ7XG59O1xuXG5leHBvcnRzLnRvZGF5ID0gZnVuY3Rpb24odHopIHtcbiAgICB0eiA9IHR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KHR6KTtcbiAgICB2YXIgZGF0ZVN0ciA9IGR0LmZvcm1hdCgnWVlZWS1NTS1ERCcpO1xuICAgIHZhciBkdDIgPSBuZXcgRGF0ZShkYXRlU3RyKydUMDA6MDA6MDAuMDAwWicpO1xuXG4gICAgcmV0dXJuIGR0Mi5nZXRUaW1lKCkgLyA4NjQwMDAwMDtcbn07XG5cblxuXG5cblxuLy8vIENST04gSU1QTEVNRU5UQVRJT05cblxuZnVuY3Rpb24gbWF0Y2hOdW1iZXIobiwgZmlsdGVyKSB7XG4gICAgbiA9IHBhcnNlSW50KG4pO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSAnKicpIHJldHVybiB0cnVlO1xuICAgIGlmIChmaWx0ZXIgPT09IG4pIHJldHVybiB0cnVlO1xuICAgIHZhciBmID0gZmlsdGVyLnRvU3RyaW5nKCk7XG4gICAgdmFyIG9wdGlvbnMgPSBmLnNwbGl0KCcsJyk7XG4gICAgZm9yICh2YXIgaT0wOyBpPG9wdGlvbnM7IGkrPTEpIHtcbiAgICAgICAgdmFyIGFyciA9IG9wdGlvbnNbaV0uc3BsaXQoJy0nKTtcbiAgICAgICAgaWYgKGFyci5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGlmIChwYXJzZUludChhcnJbMF0sMTApID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChhcnIubGVuZ3RoID09PTIpIHtcbiAgICAgICAgICAgIHZhciBmcm9tID0gcGFyc2VJbnQoYXJyWzBdLDEwKTtcbiAgICAgICAgICAgIHZhciB0byA9IHBhcnNlSW50KGFyclsxXSwxMCk7XG4gICAgICAgICAgICBpZiAoKG4+PWZyb20gKSAmJiAobjw9IHRvKSkgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpIHtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigwLDIpLCBqb2IubWludXRlKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDIsMiksIGpvYi5ob3VyKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDQsMiksIGpvYi5kYXlPZk1vbnRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDYsMiksIGpvYi5tb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig4LDEpLCBqb2IuZGF5T2ZXZWVrKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG52YXIgY3JvbkpvYnMgPSBbXTtcbmV4cG9ydHMuYWRkQ3JvbkpvYiA9IGZ1bmN0aW9uKGpvYikge1xuXG5cbiAgICBqb2IudHogPSBqb2IudHogfHwgJ1VUQyc7XG5cbiAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuICAgIGpvYi5sYXN0ID0gY3JvbkRhdGU7XG4gICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgIGNyb25Kb2JzLnB1c2goam9iKTtcbiAgICByZXR1cm4gY3JvbkpvYnMubGVuZ3RoIC0xO1xufTtcblxuZXhwb3J0cy5kZWxldGVDcm9uSm9iID0gZnVuY3Rpb24oaWRKb2IpIHtcbiAgICBkZWxldGUgY3JvbkpvYnNbaWRKb2JdO1xufTtcblxuLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25lIGEgbWludXRlIGluIHRoZSBiZWdpbmluZyBvZiBlYWNoIG1pbnV0ZS5cbi8vIGl0IGlzIHVzZWQgdG8gY3JvbiBhbnkgZnVuY3Rpb25cbnZhciBvbk1pbnV0ZSA9IGZ1bmN0aW9uKCkge1xuXG5cbiAgICBjcm9uSm9icy5mb3JFYWNoKGZ1bmN0aW9uKGpvYikge1xuICAgICAgICBpZiAoIWpvYikgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eihqb2IudHopO1xuICAgICAgICB2YXIgY3JvbkRhdGUgPSBkdC5mb3JtYXQoJ21tSEhERE1NZCcpO1xuXG4gICAgICAgIGlmICgoY3JvbkRhdGUgIT09IGpvYi5sYXN0KSAmJiAobWF0Y2hKb2Ioam9iLCBjcm9uRGF0ZSkpKSB7XG4gICAgICAgICAgICBpZiAoam9iLmV4ZWN1dGluZykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSm9iIHRha2VzIHRvbyBsb25nIHRvIGV4ZWN1dGU6IFwiICsgam9iLm5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGpvYi5jYihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgam9iLmV4ZWN1dGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgbm93ID0gZXhwb3J0cy5ub3coKS5nZXRUaW1lKCk7XG4gICAgdmFyIG1pbGxzVG9OZXh0TWludXRlID0gNjAwMDAgLSBub3cgJSA2MDAwMDtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBvbk1pbnV0ZSgpO1xuICAgIH0sIG1pbGxzVG9OZXh0TWludXRlKTtcbn07XG5cbm9uTWludXRlKCk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXG4oZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgbWFzdGVyVXRpbHMgPSB7XG4gICAgICAgIGRhdGVVdGlsczogcmVxdWlyZSgnLi9kYXRlX3V0aWxzLmpzJyksXG4gICAgICAgIHJvdW5kOiByZXF1aXJlKCcuL3JvdW5kLmpzJyksXG4gICAgICAgIFByaWNlOiAgbnVsbCxcbiAgICAgICAgUHJpY2UyOiByZXF1aXJlKCcuL3ByaWNlMi5qcycpLFxuICAgICAgICBjaGVja3M6IHtcbiAgICAgICAgICAgIGNoZWNrQ3JlZGl0Q2FyZDogcmVxdWlyZSgnLi9jcmVkaXRjYXJkLmpzJykuY2hlY2tDcmVkaXRDYXJkXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHJvb3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmICYmIHNlbGYgfHxcbiAgICAgICAgICAgIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IG1hc3RlclV0aWxzO1xuICAgICAgICB9XG4gICAgICAgIGV4cG9ydHMubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgd2luZG93Lm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfVxuXG59KCkpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgcm91bmQgPSByZXF1aXJlKCcuL3JvdW5kJyk7XG52YXIgZHUgPSByZXF1aXJlKCcuL2RhdGVfdXRpbHMnKTtcblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuKi9cblxuXG52YXIgcmVnaXN0ZXJlZE1vZGlmaWVycyA9IHtcbiAgICBcIkFHUkVHQVRPUlwiOiByZXF1aXJlKFwiLi9wcmljZV9hZ3JlZ2F0b3IuanNcIiksXG4gICAgXCJMSU5FXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2xpbmUuanNcIiksXG4gICAgXCJWQVRJTkNMVURFRFwiOiByZXF1aXJlKFwiLi9wcmljZV92YXRpbmNsdWRlZC5qc1wiKSxcbiAgICBcIkRJU0NPVU5UXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2Rpc2NvdW50LmpzXCIpLFxuICAgIFwiSU5TVVJBTkNFXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2luc3VyYW5jZS5qc1wiKVxufTtcblxudmFyIFByaWNlMiA9IGZ1bmN0aW9uKHAxLCBwMikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLmxpbmVzID0gW107XG4gICAgc2VsZi5vcHRpb25zID0ge307XG4gICAgXy5lYWNoKGFyZ3VtZW50cywgZnVuY3Rpb24ocCkge1xuICAgICAgICBpZiAocCkge1xuICAgICAgICAgICAgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJihwLmxpbmVzKSkge1xuICAgICAgICAgICAgICAgIF8uZWFjaChwLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKGwpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgXy5lYWNoKHAsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUobCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYocC5jbGFzcyB8fCBwLmxhYmVsKSkge1xuICAgICAgICAgICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKHApKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9wdGlvbnMgPSBwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBzZWxmLnRyZWVWYWxpZD1mYWxzZTtcbiAgICBzZWxmLnJlbmRlclZhbGlkPWZhbHNlO1xuICAgIHNlbGYucmVuZGVyVHJlZVZhbGlkPWZhbHNlO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS5hZGRQcmljZSA9IGZ1bmN0aW9uKHApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFwKSByZXR1cm47XG4gICAgdmFyIGNwO1xuICAgIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYgKHAubGluZXMpKSB7XG4gICAgICAgIGNwID0gcC5saW5lcztcbiAgICB9IGVsc2UgaWYgKGNwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3AgPSBwO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgY3AgPSBbcF07XG4gICAgfVxuICAgIF8uZWFjaChjcCwgZnVuY3Rpb24obCkge1xuICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgfSk7XG4gICAgc2VsZi50cmVlVmFsaWQ9ZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJWYWxpZCA9IGZhbHNlO1xuICAgIHNlbGYucmVuZGVyVHJlZVZhbGlkID0gZmFsc2U7XG59O1xuXG5cblByaWNlMi5wcm90b3R5cGUuY29uc3RydWN0VHJlZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gc29ydFRyZWUobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5jaGlsZHMpIHtcbiAgICAgICAgICAgIG5vZGUuY2hpbGRzID0gXy5zb3J0QnlBbGwobm9kZS5jaGlsZHMsIFtcIm9yZGVyXCIsIFwic3Vib3JkZXJcIl0pO1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBzb3J0VHJlZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjVG90YWwobm9kZSkge1xuICAgICAgICBub2RlLmltcG9ydCA9IG5vZGUuaW1wb3J0IHx8IDA7XG4gICAgICAgIGlmIChub2RlLmNoaWxkcykge1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5pbXBvcnQgKz0gY2FsY1RvdGFsKGMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGUuaW1wb3J0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJvdW5kSW1wb3J0cyhub2RlKSB7XG4gICAgICAgIG5vZGUuaW1wb3J0ID0gcm91bmQobm9kZS5pbXBvcnQsIFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgcm91bmRJbXBvcnRzKTtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi50cmVlVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYudG90YWw7XG4gICAgfVxuXG4gICAgc2VsZi50b3RhbCA9IHtcbiAgICAgICAgaWQ6IFwidG90YWxcIixcbiAgICAgICAgbGFiZWw6IFwiQFRvdGFsXCIsXG4gICAgICAgIGNoaWxkczogW10sXG5cbiAgICAgICAgc2hvd0lmWmVybzogdHJ1ZSxcbiAgICAgICAgdG90YWxPbkJvdHRvbTogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgbW9kaWZpZXJzID0gW107XG5cbiAgICB2YXIgaSA9MDtcblxuICAgIF8uZWFjaChzZWxmLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGwuc3Vib3JkZXIgPSBpKys7ICAgICAgICAgICAgICAgLy8gc3Vib3JkZXIgaXMgdGhlIG9yaWdpbmFsIG9yZGVyLiBJbiBjYXNlIG9mIHRpZSB1c2UgdGhpcy5cbiAgICAgICAgbC5jbGFzcyA9IGwuY2xhc3MgfHwgXCJMSU5FXCI7XG4gICAgICAgIGlmICghcmVnaXN0ZXJlZE1vZGlmaWVyc1tsLmNsYXNzXSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9kaWZpZXIgXCIgKyBsLmNsYXNzICsgXCIgbm90IGRlZmluZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtb2RpZmllciA9IG5ldyByZWdpc3RlcmVkTW9kaWZpZXJzW2wuY2xhc3NdKGwpO1xuICAgICAgICBtb2RpZmllci5zdWJvcmRlciA9IGk7XG4gICAgICAgIG1vZGlmaWVycy5wdXNoKG1vZGlmaWVyKTtcbiAgICB9KTtcblxuICAgIG1vZGlmaWVycyA9IF8uc29ydEJ5QWxsKG1vZGlmaWVycywgW1wiZXhlY09yZGVyXCIsIFwiZXhlY1N1Yk9yZGVyXCIsIFwic3Vib3JkZXJcIl0pO1xuXG4gICAgXy5lYWNoKG1vZGlmaWVycywgZnVuY3Rpb24obSkge1xuICAgICAgICBtLm1vZGlmeShzZWxmLnRvdGFsLCBzZWxmLm9wdGlvbnMpO1xuICAgIH0pO1xuXG4gICAgc29ydFRyZWUoc2VsZi50b3RhbCk7XG5cbiAgICBjYWxjVG90YWwoc2VsZi50b3RhbCk7XG4gICAgcm91bmRJbXBvcnRzKHNlbGYudG90YWwpO1xuXG4gICAgc2VsZi50cmVlVmFsaWQgPSB0cnVlO1xuICAgIHJldHVybiBzZWxmLnRvdGFsO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuXG5cbi8qXG4vLyBWSVNVQUxJWkFUSU9OIEZMQUdTIElOIEVBQ0ggTk9ERVxuICAgIHNob3dJZlplcm86ICAgICAgICAgU2hvdyBldmVuIGlmIFRvdGFsIGlzIHplcm9cbiAgICBpZk9uZUhpZGVQYXJlbnQ6ICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhpcyBncm91cCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2UgaXQgd2l0aCB0aGUgY2hhbGRcbiAgICBpZk9uZUhpZGVDaGlsZDogICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhlIGNoaWxkXG4gICAgaGlkZVRvdGFsOiAgICAgICAgICBKdXN0IHJlbW92ZSAgdGhlIHRvdGFsIGFuZCBwdXQgYWxsIHRoZSBjaGlsZHNcbiAgICB0b3RhbE9uQm90dG9tOiAgICAgICAgIFB1dCB0aGUgVG90YWwgb24gdGhlIGRvcFxuICAgIGhpZGVEZXRhaWw6ICAgICAgICAgRG8gbm90IHNob3cgdGhlIGRldGFpbHNcbiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbmRlck5vZGUobm9kZSwgbGV2ZWwpIHtcblxuICAgICAgICB2YXIgcmVuZGVyVG90YWwgPSB0cnVlO1xuICAgICAgICB2YXIgcmVuZGVyRGV0YWlsID0gdHJ1ZTtcbiAgICAgICAgaWYgKCghbm9kZS5zaG93SWZaZXJvKSAmJiAobm9kZS5pbXBvcnQgPT09IDApKSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICBpZiAoKG5vZGUuY2hpbGRzKSYmKG5vZGUuY2hpbGRzLmxlbmd0aCA9PT0gMSkmJighbm9kZS5oaWRlRGV0YWlsKSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlUGFyZW50KSByZW5kZXJUb3RhbCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKG5vZGUuaWZPbmVIaWRlQ2hpbGQpIHJlbmRlckRldGFpbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlLmhpZGVEZXRhaWwpIHJlbmRlckRldGFpbD0gZmFsc2U7XG4gICAgICAgIGlmIChub2RlLmhpZGVUb3RhbCkgcmVuZGVyVG90YWw9ZmFsc2U7XG5cbiAgICAgICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKG5vZGUpO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5jaGlsZHM7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLnNob3dJZlplcm87XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmhpZGVEZXRhaWw7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmhpZGVUb3RhbDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaWZPbmVIaWRlUGFyZW50O1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5pZk9uZUhpZGVDaGlsZDtcbiAgICAgICAgbmV3Tm9kZS5sZXZlbCA9IGxldmVsO1xuXG4gICAgICAgIGlmICgocmVuZGVyVG90YWwpICYmICghbm9kZS50b3RhbE9uQm90dG9tKSkge1xuICAgICAgICAgICAgc2VsZi5yZW5kZXJSZXN1bHQucHVzaChuZXdOb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZW5kZXJEZXRhaWwpIHtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24oY2hpbGROb2RlKSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyTm9kZShjaGlsZE5vZGUsIHJlbmRlclRvdGFsID8gbGV2ZWwgKzEgOiBsZXZlbCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHJlbmRlclRvdGFsKSAmJiAobm9kZS50b3RhbE9uQm90dG9tKSkge1xuICAgICAgICAgICAgc2VsZi5yZW5kZXJSZXN1bHQucHVzaChuZXdOb2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLnJlbmRlclZhbGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnJlbmRlclJlc3VsdDtcbiAgICB9XG5cbiAgICBzZWxmLnJlbmRlclJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICByZW5kZXJOb2RlKHNlbGYudG90YWwsIDApO1xuXG4gICAgc2VsZi5yZW5kZXJWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYucmVuZGVyUmVzdWx0O1xufTtcblxuXG5QcmljZTIucHJvdG90eXBlLnJlbmRlclRyZWUgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuXG5cbi8qXG4vLyBWSVNVQUxJWkFUSU9OIEZMQUdTIElOIEVBQ0ggTk9ERVxuICAgIHNob3dJZlplcm86ICAgICAgICAgU2hvdyBldmVuIGlmIFRvdGFsIGlzIHplcm9cbiAgICBpZk9uZUhpZGVQYXJlbnQ6ICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhpcyBncm91cCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2UgaXQgd2l0aCB0aGUgY2hhbGRcbiAgICBpZk9uZUhpZGVDaGlsZDogICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhlIGNoaWxkXG4gICAgaGlkZVRvdGFsOiAgICAgICAgICBKdXN0IHJlbW92ZSAgdGhlIHRvdGFsIGFuZCBwdXQgYWxsIHRoZSBjaGlsZHNcbiAgICB0b3RhbE9uQm90dG9tOiAgICAgICAgIFB1dCB0aGUgVG90YWwgb24gdGhlIGRvcFxuICAgIGhpZGVEZXRhaWw6ICAgICAgICAgRG8gbm90IHNob3cgdGhlIGRldGFpbHNcbiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbmRlclRyZWVOb2RlKG5vZGUsIHBhcmVudE5vZGUpIHtcblxuXG4gICAgICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZShub2RlKTtcbiAgICAgICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcblxuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgcmVuZGVyVHJlZU5vZGUoY2hpbGROb2RlLCBuZXdOb2RlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJlbmRlclRvdGFsID0gdHJ1ZTtcbiAgICAgICAgdmFyIHJlbmRlckRldGFpbCA9IHRydWU7XG4gICAgICAgIGlmICgoIW5vZGUuc2hvd0lmWmVybykgJiYgKG5vZGUuaW1wb3J0ID09PSAwKSkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgaWYgKChuZXdOb2RlLmNoaWxkcy5sZW5ndGggPT09IDEpJiYoIW5vZGUuaGlkZURldGFpbCkpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZVBhcmVudCkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZUNoaWxkKSByZW5kZXJEZXRhaWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS5oaWRlRGV0YWlsKSByZW5kZXJEZXRhaWw9IGZhbHNlO1xuICAgICAgICBpZiAobm9kZS5oaWRlVG90YWwpIHJlbmRlclRvdGFsPWZhbHNlO1xuXG4gICAgICAgIC8vICAgICAgICAgICAgbmV3Tm9kZS5wYXJlbnQgPSBwYXJlbnROb2RlO1xuXG4gICAgICAgIGlmICghcmVuZGVyRGV0YWlsKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcyA9IFtdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAocmVuZGVyVG90YWwpIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnJlbmRlclRyZWVSZXN1bHQgPSBuZXdOb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgaGlkZVRvdGFsOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uZWFjaChuZXdOb2RlLmNoaWxkcywgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUuY2hpbGRzLnB1c2gobik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TGV2ZWwobm9kZSwgbGV2ZWwpIHtcbiAgICAgICAgbm9kZS5sZXZlbCA9IGxldmVsO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIHNldExldmVsKG4sIGxldmVsKzEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi5yZW5kZXJUcmVlVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyVHJlZVJlc3VsdDtcbiAgICB9XG5cbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHNlbGYucmVuZGVyVHJlZVJlc3VsdCA9IG51bGw7XG5cbiAgICByZW5kZXJUcmVlTm9kZShzZWxmLnRvdGFsLCBudWxsKTtcblxuICAgIHNldExldmVsKHNlbGYucmVuZGVyVHJlZVJlc3VsdCwgMCk7XG5cbiAgICBzZWxmLnJlbmRlclRyZWVWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYucmVuZGVyVHJlZVJlc3VsdDtcbn07XG5cbmZ1bmN0aW9uIGZpbmROb2RlKG5vZGUsIGlkKSB7XG4gICAgdmFyIGk7XG4gICAgaWYgKCFub2RlKSByZXR1cm4gbnVsbDtcbiAgICBpZiAobm9kZS5pZCA9PT0gaWQpIHJldHVybiBub2RlO1xuICAgIGlmICghbm9kZS5jaGlsZHMpIHJldHVybiBudWxsO1xuICAgIGZvciAoaT0wOyBpPG5vZGUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICB2YXIgZk5vZGUgPSBmaW5kTm9kZShub2RlLmNoaWxkc1tpXSwgaWQpO1xuICAgICAgICBpZiAoZk5vZGUpIHJldHVybiBmTm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cblByaWNlMi5wcm90b3R5cGUuZ2V0SW1wb3J0ID0gZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWQgPSBpZCB8fCBcInRvdGFsXCI7XG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICB2YXIgbm9kZSA9IGZpbmROb2RlKHNlbGYudG90YWwsIGlkKTtcblxuICAgIGlmIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmltcG9ydDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG5QcmljZTIucHJvdG90eXBlLmFkZEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihhdHJpYnV0ZSkge1xuICAgIHZhciBzZWxmPXRoaXM7XG4gICAgdmFyIGF0dHJzO1xuICAgIGlmICh0eXBlb2YgYXRyaWJ1dGUgPT09IFwic3RyaW5nXCIgKSB7XG4gICAgICAgIGF0dHJzID0gW2F0cmlidXRlXTtcbiAgICB9IGVsc2UgaWYgKGF0cmlidXRlIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgYXR0cnMgPSBhdHJpYnV0ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEF0dHJpYnV0ZVwiKTtcbiAgICB9XG4gICAgXy5lYWNoKGF0dHJzLCBmdW5jdGlvbihhKSB7XG4gICAgICAgIF8uZWFjaChzZWxmLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBpZiAoIWwuYXR0cmlidXRlcykgbC5hdHRyaWJ1dGVzID0gW107XG4gICAgICAgICAgICBpZiAoIV8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBhKSkge1xuICAgICAgICAgICAgICAgIGwuYXR0cmlidXRlcy5wdXNoKGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cblByaWNlMi5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9iai5saW5lcyA9IF8ubWFwKHRoaXMubGluZXMsIF8uY2xvbmUpO1xuICAgIF8uZWFjaChvYmoubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsLmZyb20gPT09IFwibnVtYmVyXCIpIGwuZnJvbSA9IGR1LmludDJkYXRlKGwuZnJvbSk7XG4gICAgICAgIGlmICh0eXBlb2YgbC50byA9PT0gXCJudW1iZXJcIikgbC50byA9IGR1LmludDJkYXRlKGwudG8pO1xuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2UyO1xuXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxuLypcblxuQWdyZWdhdGUgTW9kaWZpZXJcbj09PT09PT09PT09PT09PT09XG5cbiAgICBncm91cEJ5ICAgICAgICAgICAgIEZsYWcgb2YgdGhlIGxpbmVzIHRoYXQgc2hvdWxkIGJlIHJlcGxhY2VkXG4gICAgZXhlY09yZGVyICAgICAgICAgICBPcmRlciBpbiB3aGljaCB0aGlzIG1vZGlmaWVyIGkgZXhjZXZ1dGVkLlxuXG59XG5cbiovXG5cbnZhciBQcmljZUFncmVnYXRvciA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgOTtcbiAgICB0aGlzLmdyb3VwQnkgPSBsaW5lLmdyb3VwQnk7XG59O1xuXG5QcmljZUFncmVnYXRvci5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbmV3Tm9kZSA9IF8uY2xvbmUodGhpcy5saW5lKTtcbiAgICBuZXdOb2RlLmNoaWxkcyA9IFtdO1xuICAgIHZhciBpLGw7XG4gICAgZm9yIChpPTA7IGk8dHJlZS5jaGlsZHMubGVuZ3RoOyBpKz0xKSB7XG4gICAgICAgIGw9dHJlZS5jaGlsZHNbaV07XG4gICAgICAgIGlmIChfLmNvbnRhaW5zKGwuYXR0cmlidXRlcywgc2VsZi5ncm91cEJ5KSkge1xuICAgICAgICAgICAgbmV3Tm9kZS5jaGlsZHMucHVzaChsKTtcbiAgICAgICAgICAgIHRyZWUuY2hpbGRzW2ldID0gdHJlZS5jaGlsZHNbdHJlZS5jaGlsZHMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgdHJlZS5jaGlsZHMucG9wKCk7XG4gICAgICAgICAgICBpLT0xO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRyZWUuY2hpbGRzLnB1c2gobmV3Tm9kZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlQWdyZWdhdG9yO1xuXG5cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIGR1PSByZXF1aXJlKFwiLi9kYXRlX3V0aWxzLmpzXCIpO1xuXG4vKlxuXG5EaXNjb3VudCBNb2RpZmllclxuPT09PT09PT09PT09PT09PT1cblxuICAgIHBoYXNlICAgICAgICAgICAgIEZsYWcgb2YgdGhlIGxpbmVzIHRoYXQgc2hvdWxkIGJlIHJlcGxhY2VkXG4gICAgZXhlY09yZGVyICAgICAgICAgICBPcmRlciBpbiB3aGljaCB0aGlzIG1vZGlmaWVyIGkgZXhjZXZ1dGVkLlxuICAgIHJ1bGVzICAgICAgICAgICAgICBBcnJheSBvZiBydWxlc1xuXG5cblxufVxuXG4qL1xuXG52YXIgUHJpY2VEaXNjb3VudCA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgICB0aGlzLmV4ZWNTdWJvcmRlciA9IGxpbmUucGhhc2U7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDU7XG5cbn07XG5cblByaWNlRGlzY291bnQucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUsIG9wdGlvbnMpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIHJ1bGVEb2VzQXBwbHkgKHJ1bGUpIHtcbiAgICAgICAgdmFyIGlSZXNlcnZhdGlvbiA9IGR1LmRhdGUyaW50KG9wdGlvbnMucmVzZXJ2YXRpb24pO1xuICAgICAgICBpZiAoKHJ1bGUucmVzZXJ2YXRpb25NaW4pJiYoaVJlc2VydmF0aW9uIDwgZHUuZGF0ZTJpbnQocnVsZS5yZXNlcnZhdGlvbk1pbikpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5yZXNlcnZhdGlvbk1heCkmJihpUmVzZXJ2YXRpb24gPiBkdS5kYXRlMmludChydWxlLnJlc2VydmF0aW9uTWF4KSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGlDaGVja2luID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja2luKTtcbiAgICAgICAgdmFyIGlDaGVja291dCA9IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tvdXQpO1xuICAgICAgICBpZiAoKHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW4pJiYoIGlDaGVja2luIC0gaVJlc2VydmF0aW9uIDwgcnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbiApKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbiB8fCBydWxlLmRheXNCZWZvcmVDaGVja2luTWluPT09MCkmJiggaUNoZWNraW4gLSBpUmVzZXJ2YXRpb24gPiBydWxlLmRheXNCZWZvcmVDaGVja2luTWF4ICkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmNoZWNraW5NaW4pJiYoIGlDaGVja2luIDwgZHUuZGF0ZTJpbnQocnVsZS5jaGVja2luTWluKSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmNoZWNraW5NYXgpJiYoIGlDaGVja2luID4gZHUuZGF0ZTJpbnQocnVsZS5jaGVja2luTWF4KSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmNoZWNrb3V0TWluKSYmKCBpQ2hlY2tvdXQgPCBkdS5kYXRlMmludChydWxlLmNoZWNrb3V0TWluKSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmNoZWNrb3V0TWF4KSYmKCBpQ2hlY2tvdXQgPiBkdS5kYXRlMmludChydWxlLmNoZWNrb3V0TWF4KSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLm1pblN0YXkpJiYoIGlDaGVja291dCAtIGlDaGVja2luIDwgcnVsZS5taW5TdGF5KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUubWF4U3RheSB8fCBydWxlLm1heFN0YXk9PT0wKSYmKCBpQ2hlY2tvdXQgLSBpQ2hlY2tpbiA8IHJ1bGUubWF4U3RheSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBwcm9wb3J0aW9uQXBwbHkoaUluLCBpT3V0LCBpQXBwbHlGcm9tLCBpQXBwbHlUbykge1xuICAgICAgICB2YXIgYSA9IGlJbiA+IGlBcHBseUZyb20gPyBpSW4gOiBpQXBwbHlGcm9tO1xuICAgICAgICB2YXIgYiA9IGlPdXQgPCBpQXBwbHlUbyA/IGlPdXQgOiBpQXBwbHlUbztcbiAgICAgICAgaWYgKGI+YSkgcmV0dXJuIDA7XG4gICAgICAgIHJldHVybiAoYi1hKS8oaU91dC1pSW4pO1xuICAgIH1cbi8qXG4gICAgZnVuY3Rpb24gbGluZUZyb21SdWxlKHJ1bGUpIHtcbiAgICAgICAgdmFyIG5ld0xpbmUgPSBfLmNsb25lKHNlbGYubGluZSk7XG4gICAgICAgIHZhciBwcm9wb3J0aW9uO1xuICAgICAgICB2YXIgdmF0ID0wO1xuICAgICAgICB2YXIgYmFzZSA9MDtcbiAgICAgICAgdmFyIHRvdGFsSW1wb3J0ID0wO1xuXG4gICAgICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgaWYgKCEgXy5jb250YWlucyhsLmF0dHJpYnV0ZXMsIHJ1bGUuYXBwbHlJZENvbmNlcHRBdHRyaWJ1dGUpKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoISBsLmJhc2VJbXBvcnQpIHJldHVybjtcblxuICAgICAgICAgICAgaWYgKHJ1bGUuYXBwbGljYXRpb25UeXBlID09PSBcIldIT0xFXCIpIHtcbiAgICAgICAgICAgICAgICBwcm9wb3J0aW9uID0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvcG9ydGlvbiA9IHByb3BvcnRpb25BcHBseShcbiAgICAgICAgICAgICAgICAgICAgbC5mcm9tID8gZHUuZGF0ZTJpbnQobC5mcm9tKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbiksXG4gICAgICAgICAgICAgICAgICAgIGwudG8gPyBkdS5kYXRlMmludChsLnRvKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tvdXQpLFxuICAgICAgICAgICAgICAgICAgICBkdS5kYXRlMmludChydWxlLmFwcGx5RnJvbSksXG4gICAgICAgICAgICAgICAgICAgIGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlUbykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbFZhdCA9IDA7XG4gICAgICAgICAgICBfLmVhY2gobC50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxWYXQgPSB0YXguUEM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhdCA9ICh2YXQqYmFzZSArIGxWYXQqbC5iYXNlSW1wb3J0ICogcHJvcG9ydGlvbikgLyAoYmFzZSArIGwuYmFzZUltcG9ydCAqIHByb3BvcnRpb24pO1xuICAgICAgICAgICAgYmFzZSA9IGJhc2UgKyBsLmJhc2VJbXBvcnQgKiBwcm9wb3J0aW9uO1xuICAgICAgICAgICAgdG90YWxJbXBvcnQgKz0gbC5pbXBvcnQgKiBwcm9wb3J0aW9uO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZXdMaW5lLmJhc2VJbXBvcnQgPSBiYXNlICogKCAxLSBydWxlLmFwcGx5RGlzY291bnRQQy8xMDApO1xuICAgICAgICBuZXdMaW5lLmltcG9ydCA9IGJhc2UgKiAoIDEtIHJ1bGUuYXBwbHlEaXNjb3VudFBDLzEwMCk7XG5cbiAgICAgICAgbmV3TGluZS50YXhlcyA9IG5ld0xpbmUudGF4ZXMgfHwgW107XG5cbiAgICAgICAgdmFyIHRheCA9IF8uZmluZFdoZXJlKG5ld0xpbmUudGF4ZXMse3R5cGU6IFwiVkFUXCJ9KTtcbiAgICAgICAgaWYgKCF0YXgpIHtcbiAgICAgICAgICAgIHRheCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIlZBVFwiXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbmV3TGluZS50YXhlcy5wdXNoID0gdGF4O1xuICAgICAgICB9XG4gICAgICAgIHRheC5QQyA9IHZhdDtcblxuICAgICAgICByZXR1cm4gbmV3TGluZTtcbiAgICB9XG4qL1xuXG4gICAgZnVuY3Rpb24gZGF5c0luUnVsZShsaW5lLCBydWxlKSB7XG4gICAgICAgIHZhciBhLGIsaTtcbiAgICAgICAgdmFyIGRheXMgPSBbXTtcbiAgICAgICAgdmFyIGxGcm9tID0gbC5mcm9tID8gZHUuZGF0ZTJpbnQobC5mcm9tKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbik7XG4gICAgICAgIHZhciBsVG8gPSBsLnRvID8gZHUuZGF0ZTJpbnQobC50bykgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNrb3V0KTtcbiAgICAgICAgaWYgKHJ1bGUuYXBwbGljYXRpb25UeXBlID09PSBcIldIT0xFXCIpIHtcbiAgICAgICAgICAgIGEgPSBsRnJvbTtcbiAgICAgICAgICAgIGIgPSBsVG87XG4gICAgICAgIH0gZWxzZSBpZiAocnVsZS5hcHBsaWNhdGlvblR5cGUgPT09IFwiQllEQVlcIikge1xuICAgICAgICAgICAgdmFyIHJGcm9tID0gZHUuZGF0ZTJpbnQocnVsZS5hcHBseUZyb20pO1xuICAgICAgICAgICAgdmFyIHJUbyA9IGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlUbyk7XG5cbiAgICAgICAgICAgIGEgPSBNYXRoLm1heChyRnJvbSwgbEZyb20pO1xuICAgICAgICAgICAgYiA9IE1hdGgubWluKHJUbywgbFRvKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGk9YTsgaTxiOyBpKz0xKSB7XG4gICAgICAgICAgICBkYXlzLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRheXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGF5c0luTGluZShsaW5lKSB7XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIgZGF5cyA9IFtdO1xuICAgICAgICB2YXIgbEZyb20gPSBsLmZyb20gPyBkdS5kYXRlMmludChsLmZyb20pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja2luKTtcbiAgICAgICAgdmFyIGxUbyA9IGwudG8gPyBkdS5kYXRlMmludChsLnRvKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tvdXQpO1xuICAgICAgICBmb3IgKGk9bEZyb207IGk8bFRvOyBpKz0xKSB7XG4gICAgICAgICAgICBkYXlzLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRheXM7XG4gICAgfVxuXG4gICAgdmFyIHNhbWVQaGFzZURpc2NvdW50cyA9IFtdO1xuICAgIHZhciBwb3N0cG9uZWREaXNjb3VudHMgPSBbXTtcblxuICAgIHZhciBpLGw7XG4gICAgZm9yIChpPTA7IGk8dHJlZS5jaGlsZHMubGVuZ3RoOyBpKz0xKSB7XG4gICAgICAgIGw9dHJlZS5jaGlsZHNbaV07XG4gICAgICAgIGlmIChsLmNsYXNzID09PSBcIkRJU0NPVU5UXCIpIHtcbiAgICAgICAgICAgIGlmIChsLnBoYXNlID09PSBzZWxmLmxpbmUucGhhc2UpIHsgLy8gUmVtb3ZlIGFuZCBnZXQgdGhlIGJlc3RcbiAgICAgICAgICAgICAgICBzYW1lUGhhc2VEaXNjb3VudHMucHVzaChsKTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgICAgICBpLT0xO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsLnBoYXNlID4gc2VsZi5saW5lLnBoYXNlKSB7IC8vIFJlbW92ZSBhbmQgcmVwcmNlc3MgIGxhdGVyXG4gICAgICAgICAgICAgICAgcG9zdHBvbmVkRGlzY291bnRzLnB1c2gobCk7XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICAgICAgdHJlZS5jaGlsZHMucG9wKCk7XG4gICAgICAgICAgICAgICAgaS09MTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhcHBsaWVkUnVsZXMgPSBfLmZpbHRlcihzZWxmLmxpbmUucnVsZXMsIHJ1bGVEb2VzQXBwbHkpO1xuXG4gICAgLy8gVGhpcyBoYXNoIGNvbnRhaW5zIHRoZSBiZXN0IGRpc2NvdW50IGZvciBlYWNoIGxpbmUgYW5kIGRheVxuICAgIC8vIGRpc2NvdW50UGVyRGF5WyczfDE4NDc1J109IDE1IE1lYW5zIHRoYXQgdGhlIGxpbmUgdHJlZVszXSB3aWxsIGFwcGx5c1xuICAgIC8vIGEgMTUlIGRpc2NvdW50IGF0IGRheSAxODQ3NVxuICAgIHZhciBkaXNjb3VudFBlckRheSA9IHt9O1xuICAgIF8uZWFjaChhcHBsaWVkUnVsZXMsIGZ1bmN0aW9uKHJ1bGUpIHtcbiAgICAgICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsLCBsaW5lSWR4KSB7XG4gICAgICAgICAgICBpZiAoISBfLmNvbnRhaW5zKGwuYXR0cmlidXRlcywgcnVsZS5hcHBseUlkQ29uY2VwdEF0dHJpYnV0ZS50b1N0cmluZygpKSkgcmV0dXJuO1xuICAgICAgICAgICAgXy5lYWNoKGRheXNJblJ1bGUobCwgcnVsZSksIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaz0gbGluZUlkeCsnfCcrZDtcbiAgICAgICAgICAgICAgICBpZiAoIWRpc2NvdW50UGVyRGF5W2tdKSBkaXNjb3VudFBlckRheVtrXT0wO1xuICAgICAgICAgICAgICAgIGRpc2NvdW50UGVyRGF5W2tdID0gTWF0aC5tYXgoZGlzY291bnRQZXJEYXlba10sIHJ1bGUuYXBwbHlEaXNjb3VudFBDKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciB2YXQgPTA7XG4gICAgdmFyIGJhc2UgPTA7XG4gICAgdmFyIHRvdGFsSW1wb3J0ID0wO1xuXG4gICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsLCBsaW5lSWR4KSB7XG4gICAgICAgIHZhciBkc2M9MDtcbiAgICAgICAgdmFyIG4gPTA7XG4gICAgICAgIF8uZWFjaChkYXlzSW5MaW5lKGwpLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgaz0gbGluZUlkeCsnfCcrZDtcbiAgICAgICAgICAgIGlmIChkaXNjb3VudFBlckRheVtrXSkge1xuICAgICAgICAgICAgICAgIGRzYyArPSBkaXNjb3VudFBlckRheVtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG4rPTE7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobiA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBkc2MgPSBkc2MgLyBuO1xuXG4gICAgICAgIHZhciBsVmF0ID0gMDtcbiAgICAgICAgXy5lYWNoKGwudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgbFZhdCA9IHRheC5QQztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmF0ID0gKHZhdCpiYXNlICsgbFZhdCpsLmJhc2VJbXBvcnQqZHNjLzEwMCkgLyAoYmFzZSArIGwuYmFzZUltcG9ydCpkc2MvMTAwKTtcbiAgICAgICAgYmFzZSA9IGJhc2UgKyBsLmJhc2VJbXBvcnQgKiBkc2MvMTAwO1xuICAgICAgICB0b3RhbEltcG9ydCA9IHRvdGFsSW1wb3J0ICsgbC5pbXBvcnQgKiBkc2MvMTAwO1xuICAgIH0pO1xuXG4gICAgdmFyIGJlc3RMaW5lID0gXy5jbG9uZShzZWxmLmxpbmUpO1xuXG4gICAgYmVzdExpbmUuYmFzZUltcG9ydCA9IC1iYXNlO1xuICAgIGJlc3RMaW5lLmJhc2VQcmljZSA9IC1iYXNlO1xuICAgIGJlc3RMaW5lLmltcG9ydCA9IC10b3RhbEltcG9ydDtcbiAgICBiZXN0TGluZS5xdWFudGl0eSA9IDE7XG4gICAgYmVzdExpbmUuY2xhc3MgPSBcIkxJTkVcIjtcblxuICAgIGJlc3RMaW5lLnRheGVzID0gYmVzdExpbmUudGF4ZXMgfHwgW107XG5cbiAgICB2YXIgdGF4ID0gXy5maW5kV2hlcmUoYmVzdExpbmUudGF4ZXMse3R5cGU6IFwiVkFUXCJ9KTtcbiAgICBpZiAoIXRheCkge1xuICAgICAgICB0YXggPSB7XG4gICAgICAgICAgICB0eXBlOiBcIlZBVFwiXG4gICAgICAgIH07XG4gICAgICAgIGJlc3RMaW5lLnRheGVzLnB1c2godGF4KTtcbiAgICB9XG4gICAgdGF4LlBDID0gdmF0O1xuXG4gICAgc2FtZVBoYXNlRGlzY291bnRzLnB1c2goYmVzdExpbmUpO1xuXG4gICAgdmFyIGJlc3RMaW5lSW5QaGFzZSA9IF8ucmVkdWNlKHNhbWVQaGFzZURpc2NvdW50cywgZnVuY3Rpb24oYmVzdExpbmUsIGxpbmUpIHtcbiAgICAgICAgaWYgKCFsaW5lKSByZXR1cm4gYmVzdExpbmU7XG4gICAgICAgIHJldHVybiAobGluZS5pbXBvcnQgPCBiZXN0TGluZS5pbXBvcnQpID8gbGluZSA6IGJlc3RMaW5lO1xuICAgIH0pO1xuXG4gICAgdHJlZS5jaGlsZHMucHVzaChiZXN0TGluZUluUGhhc2UpO1xuXG4gICAgcG9zdHBvbmVkRGlzY291bnRzID0gXy5zb3J0QnkocG9zdHBvbmVkRGlzY291bnRzLCAncGhhc2UnKTtcblxuICAgIF8uZWFjaChwb3N0cG9uZWREaXNjb3VudHMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgdmFyIG1vZGlmaWVyID0gbmV3IFByaWNlRGlzY291bnQobCk7XG4gICAgICAgIG1vZGlmaWVyLmFwcGx5KHRyZWUsIG9wdGlvbnMpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZURpc2NvdW50O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbnZhciBQcmljZUluc3VyYW5jZSA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgODtcbn07XG5cblByaWNlSW5zdXJhbmNlLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBsID0gXy5jbG9uZSh0aGlzLmxpbmUpO1xuXG5cbiAgICB2YXIgYmFzZSA9IDA7XG4gICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGJhc2UgKz0gbC5pbXBvcnQ7XG4gICAgfSk7XG5cbiAgICB2YXIgcHJpY2U7XG4gICAgaWYgKHR5cGVvZiBzZWxmLmxpbmUucHJpY2UgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgcHJpY2UgPSBzZWxmLmxpbmUucHJpY2U7XG4gICAgfSBlbHNlIGlmICggKHR5cGVvZiBzZWxmLmxpbmUucHJpY2U9PT1cIm9iamVjdFwiKSAmJiAoc2VsZi5saW5lLnByaWNlLnR5cGUgPT09ICdQRVInKSApIHtcbiAgICAgICAgcHJpY2UgPSBiYXNlICogc2VsZi5saW5lLnByaWNlLnByaWNlUEMvMTAwO1xuICAgICAgICBpZiAocHJpY2U8c2VsZi5saW5lLnByaWNlLnByaWNlTWluKSBwcmljZSA9IHNlbGYubGluZS5wcmljZS5wcmljZU1pbjtcbiAgICB9IGVsc2UgaWYgKCAodHlwZW9mIHNlbGYubGluZS5wcmljZT09PVwib2JqZWN0XCIpICYmIChzZWxmLmxpbmUucHJpY2UudHlwZSA9PT0gJ0VTQycpICkge1xuICAgICAgICBwcmljZT1OdW1iZXIuTUFYX1ZBTFVFO1xuICAgICAgICBfLmVhY2goc2VsZi5saW5lLnByaWNlLnNjYWxlUHJpY2VzLCBmdW5jdGlvbihzcCkge1xuICAgICAgICAgICAgaWYgKChiYXNlIDw9IHNwLnN0YXlQcmljZU1heCkgJiYgKHNwLnByaWNlIDwgcHJpY2UpKSB7XG4gICAgICAgICAgICAgICAgcHJpY2UgPSBzcC5wcmljZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChwcmljZSA9PT0gTnVtYmVyLk1BWF9WQUxVRSkge1xuICAgICAgICAgICAgcHJpY2UgPSBOYU47XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIGwuaW1wb3J0ID0gcHJpY2U7XG4gICAgbC5iYXNlSW1wb3J0ID0gcHJpY2U7XG4gICAgbC5iYXNlUHJpY2UgPSBwcmljZTtcbiAgICBsLnF1YW50aXR5ID0gMTtcblxuICAgIHRyZWUuY2hpbGRzLnB1c2gobCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlSW5zdXJhbmNlO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbnZhciBQcmljZUxpbmUgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDA7XG59O1xuXG5QcmljZUxpbmUucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgICB2YXIgbCA9IF8uY2xvbmUodGhpcy5saW5lKTtcblxuICAgIHZhciBwcmljZSA9IGwucHJpY2U7XG5cbiAgICBsLmltcG9ydCA9IGwucHJpY2UgKiBsLnF1YW50aXR5O1xuICAgIGlmICghaXNOYU4obC5wZXJpb2RzKSkge1xuICAgICAgICBsLmltcG9ydCA9IGwuaW1wb3J0ICogbC5wZXJpb2RzO1xuICAgIH1cblxuICAgIGlmIChsLmRpc2NvdW50KSB7XG4gICAgICAgIGwuaW1wb3J0ID0gbC5pbXBvcnQgKiAoMSAtIGwuZGlzY291bnQvMTAwKTtcbiAgICB9XG5cbiAgICBsLmJhc2VJbXBvcnQgPSBsLmltcG9ydDtcbiAgICBsLmJhc2VQcmljZSA9IGwucHJpY2U7XG5cbiAgICB0cmVlLmNoaWxkcy5wdXNoKGwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUxpbmU7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxudmFyIFByaWNlVmF0SW5jbHVkZWQgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDc7XG59O1xuXG5QcmljZVZhdEluY2x1ZGVkLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG5cbiAgICBmdW5jdGlvbiBhcHBseVZhdE5vZGUobm9kZSkge1xuICAgICAgICBfLmVhY2gobm9kZS50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICBpZiAodGF4LnR5cGUgPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlLmltcG9ydCA9IG5vZGUuaW1wb3J0ICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgICAgICBub2RlLnByaWNlID0gbm9kZS5wcmljZSAqICgxICsgdGF4LlBDLzEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGFwcGx5VmF0Tm9kZSk7XG4gICAgfVxuXG4gICAgYXBwbHlWYXROb2RlKHRyZWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZVZhdEluY2x1ZGVkO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJvdW5kKHZhbCwgcm91bmRpbmdUeXBlLCByb3VuZGluZykge1xuICAgIHZhciB2O1xuICAgIGlmICgoIXJvdW5kaW5nVHlwZSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJOT05FXCIpKSB7XG4gICAgICAgIHYgPSBNYXRoLnJvdW5kKHZhbCAvIDAuMDEpICogMC4wMTtcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDEpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiRkxPT1JcIikpIHtcbiAgICAgICAgdj0gTWF0aC5mbG9vcih2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDIpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiUk9VTkRcIikpIHtcbiAgICAgICAgdj0gTWF0aC5yb3VuZCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2UgaWYgKChyb3VuZGluZ1R5cGUgPT09IDMpIHx8IChyb3VuZGluZ1R5cGUgPT09IFwiQ0VJTFwiKSkge1xuICAgICAgICB2PSBNYXRoLmNlaWwodmFsIC8gcm91bmRpbmcpICogcm91bmRpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCByb3VuZGluZ1R5cGU6IHJvdW5kaW5nVHlwZVwiKTtcbiAgICB9XG4gICAgcmV0dXJuICsoTWF0aC5yb3VuZCh2ICsgXCJlKzJcIikgICsgXCJlLTJcIik7XG59O1xuIl19
