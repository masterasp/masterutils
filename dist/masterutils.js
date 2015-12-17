(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var du = require('./date_utils');

exports.trim = function(m) {

    m.firstBookableDate = du.date2int(m.firstBookableDate);
    while ((m.matrix.length>1) && (m.matrix[0] === 0)) {
        m.matrix.shift();
        m.firstBookableDate += 1;
    }

    while ((m.matrix.length>1) && (m.matrix[m.matrix.length-1] === 0)) {
        m.matrix.pop();
    }
    m.firstBookableDate = du.int2date(m.firstBookableDate);

};


exports.AND = function(m1, m2) {
    if (!m1) {
        return null;
    }
    if (!m2) {
        return null;
    }
    var i;
    var iFirstBookableDate1 = du.date2int(m1.firstBookableDate);
    var iFirstBookableDate2 = du.date2int(m2.firstBookableDate);
    var out = {
        firstBookableDate: Math.max(iFirstBookableDate1, iFirstBookableDate2),
        matrix: [0]
    };
    var L = Math.min(iFirstBookableDate1 + m1.matrix.length - out.firstBookableDate,
                     iFirstBookableDate2 + m2.matrix.length - out.firstBookableDate);
    for (i=0; i< L; i+=1) {
        var v = 0xFFFFFFF; // 28 DAYS

        var i1  =  i + out.firstBookableDate -iFirstBookableDate1;
        if (i1>=0 && i1<m1.matrix.length) {
            v = v & m1.matrix[i1];
        } else {
            v = 0;
        }

        var i2  =  i + out.firstBookableDate -iFirstBookableDate2;
        if (i2>=0 && i2<m2.matrix.length) {
            v = v & m2.matrix[i2];
        } else {
            v = 0;
        }

        out.matrix[i] = v;
    }

    exports.trim(out);
    out.firstBookableDate = du.int2date(out.firstBookableDate);

    return out;
};

exports.OR = function(m1, m2) {
    if ((!m1)&&(!m2)) return null;
    if (!m1) {
        return _.clone(m2);
    }
    if (!m2) {
        return _.clone(m1);
    }
    var i;
    var iFirstBookableDate1 = du.date2int(m1.firstBookableDate);
    var iFirstBookableDate2 = du.date2int(m2.firstBookableDate);
    var out = {
        firstBookableDate: Math.min(iFirstBookableDate1, iFirstBookableDate2),
        matrix: [0]
    };
    var L = Math.max(iFirstBookableDate1 + m1.matrix.length - out.firstBookableDate,
                     iFirstBookableDate2 + m2.matrix.length - out.firstBookableDate);
    for (i=0; i< L; i+=1) {
        var v = 0; // 28 DAYS

        var i1  =  i + out.firstBookableDate -iFirstBookableDate1;
        if (i1>=0 && i1<m1.matrix.length) {
            v = v | m1.matrix[i1];
        }

        var i2  =  i + out.firstBookableDate -iFirstBookableDate2;
        if (i2>=0 && i2<m2.matrix.length) {
            v = v | m2.matrix[i2];
        }

        out.matrix[i] = v;
    }

    exports.trim(out);
    out.firstBookableDate = du.int2date(out.firstBookableDate);

    return out;
};

exports.ZERO = function() {
    return {
        firstBookableDate: du.int2date(du.today()),
        matrix: [0]
    };
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils":3}],2:[function(require,module,exports){
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


},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
        },
        availabilityMatrix: require('./availability_matrix.js')
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
},{"./availability_matrix.js":1,"./creditcard.js":2,"./date_utils.js":3,"./price2.js":5,"./round.js":11}],5:[function(require,module,exports){
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

    modifiers = _.sortByAll(modifiers, ["execOrder", "execSuborder", "suborder"]);

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

    hideIfNoChilds:     Hide if is a parent with no childs
*/


    function renderNode(node, level) {

        var renderTotal = true;
        var renderDetail = true;
        if ((!node.showIfZero) && (!node.quantity) && (!node.import)) renderTotal = false;
        if ((node.childs)&&(node.childs.length === 1)&&(!node.hideDetail)) {
            if (node.ifOneHideParent) renderTotal = false;
            if (node.ifOneHideChild) renderDetail = false;
        }
        if (((!node.childs)||(node.childs.length === 0))&&(node.hideIfNoChilds))  {
            renderTotal =false;
            renderDetail = false;
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
        if ((!node.showIfZero) && (!node.quantity) && (!node.import)) renderTotal = false;
        if ((newNode.childs.length === 1)&&(!node.hideDetail)) {
            if (node.ifOneHideParent) renderTotal = false;
            if (node.ifOneHideChild) renderDetail = false;
        }
        if ((newNode.childs.length === 0)&&(node.hideIfNoChilds)) {
            renderTotal =false;
            renderDetail = false;
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
},{"./date_utils":3,"./price_agregator.js":6,"./price_discount.js":7,"./price_insurance.js":8,"./price_line.js":9,"./price_vatincluded.js":10,"./round":11}],6:[function(require,module,exports){
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
    if ( ! (this.groupBy instanceof  Array)) {
        this.groupBy = [ this.groupBy ];
    }
};

PriceAgregator.prototype.modify = function(tree) {
    var self = this;
    var newNode = _.clone(this.line);
    newNode.childs = [];
    var i,l;
    for (i=0; i<tree.childs.length; i+=1) {
        l=tree.childs[i];
        if (_.intersection(l.attributes, self.groupBy).length ===  self.groupBy.length) {
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


        // We clculate an efective checkin/checkout taking in account the stayLengthFrom and stayLengthTo

        var efCheckout, efCheckin;
        if (rule.stayLengthFrom) {
            efCheckin = Math.max(iCheckin, du.date2int(rule.stayLengthFrom));
        } else {
            efCheckin = iCheckin;
        }
        if (rule.stayLengthTo) {
            efCheckout = Math.min(iCheckout, du.date2int(rule.stayLengthTo) +1);
        } else {
            efCheckout = iCheckout;
        }
        var efLen = efCheckout -efCheckin;
        if (efLen>0) {
            if ((rule.minStay)&&( efLen < rule.minStay)) return false;
            if ((rule.maxStay || rule.maxStay===0)&&( efLen > rule.maxStay)) return false;
        } else {
            return false;
        }

        return true;
    }


    function proportionApply(iIn, iOut, iApplyFrom, iApplyTo) {
        var a = iIn > iApplyFrom ? iIn : iApplyFrom;
        var b = iOut < iApplyTo ? iOut : iApplyTo;
        if (b>a) return 0;
        return (b-a)/(iOut-iIn);
    }

    function daysInRule(line, rule) {
        var a,b,i;
        var days = [];
        var lFrom = line.from ? du.date2int(line.from) : du.date2int(options.checkin);
        var lTo = line.to ? du.date2int(line.to) : du.date2int(options.checkout);
        if (rule.applicationType === "WHOLE") {
            a = lFrom;
            b = lTo;
        } else if (rule.applicationType === "BYDAY") {
            var rFrom = du.date2int(rule.applyFrom);
            var rTo = du.date2int(rule.applyTo) + 1;

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
        var lFrom = line.from ? du.date2int(line.from) : du.date2int(options.checkin);
        var lTo = line.to ? du.date2int(line.to) : du.date2int(options.checkout);
        for (i=lFrom; i<lTo; i+=1) {
            days.push(i);
        }
        return days;
    }

    // Remove the discounts with the same or greater phase.

    var samePhaseDiscounts = [];
    var postponedDiscounts = [];
    var appliedDiscounts = [];

    var i,l;
    for (i=0; i<tree.childs.length; i+=1) {
        l=tree.childs[i];
        if (l.discountPerDay) {
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
            } else {
                appliedDiscounts.push(l);
            }
        }
    }

    var appliedRules = _.filter(self.line.rules, ruleDoesApply);

    // This hash contains the best discount for each line and day
    // discountPerDay['3|18475']= 15 Means that the line tree[3] will applys
    // a 15% discount at day 18475
    var discountPerDay = {};
    _.each(appliedRules, function(rule) {
        _.each(tree.childs, function(l, lineIdx) { // TODO mirar tot l'arbre
            if (l.class !== "LINE") return;
            if (! _.contains(l.attributes, rule.applyIdConceptAttribute.toString())) return;
            _.each(daysInRule(l, rule), function(d) {
                var k= lineIdx+'|'+d;

                var dsc = - rule.applyDiscountPC *  l.quantity *  l.basePrice / 100;
                _.each(appliedDiscounts, function(od) {
                    if (! _.contains(od.attributes, rule.applyIdConceptAttribute.toString())) return;
                    if (od.discountPerDay[k]) {
                        dsc = dsc -  od.discountPerDay[k] * rule.applyDiscountPC/100;
                    }
                });

                if (!discountPerDay[k]) discountPerDay[k]=0;
                discountPerDay[k] = Math.min(discountPerDay[k], dsc);
            });
        });
    });

    var vat =0;
    var base =0;
    var totalImport =0;

    // toaleImport and base are the total amounts of discounts that are applied
    // The VAT is a ponderated average of all the lines ther the discount applies.

    _.each(tree.childs, function(l, lineIdx) {
        if (l.discountPerDay) return;
        var dsc=0;
        _.each(daysInLine(l), function(d) {
            var k= lineIdx+'|'+d;
            if (discountPerDay[k]) {
                dsc += discountPerDay[k];
            }
        });

        var lVat = 0;
        _.each(l.taxes, function(tax) {
            if (tax.type === "VAT") {
                lVat = tax.PC;
            }
        });

        if ((base + dsc) !== 0) {
            vat = (vat*base + lVat*dsc) / (base + dsc);
        }
        base = base + dsc;
        if (l.baseImport) {
            totalImport = totalImport + l.import * dsc/l.baseImport;
        }
    });

    var bestLine = _.clone(self.line);

    bestLine.baseImport = base;
    bestLine.basePrice = base;
    bestLine.import = totalImport;
    bestLine.quantity = 1;
    bestLine.class = "LINE";
    bestLine.suborder = self.execSuborder;
    bestLine.discountPerDay = discountPerDay;

    bestLine.taxes = bestLine.taxes || [];

    var tax = _.findWhere(bestLine.taxes,{type: "VAT"});
    if (!tax) {
        tax = {
            type: "VAT"
        };
        bestLine.taxes.push(tax);
    }
    tax.PC = vat;

    // Find the best discount concept in the same phase.

    samePhaseDiscounts.push(bestLine);

    var bestLineInPhase = _.reduce(samePhaseDiscounts, function(bestLine, line) {
        if (!line) return bestLine;
        return (line.import < bestLine.import) ? line : bestLine;
    });

    if (bestLineInPhase.import !== 0) {
        tree.childs.push(bestLineInPhase);
    }

    // Finaly we reaply the discounts of greater phases that wuere applied before.

    postponedDiscounts = _.sortBy(postponedDiscounts, 'phase');

    _.each(postponedDiscounts, function(l) {
        var modifier = new PriceDiscount(l);
        modifier.apply(tree, options);
    });
};

module.exports = PriceDiscount;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils.js":3}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var round = require('./round');

var PriceVatIncluded = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 7;
};

PriceVatIncluded.prototype.modify = function(tree) {

    function applyVatNode(node) {
        _.each(node.taxes, function(tax) {
            if (tax.type === "VAT") {
                node.import = round(node.baseImport * (1 + tax.PC/100),"ROUND", 0.01);
                node.price = node.basePrice * (1 + tax.PC/100);
            }
        });
        _.each(node.childs, applyVatNode);
    }

    applyVatNode(tree);
};

module.exports = PriceVatIncluded;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./round":11}],11:[function(require,module,exports){
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
    return +(Math.round(v + "e+8")  + "e-8");
};

},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvYXZhaWxhYmlsaXR5X21hdHJpeC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2NyZWRpdGNhcmQuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9kYXRlX3V0aWxzLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvZmFrZV9lOWQ4NGZlMS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlMi5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2FncmVnYXRvci5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2Rpc2NvdW50LmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfaW5zdXJhbmNlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfbGluZS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX3ZhdGluY2x1ZGVkLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcm91bmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIGR1ID0gcmVxdWlyZSgnLi9kYXRlX3V0aWxzJyk7XG5cbmV4cG9ydHMudHJpbSA9IGZ1bmN0aW9uKG0pIHtcblxuICAgIG0uZmlyc3RCb29rYWJsZURhdGUgPSBkdS5kYXRlMmludChtLmZpcnN0Qm9va2FibGVEYXRlKTtcbiAgICB3aGlsZSAoKG0ubWF0cml4Lmxlbmd0aD4xKSAmJiAobS5tYXRyaXhbMF0gPT09IDApKSB7XG4gICAgICAgIG0ubWF0cml4LnNoaWZ0KCk7XG4gICAgICAgIG0uZmlyc3RCb29rYWJsZURhdGUgKz0gMTtcbiAgICB9XG5cbiAgICB3aGlsZSAoKG0ubWF0cml4Lmxlbmd0aD4xKSAmJiAobS5tYXRyaXhbbS5tYXRyaXgubGVuZ3RoLTFdID09PSAwKSkge1xuICAgICAgICBtLm1hdHJpeC5wb3AoKTtcbiAgICB9XG4gICAgbS5maXJzdEJvb2thYmxlRGF0ZSA9IGR1LmludDJkYXRlKG0uZmlyc3RCb29rYWJsZURhdGUpO1xuXG59O1xuXG5cbmV4cG9ydHMuQU5EID0gZnVuY3Rpb24obTEsIG0yKSB7XG4gICAgaWYgKCFtMSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCFtMikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdmFyIGk7XG4gICAgdmFyIGlGaXJzdEJvb2thYmxlRGF0ZTEgPSBkdS5kYXRlMmludChtMS5maXJzdEJvb2thYmxlRGF0ZSk7XG4gICAgdmFyIGlGaXJzdEJvb2thYmxlRGF0ZTIgPSBkdS5kYXRlMmludChtMi5maXJzdEJvb2thYmxlRGF0ZSk7XG4gICAgdmFyIG91dCA9IHtcbiAgICAgICAgZmlyc3RCb29rYWJsZURhdGU6IE1hdGgubWF4KGlGaXJzdEJvb2thYmxlRGF0ZTEsIGlGaXJzdEJvb2thYmxlRGF0ZTIpLFxuICAgICAgICBtYXRyaXg6IFswXVxuICAgIH07XG4gICAgdmFyIEwgPSBNYXRoLm1pbihpRmlyc3RCb29rYWJsZURhdGUxICsgbTEubWF0cml4Lmxlbmd0aCAtIG91dC5maXJzdEJvb2thYmxlRGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgIGlGaXJzdEJvb2thYmxlRGF0ZTIgKyBtMi5tYXRyaXgubGVuZ3RoIC0gb3V0LmZpcnN0Qm9va2FibGVEYXRlKTtcbiAgICBmb3IgKGk9MDsgaTwgTDsgaSs9MSkge1xuICAgICAgICB2YXIgdiA9IDB4RkZGRkZGRjsgLy8gMjggREFZU1xuXG4gICAgICAgIHZhciBpMSAgPSAgaSArIG91dC5maXJzdEJvb2thYmxlRGF0ZSAtaUZpcnN0Qm9va2FibGVEYXRlMTtcbiAgICAgICAgaWYgKGkxPj0wICYmIGkxPG0xLm1hdHJpeC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHYgPSB2ICYgbTEubWF0cml4W2kxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHYgPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGkyICA9ICBpICsgb3V0LmZpcnN0Qm9va2FibGVEYXRlIC1pRmlyc3RCb29rYWJsZURhdGUyO1xuICAgICAgICBpZiAoaTI+PTAgJiYgaTI8bTIubWF0cml4Lmxlbmd0aCkge1xuICAgICAgICAgICAgdiA9IHYgJiBtMi5tYXRyaXhbaTJdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdiA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBvdXQubWF0cml4W2ldID0gdjtcbiAgICB9XG5cbiAgICBleHBvcnRzLnRyaW0ob3V0KTtcbiAgICBvdXQuZmlyc3RCb29rYWJsZURhdGUgPSBkdS5pbnQyZGF0ZShvdXQuZmlyc3RCb29rYWJsZURhdGUpO1xuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydHMuT1IgPSBmdW5jdGlvbihtMSwgbTIpIHtcbiAgICBpZiAoKCFtMSkmJighbTIpKSByZXR1cm4gbnVsbDtcbiAgICBpZiAoIW0xKSB7XG4gICAgICAgIHJldHVybiBfLmNsb25lKG0yKTtcbiAgICB9XG4gICAgaWYgKCFtMikge1xuICAgICAgICByZXR1cm4gXy5jbG9uZShtMSk7XG4gICAgfVxuICAgIHZhciBpO1xuICAgIHZhciBpRmlyc3RCb29rYWJsZURhdGUxID0gZHUuZGF0ZTJpbnQobTEuZmlyc3RCb29rYWJsZURhdGUpO1xuICAgIHZhciBpRmlyc3RCb29rYWJsZURhdGUyID0gZHUuZGF0ZTJpbnQobTIuZmlyc3RCb29rYWJsZURhdGUpO1xuICAgIHZhciBvdXQgPSB7XG4gICAgICAgIGZpcnN0Qm9va2FibGVEYXRlOiBNYXRoLm1pbihpRmlyc3RCb29rYWJsZURhdGUxLCBpRmlyc3RCb29rYWJsZURhdGUyKSxcbiAgICAgICAgbWF0cml4OiBbMF1cbiAgICB9O1xuICAgIHZhciBMID0gTWF0aC5tYXgoaUZpcnN0Qm9va2FibGVEYXRlMSArIG0xLm1hdHJpeC5sZW5ndGggLSBvdXQuZmlyc3RCb29rYWJsZURhdGUsXG4gICAgICAgICAgICAgICAgICAgICBpRmlyc3RCb29rYWJsZURhdGUyICsgbTIubWF0cml4Lmxlbmd0aCAtIG91dC5maXJzdEJvb2thYmxlRGF0ZSk7XG4gICAgZm9yIChpPTA7IGk8IEw7IGkrPTEpIHtcbiAgICAgICAgdmFyIHYgPSAwOyAvLyAyOCBEQVlTXG5cbiAgICAgICAgdmFyIGkxICA9ICBpICsgb3V0LmZpcnN0Qm9va2FibGVEYXRlIC1pRmlyc3RCb29rYWJsZURhdGUxO1xuICAgICAgICBpZiAoaTE+PTAgJiYgaTE8bTEubWF0cml4Lmxlbmd0aCkge1xuICAgICAgICAgICAgdiA9IHYgfCBtMS5tYXRyaXhbaTFdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGkyICA9ICBpICsgb3V0LmZpcnN0Qm9va2FibGVEYXRlIC1pRmlyc3RCb29rYWJsZURhdGUyO1xuICAgICAgICBpZiAoaTI+PTAgJiYgaTI8bTIubWF0cml4Lmxlbmd0aCkge1xuICAgICAgICAgICAgdiA9IHYgfCBtMi5tYXRyaXhbaTJdO1xuICAgICAgICB9XG5cbiAgICAgICAgb3V0Lm1hdHJpeFtpXSA9IHY7XG4gICAgfVxuXG4gICAgZXhwb3J0cy50cmltKG91dCk7XG4gICAgb3V0LmZpcnN0Qm9va2FibGVEYXRlID0gZHUuaW50MmRhdGUob3V0LmZpcnN0Qm9va2FibGVEYXRlKTtcblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG5leHBvcnRzLlpFUk8gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBmaXJzdEJvb2thYmxlRGF0ZTogZHUuaW50MmRhdGUoZHUudG9kYXkoKSksXG4gICAgICAgIG1hdHJpeDogWzBdXG4gICAgfTtcbn07XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLyo9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xyXG5cclxuLypcclxuXHJcblRoaXMgcm91dGluZSBjaGVja3MgdGhlIGNyZWRpdCBjYXJkIG51bWJlci4gVGhlIGZvbGxvd2luZyBjaGVja3MgYXJlIG1hZGU6XHJcblxyXG4xLiBBIG51bWJlciBoYXMgYmVlbiBwcm92aWRlZFxyXG4yLiBUaGUgbnVtYmVyIGlzIGEgcmlnaHQgbGVuZ3RoIGZvciB0aGUgY2FyZFxyXG4zLiBUaGUgbnVtYmVyIGhhcyBhbiBhcHByb3ByaWF0ZSBwcmVmaXggZm9yIHRoZSBjYXJkXHJcbjQuIFRoZSBudW1iZXIgaGFzIGEgdmFsaWQgbW9kdWx1cyAxMCBudW1iZXIgY2hlY2sgZGlnaXQgaWYgcmVxdWlyZWRcclxuXHJcbklmIHRoZSB2YWxpZGF0aW9uIGZhaWxzIGFuIGVycm9yIGlzIHJlcG9ydGVkLlxyXG5cclxuVGhlIHN0cnVjdHVyZSBvZiBjcmVkaXQgY2FyZCBmb3JtYXRzIHdhcyBnbGVhbmVkIGZyb20gYSB2YXJpZXR5IG9mIHNvdXJjZXMgb24gdGhlIHdlYiwgYWx0aG91Z2ggdGhlIFxyXG5iZXN0IGlzIHByb2JhYmx5IG9uIFdpa2VwZWRpYSAoXCJDcmVkaXQgY2FyZCBudW1iZXJcIik6XHJcblxyXG4gIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ3JlZGl0X2NhcmRfbnVtYmVyXHJcblxyXG5QYXJhbWV0ZXJzOlxyXG4gICAgICAgICAgICBjYXJkbnVtYmVyICAgICAgICAgICBudW1iZXIgb24gdGhlIGNhcmRcclxuICAgICAgICAgICAgY2FyZG5hbWUgICAgICAgICAgICAgbmFtZSBvZiBjYXJkIGFzIGRlZmluZWQgaW4gdGhlIGNhcmQgbGlzdCBiZWxvd1xyXG5cclxuQXV0aG9yOiAgICAgSm9obiBHYXJkbmVyXHJcbkRhdGU6ICAgICAgIDFzdCBOb3ZlbWJlciAyMDAzXHJcblVwZGF0ZWQ6ICAgIDI2dGggRmViLiAyMDA1ICAgICAgQWRkaXRpb25hbCBjYXJkcyBhZGRlZCBieSByZXF1ZXN0XHJcblVwZGF0ZWQ6ICAgIDI3dGggTm92LiAyMDA2ICAgICAgQWRkaXRpb25hbCBjYXJkcyBhZGRlZCBmcm9tIFdpa2lwZWRpYVxyXG5VcGRhdGVkOiAgICAxOHRoIEphbi4gMjAwOCAgICAgIEFkZGl0aW9uYWwgY2FyZHMgYWRkZWQgZnJvbSBXaWtpcGVkaWFcclxuVXBkYXRlZDogICAgMjZ0aCBOb3YuIDIwMDggICAgICBNYWVzdHJvIGNhcmRzIGV4dGVuZGVkXHJcblVwZGF0ZWQ6ICAgIDE5dGggSnVuLiAyMDA5ICAgICAgTGFzZXIgY2FyZHMgZXh0ZW5kZWQgZnJvbSBXaWtpcGVkaWFcclxuVXBkYXRlZDogICAgMTF0aCBTZXAuIDIwMTAgICAgICBUeXBvcyByZW1vdmVkIGZyb20gRGluZXJzIGFuZCBTb2xvIGRlZmluaXRpb25zICh0aGFua3MgdG8gTm9lIExlb24pXHJcblVwZGF0ZWQ6ICAgIDEwdGggQXByaWwgMjAxMiAgICAgTmV3IG1hdGNoZXMgZm9yIE1hZXN0cm8sIERpbmVycyBFbnJvdXRlIGFuZCBTd2l0Y2hcclxuVXBkYXRlZDogICAgMTd0aCBPY3RvYmVyIDIwMTIgICBEaW5lcnMgQ2x1YiBwcmVmaXggMzggbm90IGVuY29kZWRcclxuXHJcbiovXHJcblxyXG4vKlxyXG4gICBJZiBhIGNyZWRpdCBjYXJkIG51bWJlciBpcyBpbnZhbGlkLCBhbiBlcnJvciByZWFzb24gaXMgbG9hZGVkIGludG8gdGhlIGdsb2JhbCBjY0Vycm9yTm8gdmFyaWFibGUuXHJcbiAgIFRoaXMgY2FuIGJlIGJlIHVzZWQgdG8gaW5kZXggaW50byB0aGUgZ2xvYmFsIGVycm9yICBzdHJpbmcgYXJyYXkgdG8gcmVwb3J0IHRoZSByZWFzb24gdG8gdGhlIHVzZXJcclxuICAgaWYgcmVxdWlyZWQ6XHJcblxyXG4gICBlLmcuIGlmICghY2hlY2tDcmVkaXRDYXJkIChudW1iZXIsIG5hbWUpIGFsZXJ0IChjY0Vycm9ycyhjY0Vycm9yTm8pO1xyXG4qL1xyXG5cclxudmFyIGNjRXJyb3JObyA9IDA7XHJcbnZhciBjY0Vycm9ycyA9IFtdO1xyXG5cclxuY2NFcnJvcnMgWzBdID0gXCJVbmtub3duIGNhcmQgdHlwZVwiO1xyXG5jY0Vycm9ycyBbMV0gPSBcIk5vIGNhcmQgbnVtYmVyIHByb3ZpZGVkXCI7XHJcbmNjRXJyb3JzIFsyXSA9IFwiQ3JlZGl0IGNhcmQgbnVtYmVyIGlzIGluIGludmFsaWQgZm9ybWF0XCI7XHJcbmNjRXJyb3JzIFszXSA9IFwiQ3JlZGl0IGNhcmQgbnVtYmVyIGlzIGludmFsaWRcIjtcclxuY2NFcnJvcnMgWzRdID0gXCJDcmVkaXQgY2FyZCBudW1iZXIgaGFzIGFuIGluYXBwcm9wcmlhdGUgbnVtYmVyIG9mIGRpZ2l0c1wiO1xyXG5jY0Vycm9ycyBbNV0gPSBcIldhcm5pbmchIFRoaXMgY3JlZGl0IGNhcmQgbnVtYmVyIGlzIGFzc29jaWF0ZWQgd2l0aCBhIHNjYW0gYXR0ZW1wdFwiO1xyXG5cclxuZnVuY3Rpb24gY2hlY2tDcmVkaXRDYXJkIChjYXJkbnVtYmVyKSB7XHJcblxyXG4gIC8vIEFycmF5IHRvIGhvbGQgdGhlIHBlcm1pdHRlZCBjYXJkIGNoYXJhY3RlcmlzdGljc1xyXG4gIHZhciBjYXJkcyA9IFtdO1xyXG5cclxuICAvLyBEZWZpbmUgdGhlIGNhcmRzIHdlIHN1cHBvcnQuIFlvdSBtYXkgYWRkIGFkZHRpb25hbCBjYXJkIHR5cGVzIGFzIGZvbGxvd3MuXHJcbiAgLy8gIE5hbWU6ICAgICAgICAgQXMgaW4gdGhlIHNlbGVjdGlvbiBib3ggb2YgdGhlIGZvcm0gLSBtdXN0IGJlIHNhbWUgYXMgdXNlcidzXHJcbiAgLy8gIExlbmd0aDogICAgICAgTGlzdCBvZiBwb3NzaWJsZSB2YWxpZCBsZW5ndGhzIG9mIHRoZSBjYXJkIG51bWJlciBmb3IgdGhlIGNhcmRcclxuICAvLyAgcHJlZml4ZXM6ICAgICBMaXN0IG9mIHBvc3NpYmxlIHByZWZpeGVzIGZvciB0aGUgY2FyZFxyXG4gIC8vICBjaGVja2RpZ2l0OiAgIEJvb2xlYW4gdG8gc2F5IHdoZXRoZXIgdGhlcmUgaXMgYSBjaGVjayBkaWdpdFxyXG5cclxuICBjYXJkcyBbMF0gPSB7bmFtZTogXCJWaXNhXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxMywxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI0XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxXSA9IHtuYW1lOiBcIk1hc3RlckNhcmRcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjUxLDUyLDUzLDU0LDU1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsyXSA9IHtuYW1lOiBcIkRpbmVyc0NsdWJcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE0LDE2XCIsIFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIzNiwzOCw1NCw1NVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbM10gPSB7bmFtZTogXCJDYXJ0ZUJsYW5jaGVcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE0XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjMwMCwzMDEsMzAyLDMwMywzMDQsMzA1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs0XSA9IHtuYW1lOiBcIkFtRXhcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE1XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjM0LDM3XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs1XSA9IHtuYW1lOiBcIkRpc2NvdmVyXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI2MDExLDYyMiw2NCw2NVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbNl0gPSB7bmFtZTogXCJKQ0JcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjM1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs3XSA9IHtuYW1lOiBcImVuUm91dGVcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE1XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjIwMTQsMjE0OVwiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbOF0gPSB7bmFtZTogXCJTb2xvXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNiwxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI2MzM0LDY3NjdcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzldID0ge25hbWU6IFwiU3dpdGNoXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNiwxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI0OTAzLDQ5MDUsNDkxMSw0OTM2LDU2NDE4Miw2MzMxMTAsNjMzMyw2NzU5XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxMF0gPSB7bmFtZTogXCJNYWVzdHJvXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxMiwxMywxNCwxNSwxNiwxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI1MDE4LDUwMjAsNTAzOCw2MzA0LDY3NTksNjc2MSw2NzYyLDY3NjNcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzExXSA9IHtuYW1lOiBcIlZpc2FFbGVjdHJvblwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNDAyNiw0MTc1MDAsNDUwOCw0ODQ0LDQ5MTMsNDkxN1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTJdID0ge25hbWU6IFwiTGFzZXJDYXJkXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNiwxNywxOCwxOVwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI2MzA0LDY3MDYsNjc3MSw2NzA5XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxM10gPSB7bmFtZTogXCJUZXN0XCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCIxOTEyXCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IGZhbHNlfTtcclxuICB2YXIgcmVzID0ge1xyXG4gICAgdmFsaWQ6IGZhbHNlXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vIEVuc3VyZSB0aGF0IHRoZSB1c2VyIGhhcyBwcm92aWRlZCBhIGNyZWRpdCBjYXJkIG51bWJlclxyXG4gIGlmIChjYXJkbnVtYmVyLmxlbmd0aCA9PT0gMCkgIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gMTtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgLy8gTm93IHJlbW92ZSBhbnkgc3BhY2VzIGZyb20gdGhlIGNyZWRpdCBjYXJkIG51bWJlclxyXG4gIGNhcmRudW1iZXIgPSBjYXJkbnVtYmVyLnJlcGxhY2UgKC9cXHMvZywgXCJcIik7XHJcblxyXG4gIC8vIENoZWNrIHRoYXQgdGhlIG51bWJlciBpcyBudW1lcmljXHJcbiAgdmFyIGNhcmRObyA9IGNhcmRudW1iZXI7XHJcbiAgdmFyIGNhcmRleHAgPSAvXlswLTldezEzLDE5fSQvO1xyXG4gIGlmICghY2FyZGV4cC5leGVjKGNhcmRObykpICB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDI7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIC8vIEVzdGFibGlzaCBjYXJkIHR5cGVcclxuICB2YXIgY2FyZFR5cGUgPSAtMTtcclxuICBmb3IgKHZhciBpPTA7IGk8Y2FyZHMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAvLyBMb2FkIGFuIGFycmF5IHdpdGggdGhlIHZhbGlkIHByZWZpeGVzIGZvciB0aGlzIGNhcmRcclxuICAgIHByZWZpeCA9IGNhcmRzW2ldLnByZWZpeGVzLnNwbGl0KFwiLFwiKTtcclxuXHJcbiAgICAvLyBOb3cgc2VlIGlmIGFueSBvZiB0aGVtIG1hdGNoIHdoYXQgd2UgaGF2ZSBpbiB0aGUgY2FyZCBudW1iZXJcclxuICAgIGZvciAoaj0wOyBqPHByZWZpeC5sZW5ndGg7IGorKykge1xyXG4gICAgICB2YXIgZXhwID0gbmV3IFJlZ0V4cCAoXCJeXCIgKyBwcmVmaXhbal0pO1xyXG4gICAgICBpZiAoZXhwLnRlc3QgKGNhcmRObykpIGNhcmRUeXBlID0gaTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIElmIGNhcmQgdHlwZSBub3QgZm91bmQsIHJlcG9ydCBhbiBlcnJvclxyXG4gIGlmIChjYXJkVHlwZSA9PSAtMSkge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSAyO1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJlcy5jY05hbWUgPSBjYXJkc1tjYXJkVHlwZV0ubmFtZTtcclxuXHJcblxyXG5cclxuICB2YXIgajtcclxuICAvLyBOb3cgY2hlY2sgdGhlIG1vZHVsdXMgMTAgY2hlY2sgZGlnaXQgLSBpZiByZXF1aXJlZFxyXG4gIGlmIChjYXJkc1tjYXJkVHlwZV0uY2hlY2tkaWdpdCkge1xyXG4gICAgdmFyIGNoZWNrc3VtID0gMDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcnVubmluZyBjaGVja3N1bSB0b3RhbFxyXG4gICAgdmFyIG15Y2hhciA9IFwiXCI7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZXh0IGNoYXIgdG8gcHJvY2Vzc1xyXG4gICAgaiA9IDE7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0YWtlcyB2YWx1ZSBvZiAxIG9yIDJcclxuXHJcbiAgICAvLyBQcm9jZXNzIGVhY2ggZGlnaXQgb25lIGJ5IG9uZSBzdGFydGluZyBhdCB0aGUgcmlnaHRcclxuICAgIHZhciBjYWxjO1xyXG4gICAgZm9yIChpID0gY2FyZE5vLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblxyXG4gICAgICAvLyBFeHRyYWN0IHRoZSBuZXh0IGRpZ2l0IGFuZCBtdWx0aXBseSBieSAxIG9yIDIgb24gYWx0ZXJuYXRpdmUgZGlnaXRzLlxyXG4gICAgICBjYWxjID0gTnVtYmVyKGNhcmROby5jaGFyQXQoaSkpICogajtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXN1bHQgaXMgaW4gdHdvIGRpZ2l0cyBhZGQgMSB0byB0aGUgY2hlY2tzdW0gdG90YWxcclxuICAgICAgaWYgKGNhbGMgPiA5KSB7XHJcbiAgICAgICAgY2hlY2tzdW0gPSBjaGVja3N1bSArIDE7XHJcbiAgICAgICAgY2FsYyA9IGNhbGMgLSAxMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQWRkIHRoZSB1bml0cyBlbGVtZW50IHRvIHRoZSBjaGVja3N1bSB0b3RhbFxyXG4gICAgICBjaGVja3N1bSA9IGNoZWNrc3VtICsgY2FsYztcclxuXHJcbiAgICAgIC8vIFN3aXRjaCB0aGUgdmFsdWUgb2YgalxyXG4gICAgICBpZiAoaiA9PTEpIHtcclxuICAgICAgICBqID0gMjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBqID0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFsbCBkb25lIC0gaWYgY2hlY2tzdW0gaXMgZGl2aXNpYmxlIGJ5IDEwLCBpdCBpcyBhIHZhbGlkIG1vZHVsdXMgMTAuXHJcbiAgICAvLyBJZiBub3QsIHJlcG9ydCBhbiBlcnJvci5cclxuICAgIGlmIChjaGVja3N1bSAlIDEwICE9PSAwKSAge1xyXG4gICAgICByZXMuY2NFcnJvck5vID0gMztcclxuICAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgIHJldHVybiByZXM7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpdCdzIG5vdCBhIHNwYW0gbnVtYmVyXHJcbiAgaWYgKGNhcmRObyA9PSAnNTQ5MDk5Nzc3MTA5MjA2NCcpIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gNTtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgLy8gVGhlIGZvbGxvd2luZyBhcmUgdGhlIGNhcmQtc3BlY2lmaWMgY2hlY2tzIHdlIHVuZGVydGFrZS5cclxuICB2YXIgTGVuZ3RoVmFsaWQgPSBmYWxzZTtcclxuICB2YXIgUHJlZml4VmFsaWQgPSBmYWxzZTtcclxuXHJcbiAgLy8gV2UgdXNlIHRoZXNlIGZvciBob2xkaW5nIHRoZSB2YWxpZCBsZW5ndGhzIGFuZCBwcmVmaXhlcyBvZiBhIGNhcmQgdHlwZVxyXG4gIHZhciBwcmVmaXggPSBbXTtcclxuICB2YXIgbGVuZ3RocyA9IFtdO1xyXG5cclxuICAvLyBTZWUgaWYgdGhlIGxlbmd0aCBpcyB2YWxpZCBmb3IgdGhpcyBjYXJkXHJcbiAgbGVuZ3RocyA9IGNhcmRzW2NhcmRUeXBlXS5sZW5ndGguc3BsaXQoXCIsXCIpO1xyXG4gIGZvciAoaj0wOyBqPGxlbmd0aHMubGVuZ3RoOyBqKyspIHtcclxuICAgIGlmIChjYXJkTm8ubGVuZ3RoID09IGxlbmd0aHNbal0pIExlbmd0aFZhbGlkID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIFNlZSBpZiBhbGwgaXMgT0sgYnkgc2VlaW5nIGlmIHRoZSBsZW5ndGggd2FzIHZhbGlkLiBXZSBvbmx5IGNoZWNrIHRoZSBsZW5ndGggaWYgYWxsIGVsc2Ugd2FzIFxyXG4gIC8vIGh1bmt5IGRvcnkuXHJcbiAgaWYgKCFMZW5ndGhWYWxpZCkge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSA0O1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICByZXMudmFsaWQgPSB0cnVlO1xyXG5cclxuICAvLyBUaGUgY3JlZGl0IGNhcmQgaXMgaW4gdGhlIHJlcXVpcmVkIGZvcm1hdC5cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXHJcblxyXG5tb2R1bGUuZXhwb3J0cy5jaGVja0NyZWRpdENhcmQgPSBjaGVja0NyZWRpdENhcmQ7XHJcblxyXG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxuXG52YXIgbW9tZW50ID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ21vbWVudCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnbW9tZW50J10gOiBudWxsKTtcblxudmFyIHZpcnR1YWxUaW1lID0gbnVsbDtcbmV4cG9ydHMubm93ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHZpcnR1YWxUaW1lKSB7XG4gICAgICAgIHJldHVybiB2aXJ0dWFsVGltZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoKTtcbiAgICB9XG59O1xuXG5leHBvcnRzLnNldFZpcnR1YWxUaW1lID0gZnVuY3Rpb24odCkge1xuICAgIHZpcnR1YWxUaW1lID0gdDtcbn07XG5cbmV4cG9ydHMuZGF0ZTJzdHIgPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gZC50b0lTT1N0cmluZygpLnN1YnN0cmluZygwLDEwKTtcbn07XG5cbmV4cG9ydHMuZGF0ZTJpbnQgPSBmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBkID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBkID0gbmV3IERhdGUoZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoZC5nZXRUaW1lKCkgLyA4NjQwMDAwMCk7XG59O1xuXG5cbmV4cG9ydHMuaW50RGF0ZTJzdHIgPSBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGR0O1xuICAgIGlmIChkIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBkdCA9IGQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZHQgPSBuZXcgRGF0ZShkKjg2NDAwMDAwKTtcbiAgICB9XG4gICAgcmV0dXJuIGR0LnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsMTApO1xufTtcblxuZXhwb3J0cy5pbnQyZGF0ZSA9IGZ1bmN0aW9uKGQpIHtcbiAgICBpZiAoZCBpbnN0YW5jZW9mIERhdGUpIHJldHVybiBkO1xuICAgIHZhciBkdCA9IG5ldyBEYXRlKGQqODY0MDAwMDApO1xuICAgIHJldHVybiBkdDtcbn07XG5cbmV4cG9ydHMudG9kYXkgPSBmdW5jdGlvbih0eikge1xuICAgIHR6ID0gdHogfHwgJ1VUQyc7XG5cbiAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHoodHopO1xuICAgIHZhciBkYXRlU3RyID0gZHQuZm9ybWF0KCdZWVlZLU1NLUREJyk7XG4gICAgdmFyIGR0MiA9IG5ldyBEYXRlKGRhdGVTdHIrJ1QwMDowMDowMC4wMDBaJyk7XG5cbiAgICByZXR1cm4gZHQyLmdldFRpbWUoKSAvIDg2NDAwMDAwO1xufTtcblxuXG5cblxuXG4vLy8gQ1JPTiBJTVBMRU1FTlRBVElPTlxuXG5mdW5jdGlvbiBtYXRjaE51bWJlcihuLCBmaWx0ZXIpIHtcbiAgICBuID0gcGFyc2VJbnQobik7XG4gICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiB0cnVlO1xuICAgIGlmIChmaWx0ZXIgPT09ICcqJykgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZpbHRlciA9PT0gbikgcmV0dXJuIHRydWU7XG4gICAgdmFyIGYgPSBmaWx0ZXIudG9TdHJpbmcoKTtcbiAgICB2YXIgb3B0aW9ucyA9IGYuc3BsaXQoJywnKTtcbiAgICBmb3IgKHZhciBpPTA7IGk8b3B0aW9uczsgaSs9MSkge1xuICAgICAgICB2YXIgYXJyID0gb3B0aW9uc1tpXS5zcGxpdCgnLScpO1xuICAgICAgICBpZiAoYXJyLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHBhcnNlSW50KGFyclswXSwxMCkgPT09IG4pIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGFyci5sZW5ndGggPT09Mikge1xuICAgICAgICAgICAgdmFyIGZyb20gPSBwYXJzZUludChhcnJbMF0sMTApO1xuICAgICAgICAgICAgdmFyIHRvID0gcGFyc2VJbnQoYXJyWzFdLDEwKTtcbiAgICAgICAgICAgIGlmICgobj49ZnJvbSApICYmIChuPD0gdG8pKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cblxuZnVuY3Rpb24gbWF0Y2hKb2Ioam9iLCBjcm9uRGF0ZSkge1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDAsMiksIGpvYi5taW51dGUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoMiwyKSwgam9iLmhvdXIpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoNCwyKSwgam9iLmRheU9mTW9udGgpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoNiwyKSwgam9iLm1vbnRoKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghbWF0Y2hOdW1iZXIoY3JvbkRhdGUuc3Vic3RyKDgsMSksIGpvYi5kYXlPZldlZWspKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBjcm9uSm9icyA9IFtdO1xuZXhwb3J0cy5hZGRDcm9uSm9iID0gZnVuY3Rpb24oam9iKSB7XG5cblxuICAgIGpvYi50eiA9IGpvYi50eiB8fCAnVVRDJztcblxuICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eihqb2IudHopO1xuICAgIHZhciBjcm9uRGF0ZSA9IGR0LmZvcm1hdCgnbW1ISERETU1kJyk7XG4gICAgam9iLmxhc3QgPSBjcm9uRGF0ZTtcbiAgICBqb2IuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgY3JvbkpvYnMucHVzaChqb2IpO1xuICAgIHJldHVybiBjcm9uSm9icy5sZW5ndGggLTE7XG59O1xuXG5leHBvcnRzLmRlbGV0ZUNyb25Kb2IgPSBmdW5jdGlvbihpZEpvYikge1xuICAgIGRlbGV0ZSBjcm9uSm9ic1tpZEpvYl07XG59O1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmUgYSBtaW51dGUgaW4gdGhlIGJlZ2luaW5nIG9mIGVhY2ggbWludXRlLlxuLy8gaXQgaXMgdXNlZCB0byBjcm9uIGFueSBmdW5jdGlvblxudmFyIG9uTWludXRlID0gZnVuY3Rpb24oKSB7XG5cblxuICAgIGNyb25Kb2JzLmZvckVhY2goZnVuY3Rpb24oam9iKSB7XG4gICAgICAgIGlmICgham9iKSByZXR1cm47XG5cbiAgICAgICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KGpvYi50eik7XG4gICAgICAgIHZhciBjcm9uRGF0ZSA9IGR0LmZvcm1hdCgnbW1ISERETU1kJyk7XG5cbiAgICAgICAgaWYgKChjcm9uRGF0ZSAhPT0gam9iLmxhc3QpICYmIChtYXRjaEpvYihqb2IsIGNyb25EYXRlKSkpIHtcbiAgICAgICAgICAgIGlmIChqb2IuZXhlY3V0aW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJKb2IgdGFrZXMgdG9vIGxvbmcgdG8gZXhlY3V0ZTogXCIgKyBqb2IubmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGpvYi5sYXN0ID0gY3JvbkRhdGU7XG4gICAgICAgICAgICAgICAgam9iLmV4ZWN1dGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgam9iLmNiKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBqb2IuZXhlY3V0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBub3cgPSBleHBvcnRzLm5vdygpLmdldFRpbWUoKTtcbiAgICB2YXIgbWlsbHNUb05leHRNaW51dGUgPSA2MDAwMCAtIG5vdyAlIDYwMDAwO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIG9uTWludXRlKCk7XG4gICAgfSwgbWlsbHNUb05leHRNaW51dGUpO1xufTtcblxub25NaW51dGUoKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBtYXN0ZXJVdGlscyA9IHtcbiAgICAgICAgZGF0ZVV0aWxzOiByZXF1aXJlKCcuL2RhdGVfdXRpbHMuanMnKSxcbiAgICAgICAgcm91bmQ6IHJlcXVpcmUoJy4vcm91bmQuanMnKSxcbiAgICAgICAgUHJpY2U6ICBudWxsLFxuICAgICAgICBQcmljZTI6IHJlcXVpcmUoJy4vcHJpY2UyLmpzJyksXG4gICAgICAgIGNoZWNrczoge1xuICAgICAgICAgICAgY2hlY2tDcmVkaXRDYXJkOiByZXF1aXJlKCcuL2NyZWRpdGNhcmQuanMnKS5jaGVja0NyZWRpdENhcmRcbiAgICAgICAgfSxcbiAgICAgICAgYXZhaWxhYmlsaXR5TWF0cml4OiByZXF1aXJlKCcuL2F2YWlsYWJpbGl0eV9tYXRyaXguanMnKVxuICAgIH07XG5cbiAgICB2YXIgcm9vdCA9IHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyAmJiBzZWxmLnNlbGYgPT09IHNlbGYgJiYgc2VsZiB8fFxuICAgICAgICAgICAgdHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsLmdsb2JhbCA9PT0gZ2xvYmFsICYmIGdsb2JhbCB8fFxuICAgICAgICAgICAgdGhpcztcblxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gbWFzdGVyVXRpbHM7XG4gICAgICAgIH1cbiAgICAgICAgZXhwb3J0cy5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB3aW5kb3cubWFzdGVyVXRpbHMgPSBtYXN0ZXJVdGlscztcbiAgICB9XG5cbn0oKSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcbnZhciByb3VuZCA9IHJlcXVpcmUoJy4vcm91bmQnKTtcbnZhciBkdSA9IHJlcXVpcmUoJy4vZGF0ZV91dGlscycpO1xuXG4vKlxuLy8gVklTVUFMSVpBVElPTiBGTEFHUyBJTiBFQUNIIE5PREVcbiAgICBzaG93SWZaZXJvOiAgICAgICAgIFNob3cgZXZlbiBpZiBUb3RhbCBpcyB6ZXJvXG4gICAgaWZPbmVIaWRlUGFyZW50OiAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoaXMgZ3JvdXAgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlIGl0IHdpdGggdGhlIGNoYWxkXG4gICAgaWZPbmVIaWRlQ2hpbGQ6ICAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoZSBjaGlsZFxuICAgIGhpZGVUb3RhbDogICAgICAgICAgSnVzdCByZW1vdmUgIHRoZSB0b3RhbCBhbmQgcHV0IGFsbCB0aGUgY2hpbGRzXG4gICAgdG90YWxPbkJvdHRvbTogICAgICAgICBQdXQgdGhlIFRvdGFsIG9uIHRoZSBkb3BcbiAgICBoaWRlRGV0YWlsOiAgICAgICAgIERvIG5vdCBzaG93IHRoZSBkZXRhaWxzXG4qL1xuXG5cbnZhciByZWdpc3RlcmVkTW9kaWZpZXJzID0ge1xuICAgIFwiQUdSRUdBVE9SXCI6IHJlcXVpcmUoXCIuL3ByaWNlX2FncmVnYXRvci5qc1wiKSxcbiAgICBcIkxJTkVcIjogcmVxdWlyZShcIi4vcHJpY2VfbGluZS5qc1wiKSxcbiAgICBcIlZBVElOQ0xVREVEXCI6IHJlcXVpcmUoXCIuL3ByaWNlX3ZhdGluY2x1ZGVkLmpzXCIpLFxuICAgIFwiRElTQ09VTlRcIjogcmVxdWlyZShcIi4vcHJpY2VfZGlzY291bnQuanNcIiksXG4gICAgXCJJTlNVUkFOQ0VcIjogcmVxdWlyZShcIi4vcHJpY2VfaW5zdXJhbmNlLmpzXCIpXG59O1xuXG52YXIgUHJpY2UyID0gZnVuY3Rpb24ocDEsIHAyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYubGluZXMgPSBbXTtcbiAgICBzZWxmLm9wdGlvbnMgPSB7fTtcbiAgICBfLmVhY2goYXJndW1lbnRzLCBmdW5jdGlvbihwKSB7XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICBpZiAoKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSYmKHAubGluZXMpKSB7XG4gICAgICAgICAgICAgICAgXy5lYWNoKHAubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUobCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBfLmVhY2gocCwgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJihwLmNsYXNzIHx8IHAubGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUocCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucyA9IHA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHNlbGYudHJlZVZhbGlkPWZhbHNlO1xuICAgIHNlbGYucmVuZGVyVmFsaWQ9ZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJUcmVlVmFsaWQ9ZmFsc2U7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLmFkZFByaWNlID0gZnVuY3Rpb24ocCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXApIHJldHVybjtcbiAgICB2YXIgY3A7XG4gICAgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJiAocC5saW5lcykpIHtcbiAgICAgICAgY3AgPSBwLmxpbmVzO1xuICAgIH0gZWxzZSBpZiAoY3AgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjcCA9IHA7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBjcCA9IFtwXTtcbiAgICB9XG4gICAgXy5lYWNoKGNwLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIHNlbGYubGluZXMucHVzaChfLmNsb25lKGwpKTtcbiAgICB9KTtcbiAgICBzZWxmLnRyZWVWYWxpZD1mYWxzZTtcbiAgICBzZWxmLnJlbmRlclZhbGlkID0gZmFsc2U7XG4gICAgc2VsZi5yZW5kZXJUcmVlVmFsaWQgPSBmYWxzZTtcbn07XG5cblxuUHJpY2UyLnByb3RvdHlwZS5jb25zdHJ1Y3RUcmVlID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBzb3J0VHJlZShub2RlKSB7XG4gICAgICAgIGlmIChub2RlLmNoaWxkcykge1xuICAgICAgICAgICAgbm9kZS5jaGlsZHMgPSBfLnNvcnRCeUFsbChub2RlLmNoaWxkcywgW1wib3JkZXJcIiwgXCJzdWJvcmRlclwiXSk7XG4gICAgICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIHNvcnRUcmVlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGNUb3RhbChub2RlKSB7XG4gICAgICAgIG5vZGUuaW1wb3J0ID0gbm9kZS5pbXBvcnQgfHwgMDtcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRzKSB7XG4gICAgICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICAgICAgICBub2RlLmltcG9ydCArPSBjYWxjVG90YWwoYyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZS5pbXBvcnQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcm91bmRJbXBvcnRzKG5vZGUpIHtcbiAgICAgICAgbm9kZS5pbXBvcnQgPSByb3VuZChub2RlLmltcG9ydCwgXCJST1VORFwiLCAwLjAxKTtcbiAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCByb3VuZEltcG9ydHMpO1xuICAgIH1cblxuICAgIGlmIChzZWxmLnRyZWVWYWxpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi50b3RhbDtcbiAgICB9XG5cbiAgICBzZWxmLnRvdGFsID0ge1xuICAgICAgICBpZDogXCJ0b3RhbFwiLFxuICAgICAgICBsYWJlbDogXCJAVG90YWxcIixcbiAgICAgICAgY2hpbGRzOiBbXSxcblxuICAgICAgICBzaG93SWZaZXJvOiB0cnVlLFxuICAgICAgICB0b3RhbE9uQm90dG9tOiB0cnVlXG4gICAgfTtcblxuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcblxuICAgIHZhciBpID0wO1xuXG4gICAgXy5lYWNoKHNlbGYubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgbC5zdWJvcmRlciA9IGkrKzsgICAgICAgICAgICAgICAvLyBzdWJvcmRlciBpcyB0aGUgb3JpZ2luYWwgb3JkZXIuIEluIGNhc2Ugb2YgdGllIHVzZSB0aGlzLlxuICAgICAgICBsLmNsYXNzID0gbC5jbGFzcyB8fCBcIkxJTkVcIjtcbiAgICAgICAgaWYgKCFyZWdpc3RlcmVkTW9kaWZpZXJzW2wuY2xhc3NdKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNb2RpZmllciBcIiArIGwuY2xhc3MgKyBcIiBub3QgZGVmaW5lZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1vZGlmaWVyID0gbmV3IHJlZ2lzdGVyZWRNb2RpZmllcnNbbC5jbGFzc10obCk7XG4gICAgICAgIG1vZGlmaWVyLnN1Ym9yZGVyID0gaTtcbiAgICAgICAgbW9kaWZpZXJzLnB1c2gobW9kaWZpZXIpO1xuICAgIH0pO1xuXG4gICAgbW9kaWZpZXJzID0gXy5zb3J0QnlBbGwobW9kaWZpZXJzLCBbXCJleGVjT3JkZXJcIiwgXCJleGVjU3Vib3JkZXJcIiwgXCJzdWJvcmRlclwiXSk7XG5cbiAgICBfLmVhY2gobW9kaWZpZXJzLCBmdW5jdGlvbihtKSB7XG4gICAgICAgIG0ubW9kaWZ5KHNlbGYudG90YWwsIHNlbGYub3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgICBzb3J0VHJlZShzZWxmLnRvdGFsKTtcblxuICAgIGNhbGNUb3RhbChzZWxmLnRvdGFsKTtcbiAgICByb3VuZEltcG9ydHMoc2VsZi50b3RhbCk7XG5cbiAgICBzZWxmLnRyZWVWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYudG90YWw7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG5cblxuLypcbi8vIFZJU1VBTElaQVRJT04gRkxBR1MgSU4gRUFDSCBOT0RFXG4gICAgc2hvd0lmWmVybzogICAgICAgICBTaG93IGV2ZW4gaWYgVG90YWwgaXMgemVyb1xuICAgIGlmT25lSGlkZVBhcmVudDogICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGlzIGdyb3VwIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZSBpdCB3aXRoIHRoZSBjaGFsZFxuICAgIGlmT25lSGlkZUNoaWxkOiAgICAgSWYgdGhpcyBncm91cCBoYXMgb25seSBvbmUgY2hpbGQsIHJlbW92ZSB0aGUgY2hpbGRcbiAgICBoaWRlVG90YWw6ICAgICAgICAgIEp1c3QgcmVtb3ZlICB0aGUgdG90YWwgYW5kIHB1dCBhbGwgdGhlIGNoaWxkc1xuICAgIHRvdGFsT25Cb3R0b206ICAgICAgICAgUHV0IHRoZSBUb3RhbCBvbiB0aGUgZG9wXG4gICAgaGlkZURldGFpbDogICAgICAgICBEbyBub3Qgc2hvdyB0aGUgZGV0YWlsc1xuXG4gICAgaGlkZUlmTm9DaGlsZHM6ICAgICBIaWRlIGlmIGlzIGEgcGFyZW50IHdpdGggbm8gY2hpbGRzXG4qL1xuXG5cbiAgICBmdW5jdGlvbiByZW5kZXJOb2RlKG5vZGUsIGxldmVsKSB7XG5cbiAgICAgICAgdmFyIHJlbmRlclRvdGFsID0gdHJ1ZTtcbiAgICAgICAgdmFyIHJlbmRlckRldGFpbCA9IHRydWU7XG4gICAgICAgIGlmICgoIW5vZGUuc2hvd0lmWmVybykgJiYgKCFub2RlLnF1YW50aXR5KSAmJiAoIW5vZGUuaW1wb3J0KSkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgaWYgKChub2RlLmNoaWxkcykmJihub2RlLmNoaWxkcy5sZW5ndGggPT09IDEpJiYoIW5vZGUuaGlkZURldGFpbCkpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZVBhcmVudCkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZUNoaWxkKSByZW5kZXJEZXRhaWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKCghbm9kZS5jaGlsZHMpfHwobm9kZS5jaGlsZHMubGVuZ3RoID09PSAwKSkmJihub2RlLmhpZGVJZk5vQ2hpbGRzKSkgIHtcbiAgICAgICAgICAgIHJlbmRlclRvdGFsID1mYWxzZTtcbiAgICAgICAgICAgIHJlbmRlckRldGFpbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlLmhpZGVEZXRhaWwpIHJlbmRlckRldGFpbD0gZmFsc2U7XG4gICAgICAgIGlmIChub2RlLmhpZGVUb3RhbCkgcmVuZGVyVG90YWw9ZmFsc2U7XG5cbiAgICAgICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKG5vZGUpO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5jaGlsZHM7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLnNob3dJZlplcm87XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmhpZGVEZXRhaWw7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmhpZGVUb3RhbDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaWZPbmVIaWRlUGFyZW50O1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5pZk9uZUhpZGVDaGlsZDtcbiAgICAgICAgbmV3Tm9kZS5sZXZlbCA9IGxldmVsO1xuXG4gICAgICAgIGlmICgocmVuZGVyVG90YWwpICYmICghbm9kZS50b3RhbE9uQm90dG9tKSkge1xuICAgICAgICAgICAgc2VsZi5yZW5kZXJSZXN1bHQucHVzaChuZXdOb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZW5kZXJEZXRhaWwpIHtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgZnVuY3Rpb24oY2hpbGROb2RlKSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyTm9kZShjaGlsZE5vZGUsIHJlbmRlclRvdGFsID8gbGV2ZWwgKzEgOiBsZXZlbCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHJlbmRlclRvdGFsKSAmJiAobm9kZS50b3RhbE9uQm90dG9tKSkge1xuICAgICAgICAgICAgc2VsZi5yZW5kZXJSZXN1bHQucHVzaChuZXdOb2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLnJlbmRlclZhbGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnJlbmRlclJlc3VsdDtcbiAgICB9XG5cbiAgICBzZWxmLnJlbmRlclJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICByZW5kZXJOb2RlKHNlbGYudG90YWwsIDApO1xuXG4gICAgc2VsZi5yZW5kZXJWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYucmVuZGVyUmVzdWx0O1xufTtcblxuXG5QcmljZTIucHJvdG90eXBlLnJlbmRlclRyZWUgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuXG5cbi8qXG4vLyBWSVNVQUxJWkFUSU9OIEZMQUdTIElOIEVBQ0ggTk9ERVxuICAgIHNob3dJZlplcm86ICAgICAgICAgU2hvdyBldmVuIGlmIFRvdGFsIGlzIHplcm9cbiAgICBpZk9uZUhpZGVQYXJlbnQ6ICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhpcyBncm91cCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2UgaXQgd2l0aCB0aGUgY2hhbGRcbiAgICBpZk9uZUhpZGVDaGlsZDogICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhlIGNoaWxkXG4gICAgaGlkZVRvdGFsOiAgICAgICAgICBKdXN0IHJlbW92ZSAgdGhlIHRvdGFsIGFuZCBwdXQgYWxsIHRoZSBjaGlsZHNcbiAgICB0b3RhbE9uQm90dG9tOiAgICAgICAgIFB1dCB0aGUgVG90YWwgb24gdGhlIGRvcFxuICAgIGhpZGVEZXRhaWw6ICAgICAgICAgRG8gbm90IHNob3cgdGhlIGRldGFpbHNcbiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbmRlclRyZWVOb2RlKG5vZGUsIHBhcmVudE5vZGUpIHtcblxuXG4gICAgICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZShub2RlKTtcbiAgICAgICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcblxuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgcmVuZGVyVHJlZU5vZGUoY2hpbGROb2RlLCBuZXdOb2RlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJlbmRlclRvdGFsID0gdHJ1ZTtcbiAgICAgICAgdmFyIHJlbmRlckRldGFpbCA9IHRydWU7XG4gICAgICAgIGlmICgoIW5vZGUuc2hvd0lmWmVybykgJiYgKCFub2RlLnF1YW50aXR5KSAmJiAoIW5vZGUuaW1wb3J0KSkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgaWYgKChuZXdOb2RlLmNoaWxkcy5sZW5ndGggPT09IDEpJiYoIW5vZGUuaGlkZURldGFpbCkpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZVBhcmVudCkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZUNoaWxkKSByZW5kZXJEZXRhaWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKG5ld05vZGUuY2hpbGRzLmxlbmd0aCA9PT0gMCkmJihub2RlLmhpZGVJZk5vQ2hpbGRzKSkge1xuICAgICAgICAgICAgcmVuZGVyVG90YWwgPWZhbHNlO1xuICAgICAgICAgICAgcmVuZGVyRGV0YWlsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUuaGlkZURldGFpbCkgcmVuZGVyRGV0YWlsPSBmYWxzZTtcbiAgICAgICAgaWYgKG5vZGUuaGlkZVRvdGFsKSByZW5kZXJUb3RhbD1mYWxzZTtcblxuXG4gICAgICAgIC8vICAgICAgICAgICAgbmV3Tm9kZS5wYXJlbnQgPSBwYXJlbnROb2RlO1xuXG4gICAgICAgIGlmICghcmVuZGVyRGV0YWlsKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcyA9IFtdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAocmVuZGVyVG90YWwpIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnJlbmRlclRyZWVSZXN1bHQgPSBuZXdOb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgaGlkZVRvdGFsOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uZWFjaChuZXdOb2RlLmNoaWxkcywgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUuY2hpbGRzLnB1c2gobik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TGV2ZWwobm9kZSwgbGV2ZWwpIHtcbiAgICAgICAgbm9kZS5sZXZlbCA9IGxldmVsO1xuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIHNldExldmVsKG4sIGxldmVsKzEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoc2VsZi5yZW5kZXJUcmVlVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyVHJlZVJlc3VsdDtcbiAgICB9XG5cbiAgICBzZWxmLmNvbnN0cnVjdFRyZWUoKTtcblxuICAgIHNlbGYucmVuZGVyVHJlZVJlc3VsdCA9IG51bGw7XG5cbiAgICByZW5kZXJUcmVlTm9kZShzZWxmLnRvdGFsLCBudWxsKTtcblxuICAgIHNldExldmVsKHNlbGYucmVuZGVyVHJlZVJlc3VsdCwgMCk7XG5cbiAgICBzZWxmLnJlbmRlclRyZWVWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYucmVuZGVyVHJlZVJlc3VsdDtcbn07XG5cbmZ1bmN0aW9uIGZpbmROb2RlKG5vZGUsIGlkKSB7XG4gICAgdmFyIGk7XG4gICAgaWYgKCFub2RlKSByZXR1cm4gbnVsbDtcbiAgICBpZiAobm9kZS5pZCA9PT0gaWQpIHJldHVybiBub2RlO1xuICAgIGlmICghbm9kZS5jaGlsZHMpIHJldHVybiBudWxsO1xuICAgIGZvciAoaT0wOyBpPG5vZGUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICB2YXIgZk5vZGUgPSBmaW5kTm9kZShub2RlLmNoaWxkc1tpXSwgaWQpO1xuICAgICAgICBpZiAoZk5vZGUpIHJldHVybiBmTm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cblByaWNlMi5wcm90b3R5cGUuZ2V0SW1wb3J0ID0gZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWQgPSBpZCB8fCBcInRvdGFsXCI7XG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICB2YXIgbm9kZSA9IGZpbmROb2RlKHNlbGYudG90YWwsIGlkKTtcblxuICAgIGlmIChub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlLmltcG9ydDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG5QcmljZTIucHJvdG90eXBlLmFkZEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihhdHJpYnV0ZSkge1xuICAgIHZhciBzZWxmPXRoaXM7XG4gICAgdmFyIGF0dHJzO1xuICAgIGlmICh0eXBlb2YgYXRyaWJ1dGUgPT09IFwic3RyaW5nXCIgKSB7XG4gICAgICAgIGF0dHJzID0gW2F0cmlidXRlXTtcbiAgICB9IGVsc2UgaWYgKGF0cmlidXRlIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgYXR0cnMgPSBhdHJpYnV0ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEF0dHJpYnV0ZVwiKTtcbiAgICB9XG4gICAgXy5lYWNoKGF0dHJzLCBmdW5jdGlvbihhKSB7XG4gICAgICAgIF8uZWFjaChzZWxmLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICBpZiAoIWwuYXR0cmlidXRlcykgbC5hdHRyaWJ1dGVzID0gW107XG4gICAgICAgICAgICBpZiAoIV8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBhKSkge1xuICAgICAgICAgICAgICAgIGwuYXR0cmlidXRlcy5wdXNoKGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cblByaWNlMi5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIG9iai5saW5lcyA9IF8ubWFwKHRoaXMubGluZXMsIF8uY2xvbmUpO1xuICAgIF8uZWFjaChvYmoubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsLmZyb20gPT09IFwibnVtYmVyXCIpIGwuZnJvbSA9IGR1LmludDJkYXRlKGwuZnJvbSk7XG4gICAgICAgIGlmICh0eXBlb2YgbC50byA9PT0gXCJudW1iZXJcIikgbC50byA9IGR1LmludDJkYXRlKGwudG8pO1xuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG59O1xuXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2UyO1xuXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxuLypcblxuQWdyZWdhdGUgTW9kaWZpZXJcbj09PT09PT09PT09PT09PT09XG5cbiAgICBncm91cEJ5ICAgICAgICAgICAgIEZsYWcgb2YgdGhlIGxpbmVzIHRoYXQgc2hvdWxkIGJlIHJlcGxhY2VkXG4gICAgZXhlY09yZGVyICAgICAgICAgICBPcmRlciBpbiB3aGljaCB0aGlzIG1vZGlmaWVyIGkgZXhjZXZ1dGVkLlxuXG59XG5cbiovXG5cbnZhciBQcmljZUFncmVnYXRvciA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuICAgIHRoaXMuZXhlY09yZGVyID0gbGluZS5leGVjT3JkZXIgfHwgOTtcbiAgICB0aGlzLmdyb3VwQnkgPSBsaW5lLmdyb3VwQnk7XG4gICAgaWYgKCAhICh0aGlzLmdyb3VwQnkgaW5zdGFuY2VvZiAgQXJyYXkpKSB7XG4gICAgICAgIHRoaXMuZ3JvdXBCeSA9IFsgdGhpcy5ncm91cEJ5IF07XG4gICAgfVxufTtcblxuUHJpY2VBZ3JlZ2F0b3IucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIG5ld05vZGUgPSBfLmNsb25lKHRoaXMubGluZSk7XG4gICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAoXy5pbnRlcnNlY3Rpb24obC5hdHRyaWJ1dGVzLCBzZWxmLmdyb3VwQnkpLmxlbmd0aCA9PT0gIHNlbGYuZ3JvdXBCeS5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5ld05vZGUuY2hpbGRzLnB1c2gobCk7XG4gICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgaS09MTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0cmVlLmNoaWxkcy5wdXNoKG5ld05vZGUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUFncmVnYXRvcjtcblxuXG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcbnZhciBkdT0gcmVxdWlyZShcIi4vZGF0ZV91dGlscy5qc1wiKTtcblxuLypcblxuRGlzY291bnQgTW9kaWZpZXJcbj09PT09PT09PT09PT09PT09XG5cbiAgICBwaGFzZSAgICAgICAgICAgICBGbGFnIG9mIHRoZSBsaW5lcyB0aGF0IHNob3VsZCBiZSByZXBsYWNlZFxuICAgIGV4ZWNPcmRlciAgICAgICAgICAgT3JkZXIgaW4gd2hpY2ggdGhpcyBtb2RpZmllciBpIGV4Y2V2dXRlZC5cbiAgICBydWxlcyAgICAgICAgICAgICAgQXJyYXkgb2YgcnVsZXNcblxuXG5cbn1cblxuKi9cblxudmFyIFByaWNlRGlzY291bnQgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5leGVjU3Vib3JkZXIgPSBsaW5lLnBoYXNlO1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA1O1xuXG59O1xuXG5QcmljZURpc2NvdW50LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBydWxlRG9lc0FwcGx5IChydWxlKSB7XG4gICAgICAgIHZhciBpUmVzZXJ2YXRpb24gPSBkdS5kYXRlMmludChvcHRpb25zLnJlc2VydmF0aW9uKTtcbiAgICAgICAgaWYgKChydWxlLnJlc2VydmF0aW9uTWluKSYmKGlSZXNlcnZhdGlvbiA8IGR1LmRhdGUyaW50KHJ1bGUucmVzZXJ2YXRpb25NaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUucmVzZXJ2YXRpb25NYXgpJiYoaVJlc2VydmF0aW9uID4gZHUuZGF0ZTJpbnQocnVsZS5yZXNlcnZhdGlvbk1heCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBpQ2hlY2tpbiA9IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbik7XG4gICAgICAgIHZhciBpQ2hlY2tvdXQgPSBkdS5kYXRlMmludChvcHRpb25zLmNoZWNrb3V0KTtcbiAgICAgICAgaWYgKChydWxlLmRheXNCZWZvcmVDaGVja2luTWluKSYmKCBpQ2hlY2tpbiAtIGlSZXNlcnZhdGlvbiA8IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW4gKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW4gfHwgcnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbj09PTApJiYoIGlDaGVja2luIC0gaVJlc2VydmF0aW9uID4gcnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1heCApKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja2luTWluKSYmKCBpQ2hlY2tpbiA8IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tpbk1pbikpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja2luTWF4KSYmKCBpQ2hlY2tpbiA+IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tpbk1heCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja291dE1pbikmJiggaUNoZWNrb3V0IDwgZHUuZGF0ZTJpbnQocnVsZS5jaGVja291dE1pbikpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja291dE1heCkmJiggaUNoZWNrb3V0ID4gZHUuZGF0ZTJpbnQocnVsZS5jaGVja291dE1heCkpKSByZXR1cm4gZmFsc2U7XG5cblxuICAgICAgICAvLyBXZSBjbGN1bGF0ZSBhbiBlZmVjdGl2ZSBjaGVja2luL2NoZWNrb3V0IHRha2luZyBpbiBhY2NvdW50IHRoZSBzdGF5TGVuZ3RoRnJvbSBhbmQgc3RheUxlbmd0aFRvXG5cbiAgICAgICAgdmFyIGVmQ2hlY2tvdXQsIGVmQ2hlY2tpbjtcbiAgICAgICAgaWYgKHJ1bGUuc3RheUxlbmd0aEZyb20pIHtcbiAgICAgICAgICAgIGVmQ2hlY2tpbiA9IE1hdGgubWF4KGlDaGVja2luLCBkdS5kYXRlMmludChydWxlLnN0YXlMZW5ndGhGcm9tKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZkNoZWNraW4gPSBpQ2hlY2tpbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocnVsZS5zdGF5TGVuZ3RoVG8pIHtcbiAgICAgICAgICAgIGVmQ2hlY2tvdXQgPSBNYXRoLm1pbihpQ2hlY2tvdXQsIGR1LmRhdGUyaW50KHJ1bGUuc3RheUxlbmd0aFRvKSArMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZkNoZWNrb3V0ID0gaUNoZWNrb3V0O1xuICAgICAgICB9XG4gICAgICAgIHZhciBlZkxlbiA9IGVmQ2hlY2tvdXQgLWVmQ2hlY2tpbjtcbiAgICAgICAgaWYgKGVmTGVuPjApIHtcbiAgICAgICAgICAgIGlmICgocnVsZS5taW5TdGF5KSYmKCBlZkxlbiA8IHJ1bGUubWluU3RheSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmICgocnVsZS5tYXhTdGF5IHx8IHJ1bGUubWF4U3RheT09PTApJiYoIGVmTGVuID4gcnVsZS5tYXhTdGF5KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBwcm9wb3J0aW9uQXBwbHkoaUluLCBpT3V0LCBpQXBwbHlGcm9tLCBpQXBwbHlUbykge1xuICAgICAgICB2YXIgYSA9IGlJbiA+IGlBcHBseUZyb20gPyBpSW4gOiBpQXBwbHlGcm9tO1xuICAgICAgICB2YXIgYiA9IGlPdXQgPCBpQXBwbHlUbyA/IGlPdXQgOiBpQXBwbHlUbztcbiAgICAgICAgaWYgKGI+YSkgcmV0dXJuIDA7XG4gICAgICAgIHJldHVybiAoYi1hKS8oaU91dC1pSW4pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheXNJblJ1bGUobGluZSwgcnVsZSkge1xuICAgICAgICB2YXIgYSxiLGk7XG4gICAgICAgIHZhciBkYXlzID0gW107XG4gICAgICAgIHZhciBsRnJvbSA9IGxpbmUuZnJvbSA/IGR1LmRhdGUyaW50KGxpbmUuZnJvbSkgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgbFRvID0gbGluZS50byA/IGR1LmRhdGUyaW50KGxpbmUudG8pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGlmIChydWxlLmFwcGxpY2F0aW9uVHlwZSA9PT0gXCJXSE9MRVwiKSB7XG4gICAgICAgICAgICBhID0gbEZyb207XG4gICAgICAgICAgICBiID0gbFRvO1xuICAgICAgICB9IGVsc2UgaWYgKHJ1bGUuYXBwbGljYXRpb25UeXBlID09PSBcIkJZREFZXCIpIHtcbiAgICAgICAgICAgIHZhciByRnJvbSA9IGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlGcm9tKTtcbiAgICAgICAgICAgIHZhciByVG8gPSBkdS5kYXRlMmludChydWxlLmFwcGx5VG8pICsgMTtcblxuICAgICAgICAgICAgYSA9IE1hdGgubWF4KHJGcm9tLCBsRnJvbSk7XG4gICAgICAgICAgICBiID0gTWF0aC5taW4oclRvLCBsVG8pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaT1hOyBpPGI7IGkrPTEpIHtcbiAgICAgICAgICAgIGRheXMucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF5cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5MaW5lKGxpbmUpIHtcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIHZhciBkYXlzID0gW107XG4gICAgICAgIHZhciBsRnJvbSA9IGxpbmUuZnJvbSA/IGR1LmRhdGUyaW50KGxpbmUuZnJvbSkgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgbFRvID0gbGluZS50byA/IGR1LmRhdGUyaW50KGxpbmUudG8pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGZvciAoaT1sRnJvbTsgaTxsVG87IGkrPTEpIHtcbiAgICAgICAgICAgIGRheXMucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF5cztcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdGhlIGRpc2NvdW50cyB3aXRoIHRoZSBzYW1lIG9yIGdyZWF0ZXIgcGhhc2UuXG5cbiAgICB2YXIgc2FtZVBoYXNlRGlzY291bnRzID0gW107XG4gICAgdmFyIHBvc3Rwb25lZERpc2NvdW50cyA9IFtdO1xuICAgIHZhciBhcHBsaWVkRGlzY291bnRzID0gW107XG5cbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAobC5kaXNjb3VudFBlckRheSkge1xuICAgICAgICAgICAgaWYgKGwucGhhc2UgPT09IHNlbGYubGluZS5waGFzZSkgeyAvLyBSZW1vdmUgYW5kIGdldCB0aGUgYmVzdFxuICAgICAgICAgICAgICAgIHNhbWVQaGFzZURpc2NvdW50cy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzW2ldID0gdHJlZS5jaGlsZHNbdHJlZS5jaGlsZHMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGktPTE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGwucGhhc2UgPiBzZWxmLmxpbmUucGhhc2UpIHsgLy8gUmVtb3ZlIGFuZCByZXByY2VzcyAgbGF0ZXJcbiAgICAgICAgICAgICAgICBwb3N0cG9uZWREaXNjb3VudHMucHVzaChsKTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgICAgICBpLT0xO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcHBsaWVkRGlzY291bnRzLnB1c2gobCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYXBwbGllZFJ1bGVzID0gXy5maWx0ZXIoc2VsZi5saW5lLnJ1bGVzLCBydWxlRG9lc0FwcGx5KTtcblxuICAgIC8vIFRoaXMgaGFzaCBjb250YWlucyB0aGUgYmVzdCBkaXNjb3VudCBmb3IgZWFjaCBsaW5lIGFuZCBkYXlcbiAgICAvLyBkaXNjb3VudFBlckRheVsnM3wxODQ3NSddPSAxNSBNZWFucyB0aGF0IHRoZSBsaW5lIHRyZWVbM10gd2lsbCBhcHBseXNcbiAgICAvLyBhIDE1JSBkaXNjb3VudCBhdCBkYXkgMTg0NzVcbiAgICB2YXIgZGlzY291bnRQZXJEYXkgPSB7fTtcbiAgICBfLmVhY2goYXBwbGllZFJ1bGVzLCBmdW5jdGlvbihydWxlKSB7XG4gICAgICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCwgbGluZUlkeCkgeyAvLyBUT0RPIG1pcmFyIHRvdCBsJ2FyYnJlXG4gICAgICAgICAgICBpZiAobC5jbGFzcyAhPT0gXCJMSU5FXCIpIHJldHVybjtcbiAgICAgICAgICAgIGlmICghIF8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBydWxlLmFwcGx5SWRDb25jZXB0QXR0cmlidXRlLnRvU3RyaW5nKCkpKSByZXR1cm47XG4gICAgICAgICAgICBfLmVhY2goZGF5c0luUnVsZShsLCBydWxlKSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIHZhciBrPSBsaW5lSWR4Kyd8JytkO1xuXG4gICAgICAgICAgICAgICAgdmFyIGRzYyA9IC0gcnVsZS5hcHBseURpc2NvdW50UEMgKiAgbC5xdWFudGl0eSAqICBsLmJhc2VQcmljZSAvIDEwMDtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXBwbGllZERpc2NvdW50cywgZnVuY3Rpb24ob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEgXy5jb250YWlucyhvZC5hdHRyaWJ1dGVzLCBydWxlLmFwcGx5SWRDb25jZXB0QXR0cmlidXRlLnRvU3RyaW5nKCkpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGlmIChvZC5kaXNjb3VudFBlckRheVtrXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZHNjID0gZHNjIC0gIG9kLmRpc2NvdW50UGVyRGF5W2tdICogcnVsZS5hcHBseURpc2NvdW50UEMvMTAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRpc2NvdW50UGVyRGF5W2tdKSBkaXNjb3VudFBlckRheVtrXT0wO1xuICAgICAgICAgICAgICAgIGRpc2NvdW50UGVyRGF5W2tdID0gTWF0aC5taW4oZGlzY291bnRQZXJEYXlba10sIGRzYyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgdmF0ID0wO1xuICAgIHZhciBiYXNlID0wO1xuICAgIHZhciB0b3RhbEltcG9ydCA9MDtcblxuICAgIC8vIHRvYWxlSW1wb3J0IGFuZCBiYXNlIGFyZSB0aGUgdG90YWwgYW1vdW50cyBvZiBkaXNjb3VudHMgdGhhdCBhcmUgYXBwbGllZFxuICAgIC8vIFRoZSBWQVQgaXMgYSBwb25kZXJhdGVkIGF2ZXJhZ2Ugb2YgYWxsIHRoZSBsaW5lcyB0aGVyIHRoZSBkaXNjb3VudCBhcHBsaWVzLlxuXG4gICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsLCBsaW5lSWR4KSB7XG4gICAgICAgIGlmIChsLmRpc2NvdW50UGVyRGF5KSByZXR1cm47XG4gICAgICAgIHZhciBkc2M9MDtcbiAgICAgICAgXy5lYWNoKGRheXNJbkxpbmUobCksIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBrPSBsaW5lSWR4Kyd8JytkO1xuICAgICAgICAgICAgaWYgKGRpc2NvdW50UGVyRGF5W2tdKSB7XG4gICAgICAgICAgICAgICAgZHNjICs9IGRpc2NvdW50UGVyRGF5W2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgbFZhdCA9IDA7XG4gICAgICAgIF8uZWFjaChsLnRheGVzLCBmdW5jdGlvbih0YXgpIHtcbiAgICAgICAgICAgIGlmICh0YXgudHlwZSA9PT0gXCJWQVRcIikge1xuICAgICAgICAgICAgICAgIGxWYXQgPSB0YXguUEM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgoYmFzZSArIGRzYykgIT09IDApIHtcbiAgICAgICAgICAgIHZhdCA9ICh2YXQqYmFzZSArIGxWYXQqZHNjKSAvIChiYXNlICsgZHNjKTtcbiAgICAgICAgfVxuICAgICAgICBiYXNlID0gYmFzZSArIGRzYztcbiAgICAgICAgaWYgKGwuYmFzZUltcG9ydCkge1xuICAgICAgICAgICAgdG90YWxJbXBvcnQgPSB0b3RhbEltcG9ydCArIGwuaW1wb3J0ICogZHNjL2wuYmFzZUltcG9ydDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIGJlc3RMaW5lID0gXy5jbG9uZShzZWxmLmxpbmUpO1xuXG4gICAgYmVzdExpbmUuYmFzZUltcG9ydCA9IGJhc2U7XG4gICAgYmVzdExpbmUuYmFzZVByaWNlID0gYmFzZTtcbiAgICBiZXN0TGluZS5pbXBvcnQgPSB0b3RhbEltcG9ydDtcbiAgICBiZXN0TGluZS5xdWFudGl0eSA9IDE7XG4gICAgYmVzdExpbmUuY2xhc3MgPSBcIkxJTkVcIjtcbiAgICBiZXN0TGluZS5zdWJvcmRlciA9IHNlbGYuZXhlY1N1Ym9yZGVyO1xuICAgIGJlc3RMaW5lLmRpc2NvdW50UGVyRGF5ID0gZGlzY291bnRQZXJEYXk7XG5cbiAgICBiZXN0TGluZS50YXhlcyA9IGJlc3RMaW5lLnRheGVzIHx8IFtdO1xuXG4gICAgdmFyIHRheCA9IF8uZmluZFdoZXJlKGJlc3RMaW5lLnRheGVzLHt0eXBlOiBcIlZBVFwifSk7XG4gICAgaWYgKCF0YXgpIHtcbiAgICAgICAgdGF4ID0ge1xuICAgICAgICAgICAgdHlwZTogXCJWQVRcIlxuICAgICAgICB9O1xuICAgICAgICBiZXN0TGluZS50YXhlcy5wdXNoKHRheCk7XG4gICAgfVxuICAgIHRheC5QQyA9IHZhdDtcblxuICAgIC8vIEZpbmQgdGhlIGJlc3QgZGlzY291bnQgY29uY2VwdCBpbiB0aGUgc2FtZSBwaGFzZS5cblxuICAgIHNhbWVQaGFzZURpc2NvdW50cy5wdXNoKGJlc3RMaW5lKTtcblxuICAgIHZhciBiZXN0TGluZUluUGhhc2UgPSBfLnJlZHVjZShzYW1lUGhhc2VEaXNjb3VudHMsIGZ1bmN0aW9uKGJlc3RMaW5lLCBsaW5lKSB7XG4gICAgICAgIGlmICghbGluZSkgcmV0dXJuIGJlc3RMaW5lO1xuICAgICAgICByZXR1cm4gKGxpbmUuaW1wb3J0IDwgYmVzdExpbmUuaW1wb3J0KSA/IGxpbmUgOiBiZXN0TGluZTtcbiAgICB9KTtcblxuICAgIGlmIChiZXN0TGluZUluUGhhc2UuaW1wb3J0ICE9PSAwKSB7XG4gICAgICAgIHRyZWUuY2hpbGRzLnB1c2goYmVzdExpbmVJblBoYXNlKTtcbiAgICB9XG5cbiAgICAvLyBGaW5hbHkgd2UgcmVhcGx5IHRoZSBkaXNjb3VudHMgb2YgZ3JlYXRlciBwaGFzZXMgdGhhdCB3dWVyZSBhcHBsaWVkIGJlZm9yZS5cblxuICAgIHBvc3Rwb25lZERpc2NvdW50cyA9IF8uc29ydEJ5KHBvc3Rwb25lZERpc2NvdW50cywgJ3BoYXNlJyk7XG5cbiAgICBfLmVhY2gocG9zdHBvbmVkRGlzY291bnRzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIHZhciBtb2RpZmllciA9IG5ldyBQcmljZURpc2NvdW50KGwpO1xuICAgICAgICBtb2RpZmllci5hcHBseSh0cmVlLCBvcHRpb25zKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VEaXNjb3VudDtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgUHJpY2VJbnN1cmFuY2UgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDg7XG59O1xuXG5QcmljZUluc3VyYW5jZS5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbCA9IF8uY2xvbmUodGhpcy5saW5lKTtcblxuXG4gICAgdmFyIGJhc2UgPSAwO1xuICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCkge1xuICAgICAgICBiYXNlICs9IGwuaW1wb3J0O1xuICAgIH0pO1xuXG4gICAgdmFyIHByaWNlO1xuICAgIGlmICh0eXBlb2Ygc2VsZi5saW5lLnByaWNlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIHByaWNlID0gc2VsZi5saW5lLnByaWNlO1xuICAgIH0gZWxzZSBpZiAoICh0eXBlb2Ygc2VsZi5saW5lLnByaWNlPT09XCJvYmplY3RcIikgJiYgKHNlbGYubGluZS5wcmljZS50eXBlID09PSAnUEVSJykgKSB7XG4gICAgICAgIHByaWNlID0gYmFzZSAqIHNlbGYubGluZS5wcmljZS5wcmljZVBDLzEwMDtcbiAgICAgICAgaWYgKHByaWNlPHNlbGYubGluZS5wcmljZS5wcmljZU1pbikgcHJpY2UgPSBzZWxmLmxpbmUucHJpY2UucHJpY2VNaW47XG4gICAgfSBlbHNlIGlmICggKHR5cGVvZiBzZWxmLmxpbmUucHJpY2U9PT1cIm9iamVjdFwiKSAmJiAoc2VsZi5saW5lLnByaWNlLnR5cGUgPT09ICdFU0MnKSApIHtcbiAgICAgICAgcHJpY2U9TnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgXy5lYWNoKHNlbGYubGluZS5wcmljZS5zY2FsZVByaWNlcywgZnVuY3Rpb24oc3ApIHtcbiAgICAgICAgICAgIGlmICgoYmFzZSA8PSBzcC5zdGF5UHJpY2VNYXgpICYmIChzcC5wcmljZSA8IHByaWNlKSkge1xuICAgICAgICAgICAgICAgIHByaWNlID0gc3AucHJpY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocHJpY2UgPT09IE51bWJlci5NQVhfVkFMVUUpIHtcbiAgICAgICAgICAgIHByaWNlID0gTmFOO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBsLmltcG9ydCA9IHByaWNlO1xuICAgIGwuYmFzZUltcG9ydCA9IHByaWNlO1xuICAgIGwuYmFzZVByaWNlID0gcHJpY2U7XG4gICAgbC5xdWFudGl0eSA9IDE7XG5cbiAgICB0cmVlLmNoaWxkcy5wdXNoKGwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUluc3VyYW5jZTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgUHJpY2VMaW5lID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCAwO1xufTtcblxuUHJpY2VMaW5lLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIGwgPSBfLmNsb25lKHRoaXMubGluZSk7XG5cbiAgICB2YXIgcHJpY2UgPSBsLnByaWNlO1xuXG4gICAgbC5pbXBvcnQgPSBsLnByaWNlICogbC5xdWFudGl0eTtcbiAgICBpZiAoIWlzTmFOKGwucGVyaW9kcykpIHtcbiAgICAgICAgbC5pbXBvcnQgPSBsLmltcG9ydCAqIGwucGVyaW9kcztcbiAgICB9XG5cbiAgICBpZiAobC5kaXNjb3VudCkge1xuICAgICAgICBsLmltcG9ydCA9IGwuaW1wb3J0ICogKDEgLSBsLmRpc2NvdW50LzEwMCk7XG4gICAgfVxuXG4gICAgbC5iYXNlSW1wb3J0ID0gbC5pbXBvcnQ7XG4gICAgbC5iYXNlUHJpY2UgPSBsLnByaWNlO1xuXG4gICAgdHJlZS5jaGlsZHMucHVzaChsKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VMaW5lO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgcm91bmQgPSByZXF1aXJlKCcuL3JvdW5kJyk7XG5cbnZhciBQcmljZVZhdEluY2x1ZGVkID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA3O1xufTtcblxuUHJpY2VWYXRJbmNsdWRlZC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSkge1xuXG4gICAgZnVuY3Rpb24gYXBwbHlWYXROb2RlKG5vZGUpIHtcbiAgICAgICAgXy5lYWNoKG5vZGUudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5pbXBvcnQgPSByb3VuZChub2RlLmJhc2VJbXBvcnQgKiAoMSArIHRheC5QQy8xMDApLFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgICAgICAgICAgICAgbm9kZS5wcmljZSA9IG5vZGUuYmFzZVByaWNlICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgYXBwbHlWYXROb2RlKTtcbiAgICB9XG5cbiAgICBhcHBseVZhdE5vZGUodHJlZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlVmF0SW5jbHVkZWQ7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcm91bmQodmFsLCByb3VuZGluZ1R5cGUsIHJvdW5kaW5nKSB7XG4gICAgdmFyIHY7XG4gICAgaWYgKCghcm91bmRpbmdUeXBlKSB8fCAocm91bmRpbmdUeXBlID09PSBcIk5PTkVcIikpIHtcbiAgICAgICAgdiA9IE1hdGgucm91bmQodmFsIC8gMC4wMSkgKiAwLjAxO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJGTE9PUlwiKSkge1xuICAgICAgICB2PSBNYXRoLmZsb29yKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMikgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJST1VORFwiKSkge1xuICAgICAgICB2PSBNYXRoLnJvdW5kKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMykgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJDRUlMXCIpKSB7XG4gICAgICAgIHY9IE1hdGguY2VpbCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHJvdW5kaW5nVHlwZTogcm91bmRpbmdUeXBlXCIpO1xuICAgIH1cbiAgICByZXR1cm4gKyhNYXRoLnJvdW5kKHYgKyBcImUrOFwiKSAgKyBcImUtOFwiKTtcbn07XG4iXX0=
