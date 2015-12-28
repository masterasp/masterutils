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
},{"./availability_matrix.js":1,"./creditcard.js":2,"./date_utils.js":3,"./price2.js":5,"./round.js":12}],5:[function(require,module,exports){
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
    "CALCPRICE": require("./price_calcprice.js"),
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
};

Price2.prototype.constructTree = function() {

    var self = this;

    function sortTree(node) {
        if (node.childs) {
            node.childs = _.sortByAll(node.childs, ["order", "suborder"]);
            _.each(node.childs, sortTree);
        }
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

    self.treeValid = true;
    return self.total;
};

function calcTotals(node, filter) {
    if (!filter(node)) return 0;
    if (typeof node.childs !== "undefined") {
        node.import = 0;
        _.each(node.childs, function(c) {
            node.import += calcTotals(c, filter);
        });
    } else {
        node.import = node.import || 0;
    }
    node.import = round(node.import, "ROUND", 0.01);
    return node.import;
}

Price2.prototype.render = function(id, filter) {

    if (typeof id === "function") {
        filter =id;
        id=null;
    }

    var self = this;
    id = id || "total";
    var renderResult;
    if (!filter) filter = function() {return true;};



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
        if (!filter(node)) return 0;
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
            renderResult.push(newNode);
        }

        if (renderDetail) {
            _.each(node.childs, function(childNode) {
                renderNode(childNode, renderTotal ? level +1 : level);
            });
        }
        if ((renderTotal) && (node.totalOnBottom)) {
            renderResult.push(newNode);
        }
    }

    renderResult = [];

    self.constructTree();

    var node = findNode(self.total, id);

    calcTotals(node, filter);

    renderNode(node, 0);

    return renderResult;
};


Price2.prototype.renderTree = function(id, filter) {

    if (typeof id === "function") {
        filter =id;
        id=null;
    }

    var self = this;
    id = id || "total";
    var renderTreeResult;
    if (!filter) filter = function() {return true;};



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

        if (!filter(node)) return 0;

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
                renderTreeResult = newNode;
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

    self.constructTree();

    var node = findNode(self.total, id);

    calcTotals(node, filter);


    renderTreeResult = null;

    renderTreeNode(node, null);

    setLevel(renderTreeResult, 0);

    return renderTreeResult;
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
},{"./date_utils":3,"./price_agregator.js":6,"./price_calcprice.js":7,"./price_discount.js":8,"./price_insurance.js":9,"./price_line.js":10,"./price_vatincluded.js":11,"./round":12}],6:[function(require,module,exports){
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

CalcPrice Modifier
=================

    phase             Flag of the lines that should be replaced
    execOrder           Order in which this modifier i excevuted.
    rules              Array of rules



}

*/

var PriceCalcPrice = function(line) {
    this.execSuborder = line.phase;
    this.line = line;
    this.execOrder = line.execOrder || 5;

};

PriceCalcPrice.prototype.modify = function(tree, options) {

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

        var rFrom = rule.applyFrom ? du.date2int(rule.applyFrom): lFrom;
        var rTo = rule.applyTo ? du.date2int(rule.applyTo) + 1 : lTo;

        a = Math.max(rFrom, lFrom);
        b = Math.min(rTo, lTo);

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

    // Remove the prices with the same or greater phase.

    var samePhaseCalcPrices = [];
    var postponedCalcPrices = [];
    var appliedCalcPrices = [];

    var i,l;
    for (i=0; i<tree.childs.length; i+=1) {
        l=tree.childs[i];
        if (l.pricePerDay) {
            if (l.phase === self.line.phase) { // Remove and get the best
                samePhaseCalcPrices.push(l);
                tree.childs[i] = tree.childs[tree.childs.length-1];
                tree.childs.pop();
                i-=1;
            } else if (l.phase > self.line.phase) { // Remove and reprcess  later
                postponedCalcPrices.push(l);
                tree.childs[i] = tree.childs[tree.childs.length-1];
                tree.childs.pop();
                i-=1;
            } else {
                appliedCalcPrices.push(l);
            }
        }
    }

    var appliedRules = _.filter(self.line.rules, ruleDoesApply);

    // This hash contains the best price for each line and day
    // pricePerDay['3|18475']= 15 Means that the line tree[3] will have a price of 15
    // at day 18475
    var pricePerDay = {};
    _.each(appliedRules, function(rule) {
        _.each(tree.childs, function(l, lineIdx) { // TODO mirar tot l'arbre
            if (l.class !== "LINE") return;
            if (! _.contains(l.attributes, rule.applyIdConceptAttribute.toString())) return;
            _.each(daysInRule(l, rule), function(d) {
                var k= lineIdx+'|'+d;

                var prc = rule.applyPC *  l.quantity *  l.basePrice / 100;
                _.each(appliedCalcPrices, function(od) {
                    if (! _.contains(od.attributes, rule.applyIdConceptAttribute.toString())) return;
                    if (od.pricePerDay[k]) {
                        prc = prc +  od.pricePerDay[k] * rule.applyPC/100;
                    }
                });

                if (!pricePerDay[k]) {
                    pricePerDay[k]=prc;
                } else {
                    pricePerDay[k] = Math.min(pricePerDay[k], prc);
                }

            });
        });
    });

    var vat =0;
    var base =0;
    var totalImport =0;

    // totalImport and base are the total amounts of capcPrices that are applied
    // The VAT is a ponderated average of all the lines ther the calcPrice applies.

    _.each(tree.childs, function(l, lineIdx) {
        if (l.pricePerDay) return;
        var prc=0;
        _.each(daysInLine(l), function(d) {
            var k= lineIdx+'|'+d;
            if (pricePerDay[k]) {
                prc += pricePerDay[k];
            }
        });

        var lVat = 0;
        _.each(l.taxes, function(tax) {
            if (tax.type === "VAT") {
                lVat = tax.PC;
            }
        });

        if ((base + prc) !== 0) {
            vat = (vat*base + lVat*prc) / (base + prc);
        }
        base = base + prc;
        if (l.baseImport) {
            totalImport = totalImport + l.import * prc/l.baseImport;
        }
    });

    var bestLine = _.clone(self.line);

    bestLine.baseImport = base;
    bestLine.basePrice = base;
    bestLine.import = totalImport;
    bestLine.quantity = 1;
    bestLine.class = "LINE";
    bestLine.suborder = self.execSuborder;
    bestLine.pricePerDay = pricePerDay;

    bestLine.taxes = bestLine.taxes || [];

    var tax = _.findWhere(bestLine.taxes,{type: "VAT"});
    if (!tax) {
        tax = {
            type: "VAT"
        };
        bestLine.taxes.push(tax);
    }
    tax.PC = vat;

    // Find the best calcPrice concept in the same phase.

    samePhaseCalcPrices.push(bestLine);

    var bestLineInPhase = _.reduce(samePhaseCalcPrices, function(bestLine, line) {
        if (!line) return bestLine;
        return (line.import < bestLine.import) ? line : bestLine;
    });

    if (bestLineInPhase.import !== 0) {
        tree.childs.push(bestLineInPhase);
    }

    // Finaly we reaply the calcPrices of greater phases that wuere applied before.

    postponedCalcPrices = _.sortBy(postponedCalcPrices, 'phase');

    _.each(postponedCalcPrices, function(l) {
        var modifier = new PriceCalcPrice(l);
        modifier.apply(tree, options);
    });
};

module.exports = PriceCalcPrice;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils.js":3}],8:[function(require,module,exports){
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
},{"./date_utils.js":3}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{"./round":12}],12:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvYXZhaWxhYmlsaXR5X21hdHJpeC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL2NyZWRpdGNhcmQuanMiLCIvVXNlcnMvamJheWxpbmEvZ2l0L21hc3RlcnV0aWxzL3NyYy9kYXRlX3V0aWxzLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvZmFrZV9kZGQ0ODEzZC5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlMi5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2FncmVnYXRvci5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2NhbGNwcmljZS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX2Rpc2NvdW50LmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfaW5zdXJhbmNlLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcHJpY2VfbGluZS5qcyIsIi9Vc2Vycy9qYmF5bGluYS9naXQvbWFzdGVydXRpbHMvc3JjL3ByaWNlX3ZhdGluY2x1ZGVkLmpzIiwiL1VzZXJzL2piYXlsaW5hL2dpdC9tYXN0ZXJ1dGlscy9zcmMvcm91bmQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgZHUgPSByZXF1aXJlKCcuL2RhdGVfdXRpbHMnKTtcblxuZXhwb3J0cy50cmltID0gZnVuY3Rpb24obSkge1xuXG4gICAgbS5maXJzdEJvb2thYmxlRGF0ZSA9IGR1LmRhdGUyaW50KG0uZmlyc3RCb29rYWJsZURhdGUpO1xuICAgIHdoaWxlICgobS5tYXRyaXgubGVuZ3RoPjEpICYmIChtLm1hdHJpeFswXSA9PT0gMCkpIHtcbiAgICAgICAgbS5tYXRyaXguc2hpZnQoKTtcbiAgICAgICAgbS5maXJzdEJvb2thYmxlRGF0ZSArPSAxO1xuICAgIH1cblxuICAgIHdoaWxlICgobS5tYXRyaXgubGVuZ3RoPjEpICYmIChtLm1hdHJpeFttLm1hdHJpeC5sZW5ndGgtMV0gPT09IDApKSB7XG4gICAgICAgIG0ubWF0cml4LnBvcCgpO1xuICAgIH1cbiAgICBtLmZpcnN0Qm9va2FibGVEYXRlID0gZHUuaW50MmRhdGUobS5maXJzdEJvb2thYmxlRGF0ZSk7XG5cbn07XG5cblxuZXhwb3J0cy5BTkQgPSBmdW5jdGlvbihtMSwgbTIpIHtcbiAgICBpZiAoIW0xKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAoIW0yKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgaTtcbiAgICB2YXIgaUZpcnN0Qm9va2FibGVEYXRlMSA9IGR1LmRhdGUyaW50KG0xLmZpcnN0Qm9va2FibGVEYXRlKTtcbiAgICB2YXIgaUZpcnN0Qm9va2FibGVEYXRlMiA9IGR1LmRhdGUyaW50KG0yLmZpcnN0Qm9va2FibGVEYXRlKTtcbiAgICB2YXIgb3V0ID0ge1xuICAgICAgICBmaXJzdEJvb2thYmxlRGF0ZTogTWF0aC5tYXgoaUZpcnN0Qm9va2FibGVEYXRlMSwgaUZpcnN0Qm9va2FibGVEYXRlMiksXG4gICAgICAgIG1hdHJpeDogWzBdXG4gICAgfTtcbiAgICB2YXIgTCA9IE1hdGgubWluKGlGaXJzdEJvb2thYmxlRGF0ZTEgKyBtMS5tYXRyaXgubGVuZ3RoIC0gb3V0LmZpcnN0Qm9va2FibGVEYXRlLFxuICAgICAgICAgICAgICAgICAgICAgaUZpcnN0Qm9va2FibGVEYXRlMiArIG0yLm1hdHJpeC5sZW5ndGggLSBvdXQuZmlyc3RCb29rYWJsZURhdGUpO1xuICAgIGZvciAoaT0wOyBpPCBMOyBpKz0xKSB7XG4gICAgICAgIHZhciB2ID0gMHhGRkZGRkZGOyAvLyAyOCBEQVlTXG5cbiAgICAgICAgdmFyIGkxICA9ICBpICsgb3V0LmZpcnN0Qm9va2FibGVEYXRlIC1pRmlyc3RCb29rYWJsZURhdGUxO1xuICAgICAgICBpZiAoaTE+PTAgJiYgaTE8bTEubWF0cml4Lmxlbmd0aCkge1xuICAgICAgICAgICAgdiA9IHYgJiBtMS5tYXRyaXhbaTFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdiA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaTIgID0gIGkgKyBvdXQuZmlyc3RCb29rYWJsZURhdGUgLWlGaXJzdEJvb2thYmxlRGF0ZTI7XG4gICAgICAgIGlmIChpMj49MCAmJiBpMjxtMi5tYXRyaXgubGVuZ3RoKSB7XG4gICAgICAgICAgICB2ID0gdiAmIG0yLm1hdHJpeFtpMl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIG91dC5tYXRyaXhbaV0gPSB2O1xuICAgIH1cblxuICAgIGV4cG9ydHMudHJpbShvdXQpO1xuICAgIG91dC5maXJzdEJvb2thYmxlRGF0ZSA9IGR1LmludDJkYXRlKG91dC5maXJzdEJvb2thYmxlRGF0ZSk7XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuZXhwb3J0cy5PUiA9IGZ1bmN0aW9uKG0xLCBtMikge1xuICAgIGlmICgoIW0xKSYmKCFtMikpIHJldHVybiBudWxsO1xuICAgIGlmICghbTEpIHtcbiAgICAgICAgcmV0dXJuIF8uY2xvbmUobTIpO1xuICAgIH1cbiAgICBpZiAoIW0yKSB7XG4gICAgICAgIHJldHVybiBfLmNsb25lKG0xKTtcbiAgICB9XG4gICAgdmFyIGk7XG4gICAgdmFyIGlGaXJzdEJvb2thYmxlRGF0ZTEgPSBkdS5kYXRlMmludChtMS5maXJzdEJvb2thYmxlRGF0ZSk7XG4gICAgdmFyIGlGaXJzdEJvb2thYmxlRGF0ZTIgPSBkdS5kYXRlMmludChtMi5maXJzdEJvb2thYmxlRGF0ZSk7XG4gICAgdmFyIG91dCA9IHtcbiAgICAgICAgZmlyc3RCb29rYWJsZURhdGU6IE1hdGgubWluKGlGaXJzdEJvb2thYmxlRGF0ZTEsIGlGaXJzdEJvb2thYmxlRGF0ZTIpLFxuICAgICAgICBtYXRyaXg6IFswXVxuICAgIH07XG4gICAgdmFyIEwgPSBNYXRoLm1heChpRmlyc3RCb29rYWJsZURhdGUxICsgbTEubWF0cml4Lmxlbmd0aCAtIG91dC5maXJzdEJvb2thYmxlRGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgIGlGaXJzdEJvb2thYmxlRGF0ZTIgKyBtMi5tYXRyaXgubGVuZ3RoIC0gb3V0LmZpcnN0Qm9va2FibGVEYXRlKTtcbiAgICBmb3IgKGk9MDsgaTwgTDsgaSs9MSkge1xuICAgICAgICB2YXIgdiA9IDA7IC8vIDI4IERBWVNcblxuICAgICAgICB2YXIgaTEgID0gIGkgKyBvdXQuZmlyc3RCb29rYWJsZURhdGUgLWlGaXJzdEJvb2thYmxlRGF0ZTE7XG4gICAgICAgIGlmIChpMT49MCAmJiBpMTxtMS5tYXRyaXgubGVuZ3RoKSB7XG4gICAgICAgICAgICB2ID0gdiB8IG0xLm1hdHJpeFtpMV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaTIgID0gIGkgKyBvdXQuZmlyc3RCb29rYWJsZURhdGUgLWlGaXJzdEJvb2thYmxlRGF0ZTI7XG4gICAgICAgIGlmIChpMj49MCAmJiBpMjxtMi5tYXRyaXgubGVuZ3RoKSB7XG4gICAgICAgICAgICB2ID0gdiB8IG0yLm1hdHJpeFtpMl07XG4gICAgICAgIH1cblxuICAgICAgICBvdXQubWF0cml4W2ldID0gdjtcbiAgICB9XG5cbiAgICBleHBvcnRzLnRyaW0ob3V0KTtcbiAgICBvdXQuZmlyc3RCb29rYWJsZURhdGUgPSBkdS5pbnQyZGF0ZShvdXQuZmlyc3RCb29rYWJsZURhdGUpO1xuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydHMuWkVSTyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGZpcnN0Qm9va2FibGVEYXRlOiBkdS5pbnQyZGF0ZShkdS50b2RheSgpKSxcbiAgICAgICAgbWF0cml4OiBbMF1cbiAgICB9O1xufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXHJcblxyXG4vKlxyXG5cclxuVGhpcyByb3V0aW5lIGNoZWNrcyB0aGUgY3JlZGl0IGNhcmQgbnVtYmVyLiBUaGUgZm9sbG93aW5nIGNoZWNrcyBhcmUgbWFkZTpcclxuXHJcbjEuIEEgbnVtYmVyIGhhcyBiZWVuIHByb3ZpZGVkXHJcbjIuIFRoZSBudW1iZXIgaXMgYSByaWdodCBsZW5ndGggZm9yIHRoZSBjYXJkXHJcbjMuIFRoZSBudW1iZXIgaGFzIGFuIGFwcHJvcHJpYXRlIHByZWZpeCBmb3IgdGhlIGNhcmRcclxuNC4gVGhlIG51bWJlciBoYXMgYSB2YWxpZCBtb2R1bHVzIDEwIG51bWJlciBjaGVjayBkaWdpdCBpZiByZXF1aXJlZFxyXG5cclxuSWYgdGhlIHZhbGlkYXRpb24gZmFpbHMgYW4gZXJyb3IgaXMgcmVwb3J0ZWQuXHJcblxyXG5UaGUgc3RydWN0dXJlIG9mIGNyZWRpdCBjYXJkIGZvcm1hdHMgd2FzIGdsZWFuZWQgZnJvbSBhIHZhcmlldHkgb2Ygc291cmNlcyBvbiB0aGUgd2ViLCBhbHRob3VnaCB0aGUgXHJcbmJlc3QgaXMgcHJvYmFibHkgb24gV2lrZXBlZGlhIChcIkNyZWRpdCBjYXJkIG51bWJlclwiKTpcclxuXHJcbiAgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9DcmVkaXRfY2FyZF9udW1iZXJcclxuXHJcblBhcmFtZXRlcnM6XHJcbiAgICAgICAgICAgIGNhcmRudW1iZXIgICAgICAgICAgIG51bWJlciBvbiB0aGUgY2FyZFxyXG4gICAgICAgICAgICBjYXJkbmFtZSAgICAgICAgICAgICBuYW1lIG9mIGNhcmQgYXMgZGVmaW5lZCBpbiB0aGUgY2FyZCBsaXN0IGJlbG93XHJcblxyXG5BdXRob3I6ICAgICBKb2huIEdhcmRuZXJcclxuRGF0ZTogICAgICAgMXN0IE5vdmVtYmVyIDIwMDNcclxuVXBkYXRlZDogICAgMjZ0aCBGZWIuIDIwMDUgICAgICBBZGRpdGlvbmFsIGNhcmRzIGFkZGVkIGJ5IHJlcXVlc3RcclxuVXBkYXRlZDogICAgMjd0aCBOb3YuIDIwMDYgICAgICBBZGRpdGlvbmFsIGNhcmRzIGFkZGVkIGZyb20gV2lraXBlZGlhXHJcblVwZGF0ZWQ6ICAgIDE4dGggSmFuLiAyMDA4ICAgICAgQWRkaXRpb25hbCBjYXJkcyBhZGRlZCBmcm9tIFdpa2lwZWRpYVxyXG5VcGRhdGVkOiAgICAyNnRoIE5vdi4gMjAwOCAgICAgIE1hZXN0cm8gY2FyZHMgZXh0ZW5kZWRcclxuVXBkYXRlZDogICAgMTl0aCBKdW4uIDIwMDkgICAgICBMYXNlciBjYXJkcyBleHRlbmRlZCBmcm9tIFdpa2lwZWRpYVxyXG5VcGRhdGVkOiAgICAxMXRoIFNlcC4gMjAxMCAgICAgIFR5cG9zIHJlbW92ZWQgZnJvbSBEaW5lcnMgYW5kIFNvbG8gZGVmaW5pdGlvbnMgKHRoYW5rcyB0byBOb2UgTGVvbilcclxuVXBkYXRlZDogICAgMTB0aCBBcHJpbCAyMDEyICAgICBOZXcgbWF0Y2hlcyBmb3IgTWFlc3RybywgRGluZXJzIEVucm91dGUgYW5kIFN3aXRjaFxyXG5VcGRhdGVkOiAgICAxN3RoIE9jdG9iZXIgMjAxMiAgIERpbmVycyBDbHViIHByZWZpeCAzOCBub3QgZW5jb2RlZFxyXG5cclxuKi9cclxuXHJcbi8qXHJcbiAgIElmIGEgY3JlZGl0IGNhcmQgbnVtYmVyIGlzIGludmFsaWQsIGFuIGVycm9yIHJlYXNvbiBpcyBsb2FkZWQgaW50byB0aGUgZ2xvYmFsIGNjRXJyb3JObyB2YXJpYWJsZS5cclxuICAgVGhpcyBjYW4gYmUgYmUgdXNlZCB0byBpbmRleCBpbnRvIHRoZSBnbG9iYWwgZXJyb3IgIHN0cmluZyBhcnJheSB0byByZXBvcnQgdGhlIHJlYXNvbiB0byB0aGUgdXNlclxyXG4gICBpZiByZXF1aXJlZDpcclxuXHJcbiAgIGUuZy4gaWYgKCFjaGVja0NyZWRpdENhcmQgKG51bWJlciwgbmFtZSkgYWxlcnQgKGNjRXJyb3JzKGNjRXJyb3JObyk7XHJcbiovXHJcblxyXG52YXIgY2NFcnJvck5vID0gMDtcclxudmFyIGNjRXJyb3JzID0gW107XHJcblxyXG5jY0Vycm9ycyBbMF0gPSBcIlVua25vd24gY2FyZCB0eXBlXCI7XHJcbmNjRXJyb3JzIFsxXSA9IFwiTm8gY2FyZCBudW1iZXIgcHJvdmlkZWRcIjtcclxuY2NFcnJvcnMgWzJdID0gXCJDcmVkaXQgY2FyZCBudW1iZXIgaXMgaW4gaW52YWxpZCBmb3JtYXRcIjtcclxuY2NFcnJvcnMgWzNdID0gXCJDcmVkaXQgY2FyZCBudW1iZXIgaXMgaW52YWxpZFwiO1xyXG5jY0Vycm9ycyBbNF0gPSBcIkNyZWRpdCBjYXJkIG51bWJlciBoYXMgYW4gaW5hcHByb3ByaWF0ZSBudW1iZXIgb2YgZGlnaXRzXCI7XHJcbmNjRXJyb3JzIFs1XSA9IFwiV2FybmluZyEgVGhpcyBjcmVkaXQgY2FyZCBudW1iZXIgaXMgYXNzb2NpYXRlZCB3aXRoIGEgc2NhbSBhdHRlbXB0XCI7XHJcblxyXG5mdW5jdGlvbiBjaGVja0NyZWRpdENhcmQgKGNhcmRudW1iZXIpIHtcclxuXHJcbiAgLy8gQXJyYXkgdG8gaG9sZCB0aGUgcGVybWl0dGVkIGNhcmQgY2hhcmFjdGVyaXN0aWNzXHJcbiAgdmFyIGNhcmRzID0gW107XHJcblxyXG4gIC8vIERlZmluZSB0aGUgY2FyZHMgd2Ugc3VwcG9ydC4gWW91IG1heSBhZGQgYWRkdGlvbmFsIGNhcmQgdHlwZXMgYXMgZm9sbG93cy5cclxuICAvLyAgTmFtZTogICAgICAgICBBcyBpbiB0aGUgc2VsZWN0aW9uIGJveCBvZiB0aGUgZm9ybSAtIG11c3QgYmUgc2FtZSBhcyB1c2VyJ3NcclxuICAvLyAgTGVuZ3RoOiAgICAgICBMaXN0IG9mIHBvc3NpYmxlIHZhbGlkIGxlbmd0aHMgb2YgdGhlIGNhcmQgbnVtYmVyIGZvciB0aGUgY2FyZFxyXG4gIC8vICBwcmVmaXhlczogICAgIExpc3Qgb2YgcG9zc2libGUgcHJlZml4ZXMgZm9yIHRoZSBjYXJkXHJcbiAgLy8gIGNoZWNrZGlnaXQ6ICAgQm9vbGVhbiB0byBzYXkgd2hldGhlciB0aGVyZSBpcyBhIGNoZWNrIGRpZ2l0XHJcblxyXG4gIGNhcmRzIFswXSA9IHtuYW1lOiBcIlZpc2FcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjEzLDE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjRcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzFdID0ge25hbWU6IFwiTWFzdGVyQ2FyZFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiNTEsNTIsNTMsNTQsNTVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzJdID0ge25hbWU6IFwiRGluZXJzQ2x1YlwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTQsMTZcIiwgXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjM2LDM4LDU0LDU1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFszXSA9IHtuYW1lOiBcIkNhcnRlQmxhbmNoZVwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTRcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzAwLDMwMSwzMDIsMzAzLDMwNCwzMDVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzRdID0ge25hbWU6IFwiQW1FeFwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTVcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzQsMzdcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzVdID0ge25hbWU6IFwiRGlzY292ZXJcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjYwMTEsNjIyLDY0LDY1XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs2XSA9IHtuYW1lOiBcIkpDQlwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTZcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMzVcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzddID0ge25hbWU6IFwiZW5Sb3V0ZVwiLFxyXG4gICAgICAgICAgICAgICBsZW5ndGg6IFwiMTVcIixcclxuICAgICAgICAgICAgICAgcHJlZml4ZXM6IFwiMjAxNCwyMTQ5XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFs4XSA9IHtuYW1lOiBcIlNvbG9cIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjYzMzQsNjc2N1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbOV0gPSB7bmFtZTogXCJTd2l0Y2hcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjQ5MDMsNDkwNSw0OTExLDQ5MzYsNTY0MTgyLDYzMzExMCw2MzMzLDY3NTlcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzEwXSA9IHtuYW1lOiBcIk1hZXN0cm9cIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjEyLDEzLDE0LDE1LDE2LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjUwMTgsNTAyMCw1MDM4LDYzMDQsNjc1OSw2NzYxLDY3NjIsNjc2M1wiLFxyXG4gICAgICAgICAgICAgICBjaGVja2RpZ2l0OiB0cnVlfTtcclxuICBjYXJkcyBbMTFdID0ge25hbWU6IFwiVmlzYUVsZWN0cm9uXCIsXHJcbiAgICAgICAgICAgICAgIGxlbmd0aDogXCIxNlwiLFxyXG4gICAgICAgICAgICAgICBwcmVmaXhlczogXCI0MDI2LDQxNzUwMCw0NTA4LDQ4NDQsNDkxMyw0OTE3XCIsXHJcbiAgICAgICAgICAgICAgIGNoZWNrZGlnaXQ6IHRydWV9O1xyXG4gIGNhcmRzIFsxMl0gPSB7bmFtZTogXCJMYXNlckNhcmRcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2LDE3LDE4LDE5XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjYzMDQsNjcwNiw2NzcxLDY3MDlcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogdHJ1ZX07XHJcbiAgY2FyZHMgWzEzXSA9IHtuYW1lOiBcIlRlc3RcIixcclxuICAgICAgICAgICAgICAgbGVuZ3RoOiBcIjE2XCIsXHJcbiAgICAgICAgICAgICAgIHByZWZpeGVzOiBcIjE5MTJcIixcclxuICAgICAgICAgICAgICAgY2hlY2tkaWdpdDogZmFsc2V9O1xyXG4gIHZhciByZXMgPSB7XHJcbiAgICB2YWxpZDogZmFsc2VcclxuICB9O1xyXG5cclxuXHJcbiAgLy8gRW5zdXJlIHRoYXQgdGhlIHVzZXIgaGFzIHByb3ZpZGVkIGEgY3JlZGl0IGNhcmQgbnVtYmVyXHJcbiAgaWYgKGNhcmRudW1iZXIubGVuZ3RoID09PSAwKSAge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSAxO1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICAvLyBOb3cgcmVtb3ZlIGFueSBzcGFjZXMgZnJvbSB0aGUgY3JlZGl0IGNhcmQgbnVtYmVyXHJcbiAgY2FyZG51bWJlciA9IGNhcmRudW1iZXIucmVwbGFjZSAoL1xccy9nLCBcIlwiKTtcclxuXHJcbiAgLy8gQ2hlY2sgdGhhdCB0aGUgbnVtYmVyIGlzIG51bWVyaWNcclxuICB2YXIgY2FyZE5vID0gY2FyZG51bWJlcjtcclxuICB2YXIgY2FyZGV4cCA9IC9eWzAtOV17MTMsMTl9JC87XHJcbiAgaWYgKCFjYXJkZXhwLmV4ZWMoY2FyZE5vKSkgIHtcclxuICAgICByZXMuY2NFcnJvck5vID0gMjtcclxuICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuXHJcbiAgLy8gRXN0YWJsaXNoIGNhcmQgdHlwZVxyXG4gIHZhciBjYXJkVHlwZSA9IC0xO1xyXG4gIGZvciAodmFyIGk9MDsgaTxjYXJkcy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgIC8vIExvYWQgYW4gYXJyYXkgd2l0aCB0aGUgdmFsaWQgcHJlZml4ZXMgZm9yIHRoaXMgY2FyZFxyXG4gICAgcHJlZml4ID0gY2FyZHNbaV0ucHJlZml4ZXMuc3BsaXQoXCIsXCIpO1xyXG5cclxuICAgIC8vIE5vdyBzZWUgaWYgYW55IG9mIHRoZW0gbWF0Y2ggd2hhdCB3ZSBoYXZlIGluIHRoZSBjYXJkIG51bWJlclxyXG4gICAgZm9yIChqPTA7IGo8cHJlZml4Lmxlbmd0aDsgaisrKSB7XHJcbiAgICAgIHZhciBleHAgPSBuZXcgUmVnRXhwIChcIl5cIiArIHByZWZpeFtqXSk7XHJcbiAgICAgIGlmIChleHAudGVzdCAoY2FyZE5vKSkgY2FyZFR5cGUgPSBpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gSWYgY2FyZCB0eXBlIG5vdCBmb3VuZCwgcmVwb3J0IGFuIGVycm9yXHJcbiAgaWYgKGNhcmRUeXBlID09IC0xKSB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDI7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmVzLmNjTmFtZSA9IGNhcmRzW2NhcmRUeXBlXS5uYW1lO1xyXG5cclxuXHJcblxyXG4gIHZhciBqO1xyXG4gIC8vIE5vdyBjaGVjayB0aGUgbW9kdWx1cyAxMCBjaGVjayBkaWdpdCAtIGlmIHJlcXVpcmVkXHJcbiAgaWYgKGNhcmRzW2NhcmRUeXBlXS5jaGVja2RpZ2l0KSB7XHJcbiAgICB2YXIgY2hlY2tzdW0gPSAwOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBydW5uaW5nIGNoZWNrc3VtIHRvdGFsXHJcbiAgICB2YXIgbXljaGFyID0gXCJcIjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5leHQgY2hhciB0byBwcm9jZXNzXHJcbiAgICBqID0gMTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRha2VzIHZhbHVlIG9mIDEgb3IgMlxyXG5cclxuICAgIC8vIFByb2Nlc3MgZWFjaCBkaWdpdCBvbmUgYnkgb25lIHN0YXJ0aW5nIGF0IHRoZSByaWdodFxyXG4gICAgdmFyIGNhbGM7XHJcbiAgICBmb3IgKGkgPSBjYXJkTm8ubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHJcbiAgICAgIC8vIEV4dHJhY3QgdGhlIG5leHQgZGlnaXQgYW5kIG11bHRpcGx5IGJ5IDEgb3IgMiBvbiBhbHRlcm5hdGl2ZSBkaWdpdHMuXHJcbiAgICAgIGNhbGMgPSBOdW1iZXIoY2FyZE5vLmNoYXJBdChpKSkgKiBqO1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3VsdCBpcyBpbiB0d28gZGlnaXRzIGFkZCAxIHRvIHRoZSBjaGVja3N1bSB0b3RhbFxyXG4gICAgICBpZiAoY2FsYyA+IDkpIHtcclxuICAgICAgICBjaGVja3N1bSA9IGNoZWNrc3VtICsgMTtcclxuICAgICAgICBjYWxjID0gY2FsYyAtIDEwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBZGQgdGhlIHVuaXRzIGVsZW1lbnQgdG8gdGhlIGNoZWNrc3VtIHRvdGFsXHJcbiAgICAgIGNoZWNrc3VtID0gY2hlY2tzdW0gKyBjYWxjO1xyXG5cclxuICAgICAgLy8gU3dpdGNoIHRoZSB2YWx1ZSBvZiBqXHJcbiAgICAgIGlmIChqID09MSkge1xyXG4gICAgICAgIGogPSAyO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGogPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWxsIGRvbmUgLSBpZiBjaGVja3N1bSBpcyBkaXZpc2libGUgYnkgMTAsIGl0IGlzIGEgdmFsaWQgbW9kdWx1cyAxMC5cclxuICAgIC8vIElmIG5vdCwgcmVwb3J0IGFuIGVycm9yLlxyXG4gICAgaWYgKGNoZWNrc3VtICUgMTAgIT09IDApICB7XHJcbiAgICAgIHJlcy5jY0Vycm9yTm8gPSAzO1xyXG4gICAgICByZXMuY2NFcnJvclN0ciA9IGNjRXJyb3JzIFtyZXMuY2NFcnJvck5vXTtcclxuICAgICAgcmV0dXJuIHJlcztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIENoZWNrIGl0J3Mgbm90IGEgc3BhbSBudW1iZXJcclxuICBpZiAoY2FyZE5vID09ICc1NDkwOTk3NzcxMDkyMDY0Jykge1xyXG4gICAgIHJlcy5jY0Vycm9yTm8gPSA1O1xyXG4gICAgIHJlcy5jY0Vycm9yU3RyID0gY2NFcnJvcnMgW3Jlcy5jY0Vycm9yTm9dO1xyXG4gICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG5cclxuICAvLyBUaGUgZm9sbG93aW5nIGFyZSB0aGUgY2FyZC1zcGVjaWZpYyBjaGVja3Mgd2UgdW5kZXJ0YWtlLlxyXG4gIHZhciBMZW5ndGhWYWxpZCA9IGZhbHNlO1xyXG4gIHZhciBQcmVmaXhWYWxpZCA9IGZhbHNlO1xyXG5cclxuICAvLyBXZSB1c2UgdGhlc2UgZm9yIGhvbGRpbmcgdGhlIHZhbGlkIGxlbmd0aHMgYW5kIHByZWZpeGVzIG9mIGEgY2FyZCB0eXBlXHJcbiAgdmFyIHByZWZpeCA9IFtdO1xyXG4gIHZhciBsZW5ndGhzID0gW107XHJcblxyXG4gIC8vIFNlZSBpZiB0aGUgbGVuZ3RoIGlzIHZhbGlkIGZvciB0aGlzIGNhcmRcclxuICBsZW5ndGhzID0gY2FyZHNbY2FyZFR5cGVdLmxlbmd0aC5zcGxpdChcIixcIik7XHJcbiAgZm9yIChqPTA7IGo8bGVuZ3Rocy5sZW5ndGg7IGorKykge1xyXG4gICAgaWYgKGNhcmROby5sZW5ndGggPT0gbGVuZ3Roc1tqXSkgTGVuZ3RoVmFsaWQgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gU2VlIGlmIGFsbCBpcyBPSyBieSBzZWVpbmcgaWYgdGhlIGxlbmd0aCB3YXMgdmFsaWQuIFdlIG9ubHkgY2hlY2sgdGhlIGxlbmd0aCBpZiBhbGwgZWxzZSB3YXMgXHJcbiAgLy8gaHVua3kgZG9yeS5cclxuICBpZiAoIUxlbmd0aFZhbGlkKSB7XHJcbiAgICAgcmVzLmNjRXJyb3JObyA9IDQ7XHJcbiAgICAgcmVzLmNjRXJyb3JTdHIgPSBjY0Vycm9ycyBbcmVzLmNjRXJyb3JOb107XHJcbiAgICAgcmV0dXJuIHJlcztcclxuICB9XHJcblxyXG4gIHJlcy52YWxpZCA9IHRydWU7XHJcblxyXG4gIC8vIFRoZSBjcmVkaXQgY2FyZCBpcyBpbiB0aGUgcmVxdWlyZWQgZm9ybWF0LlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbi8qPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cclxuXHJcbm1vZHVsZS5leHBvcnRzLmNoZWNrQ3JlZGl0Q2FyZCA9IGNoZWNrQ3JlZGl0Q2FyZDtcclxuXHJcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG5cbnZhciBtb21lbnQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snbW9tZW50J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydtb21lbnQnXSA6IG51bGwpO1xuXG52YXIgdmlydHVhbFRpbWUgPSBudWxsO1xuZXhwb3J0cy5ub3cgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodmlydHVhbFRpbWUpIHtcbiAgICAgICAgcmV0dXJuIHZpcnR1YWxUaW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgpO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuc2V0VmlydHVhbFRpbWUgPSBmdW5jdGlvbih0KSB7XG4gICAgdmlydHVhbFRpbWUgPSB0O1xufTtcblxuZXhwb3J0cy5kYXRlMnN0ciA9IGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHJldHVybiBkLnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDAsMTApO1xufTtcblxuZXhwb3J0cy5kYXRlMmludCA9IGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGQgPSBuZXcgRGF0ZShkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihkLmdldFRpbWUoKSAvIDg2NDAwMDAwKTtcbn07XG5cblxuZXhwb3J0cy5pbnREYXRlMnN0ciA9IGZ1bmN0aW9uKGQpIHtcbiAgICB2YXIgZHQ7XG4gICAgaWYgKGQgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgIGR0ID0gZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBkdCA9IG5ldyBEYXRlKGQqODY0MDAwMDApO1xuICAgIH1cbiAgICByZXR1cm4gZHQudG9JU09TdHJpbmcoKS5zdWJzdHJpbmcoMCwxMCk7XG59O1xuXG5leHBvcnRzLmludDJkYXRlID0gZnVuY3Rpb24oZCkge1xuICAgIGlmIChkIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIGQ7XG4gICAgdmFyIGR0ID0gbmV3IERhdGUoZCo4NjQwMDAwMCk7XG4gICAgcmV0dXJuIGR0O1xufTtcblxuZXhwb3J0cy50b2RheSA9IGZ1bmN0aW9uKHR6KSB7XG4gICAgdHogPSB0eiB8fCAnVVRDJztcblxuICAgIHZhciBkdCA9IG1vbWVudChleHBvcnRzLm5vdygpKS50eih0eik7XG4gICAgdmFyIGRhdGVTdHIgPSBkdC5mb3JtYXQoJ1lZWVktTU0tREQnKTtcbiAgICB2YXIgZHQyID0gbmV3IERhdGUoZGF0ZVN0cisnVDAwOjAwOjAwLjAwMFonKTtcblxuICAgIHJldHVybiBkdDIuZ2V0VGltZSgpIC8gODY0MDAwMDA7XG59O1xuXG5cblxuXG5cbi8vLyBDUk9OIElNUExFTUVOVEFUSU9OXG5cbmZ1bmN0aW9uIG1hdGNoTnVtYmVyKG4sIGZpbHRlcikge1xuICAgIG4gPSBwYXJzZUludChuKTtcbiAgICBpZiAodHlwZW9mIGZpbHRlciA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHRydWU7XG4gICAgaWYgKGZpbHRlciA9PT0gJyonKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoZmlsdGVyID09PSBuKSByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgZiA9IGZpbHRlci50b1N0cmluZygpO1xuICAgIHZhciBvcHRpb25zID0gZi5zcGxpdCgnLCcpO1xuICAgIGZvciAodmFyIGk9MDsgaTxvcHRpb25zOyBpKz0xKSB7XG4gICAgICAgIHZhciBhcnIgPSBvcHRpb25zW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGlmIChhcnIubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBpZiAocGFyc2VJbnQoYXJyWzBdLDEwKSA9PT0gbikgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJyLmxlbmd0aCA9PT0yKSB7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IHBhcnNlSW50KGFyclswXSwxMCk7XG4gICAgICAgICAgICB2YXIgdG8gPSBwYXJzZUludChhcnJbMV0sMTApO1xuICAgICAgICAgICAgaWYgKChuPj1mcm9tICkgJiYgKG48PSB0bykpIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBtYXRjaEpvYihqb2IsIGNyb25EYXRlKSB7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoMCwyKSwgam9iLm1pbnV0ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cigyLDIpLCBqb2IuaG91cikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig0LDIpLCBqb2IuZGF5T2ZNb250aCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoTnVtYmVyKGNyb25EYXRlLnN1YnN0cig2LDIpLCBqb2IubW9udGgpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFtYXRjaE51bWJlcihjcm9uRGF0ZS5zdWJzdHIoOCwxKSwgam9iLmRheU9mV2VlaykpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxudmFyIGNyb25Kb2JzID0gW107XG5leHBvcnRzLmFkZENyb25Kb2IgPSBmdW5jdGlvbihqb2IpIHtcblxuXG4gICAgam9iLnR6ID0gam9iLnR6IHx8ICdVVEMnO1xuXG4gICAgdmFyIGR0ID0gbW9tZW50KGV4cG9ydHMubm93KCkpLnR6KGpvYi50eik7XG4gICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcbiAgICBqb2IubGFzdCA9IGNyb25EYXRlO1xuICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICBjcm9uSm9icy5wdXNoKGpvYik7XG4gICAgcmV0dXJuIGNyb25Kb2JzLmxlbmd0aCAtMTtcbn07XG5cbmV4cG9ydHMuZGVsZXRlQ3JvbkpvYiA9IGZ1bmN0aW9uKGlkSm9iKSB7XG4gICAgZGVsZXRlIGNyb25Kb2JzW2lkSm9iXTtcbn07XG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9uZSBhIG1pbnV0ZSBpbiB0aGUgYmVnaW5pbmcgb2YgZWFjaCBtaW51dGUuXG4vLyBpdCBpcyB1c2VkIHRvIGNyb24gYW55IGZ1bmN0aW9uXG52YXIgb25NaW51dGUgPSBmdW5jdGlvbigpIHtcblxuXG4gICAgY3JvbkpvYnMuZm9yRWFjaChmdW5jdGlvbihqb2IpIHtcbiAgICAgICAgaWYgKCFqb2IpIHJldHVybjtcblxuICAgICAgICB2YXIgZHQgPSBtb21lbnQoZXhwb3J0cy5ub3coKSkudHooam9iLnR6KTtcbiAgICAgICAgdmFyIGNyb25EYXRlID0gZHQuZm9ybWF0KCdtbUhIRERNTWQnKTtcblxuICAgICAgICBpZiAoKGNyb25EYXRlICE9PSBqb2IubGFzdCkgJiYgKG1hdGNoSm9iKGpvYiwgY3JvbkRhdGUpKSkge1xuICAgICAgICAgICAgaWYgKGpvYi5leGVjdXRpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkpvYiB0YWtlcyB0b28gbG9uZyB0byBleGVjdXRlOiBcIiArIGpvYi5uYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgam9iLmxhc3QgPSBjcm9uRGF0ZTtcbiAgICAgICAgICAgICAgICBqb2IuZXhlY3V0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBqb2IuY2IoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGpvYi5leGVjdXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG5vdyA9IGV4cG9ydHMubm93KCkuZ2V0VGltZSgpO1xuICAgIHZhciBtaWxsc1RvTmV4dE1pbnV0ZSA9IDYwMDAwIC0gbm93ICUgNjAwMDA7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgb25NaW51dGUoKTtcbiAgICB9LCBtaWxsc1RvTmV4dE1pbnV0ZSk7XG59O1xuXG5vbk1pbnV0ZSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblxuKGZ1bmN0aW9uKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIG1hc3RlclV0aWxzID0ge1xuICAgICAgICBkYXRlVXRpbHM6IHJlcXVpcmUoJy4vZGF0ZV91dGlscy5qcycpLFxuICAgICAgICByb3VuZDogcmVxdWlyZSgnLi9yb3VuZC5qcycpLFxuICAgICAgICBQcmljZTogIG51bGwsXG4gICAgICAgIFByaWNlMjogcmVxdWlyZSgnLi9wcmljZTIuanMnKSxcbiAgICAgICAgY2hlY2tzOiB7XG4gICAgICAgICAgICBjaGVja0NyZWRpdENhcmQ6IHJlcXVpcmUoJy4vY3JlZGl0Y2FyZC5qcycpLmNoZWNrQ3JlZGl0Q2FyZFxuICAgICAgICB9LFxuICAgICAgICBhdmFpbGFiaWxpdHlNYXRyaXg6IHJlcXVpcmUoJy4vYXZhaWxhYmlsaXR5X21hdHJpeC5qcycpXG4gICAgfTtcblxuICAgIHZhciByb290ID0gdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnICYmIHNlbGYuc2VsZiA9PT0gc2VsZiAmJiBzZWxmIHx8XG4gICAgICAgICAgICB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwuZ2xvYmFsID09PSBnbG9iYWwgJiYgZ2xvYmFsIHx8XG4gICAgICAgICAgICB0aGlzO1xuXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBtYXN0ZXJVdGlscztcbiAgICAgICAgfVxuICAgICAgICBleHBvcnRzLm1hc3RlclV0aWxzID0gbWFzdGVyVXRpbHM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcm9vdC5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHdpbmRvdy5tYXN0ZXJVdGlscyA9IG1hc3RlclV0aWxzO1xuICAgIH1cblxufSgpKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIHJvdW5kID0gcmVxdWlyZSgnLi9yb3VuZCcpO1xudmFyIGR1ID0gcmVxdWlyZSgnLi9kYXRlX3V0aWxzJyk7XG5cbi8qXG4vLyBWSVNVQUxJWkFUSU9OIEZMQUdTIElOIEVBQ0ggTk9ERVxuICAgIHNob3dJZlplcm86ICAgICAgICAgU2hvdyBldmVuIGlmIFRvdGFsIGlzIHplcm9cbiAgICBpZk9uZUhpZGVQYXJlbnQ6ICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhpcyBncm91cCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2UgaXQgd2l0aCB0aGUgY2hhbGRcbiAgICBpZk9uZUhpZGVDaGlsZDogICAgIElmIHRoaXMgZ3JvdXAgaGFzIG9ubHkgb25lIGNoaWxkLCByZW1vdmUgdGhlIGNoaWxkXG4gICAgaGlkZVRvdGFsOiAgICAgICAgICBKdXN0IHJlbW92ZSAgdGhlIHRvdGFsIGFuZCBwdXQgYWxsIHRoZSBjaGlsZHNcbiAgICB0b3RhbE9uQm90dG9tOiAgICAgICAgIFB1dCB0aGUgVG90YWwgb24gdGhlIGRvcFxuICAgIGhpZGVEZXRhaWw6ICAgICAgICAgRG8gbm90IHNob3cgdGhlIGRldGFpbHNcbiovXG5cblxudmFyIHJlZ2lzdGVyZWRNb2RpZmllcnMgPSB7XG4gICAgXCJBR1JFR0FUT1JcIjogcmVxdWlyZShcIi4vcHJpY2VfYWdyZWdhdG9yLmpzXCIpLFxuICAgIFwiTElORVwiOiByZXF1aXJlKFwiLi9wcmljZV9saW5lLmpzXCIpLFxuICAgIFwiVkFUSU5DTFVERURcIjogcmVxdWlyZShcIi4vcHJpY2VfdmF0aW5jbHVkZWQuanNcIiksXG4gICAgXCJESVNDT1VOVFwiOiByZXF1aXJlKFwiLi9wcmljZV9kaXNjb3VudC5qc1wiKSxcbiAgICBcIkNBTENQUklDRVwiOiByZXF1aXJlKFwiLi9wcmljZV9jYWxjcHJpY2UuanNcIiksXG4gICAgXCJJTlNVUkFOQ0VcIjogcmVxdWlyZShcIi4vcHJpY2VfaW5zdXJhbmNlLmpzXCIpXG59O1xuXG52YXIgUHJpY2UyID0gZnVuY3Rpb24ocDEsIHAyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYubGluZXMgPSBbXTtcbiAgICBzZWxmLm9wdGlvbnMgPSB7fTtcbiAgICBfLmVhY2goYXJndW1lbnRzLCBmdW5jdGlvbihwKSB7XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICBpZiAoKHR5cGVvZiBwID09PSBcIm9iamVjdFwiKSYmKHAubGluZXMpKSB7XG4gICAgICAgICAgICAgICAgXy5lYWNoKHAubGluZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUobCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBfLmVhY2gocCwgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikmJihwLmNsYXNzIHx8IHAubGFiZWwpKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5saW5lcy5wdXNoKF8uY2xvbmUocCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNlbGYub3B0aW9ucyA9IHA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHNlbGYudHJlZVZhbGlkPWZhbHNlO1xufTtcblxuUHJpY2UyLnByb3RvdHlwZS5hZGRQcmljZSA9IGZ1bmN0aW9uKHApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFwKSByZXR1cm47XG4gICAgdmFyIGNwO1xuICAgIGlmICgodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpJiYgKHAubGluZXMpKSB7XG4gICAgICAgIGNwID0gcC5saW5lcztcbiAgICB9IGVsc2UgaWYgKGNwIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3AgPSBwO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHAgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgY3AgPSBbcF07XG4gICAgfVxuICAgIF8uZWFjaChjcCwgZnVuY3Rpb24obCkge1xuICAgICAgICBzZWxmLmxpbmVzLnB1c2goXy5jbG9uZShsKSk7XG4gICAgfSk7XG4gICAgc2VsZi50cmVlVmFsaWQ9ZmFsc2U7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLmNvbnN0cnVjdFRyZWUgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIHNvcnRUcmVlKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRzKSB7XG4gICAgICAgICAgICBub2RlLmNoaWxkcyA9IF8uc29ydEJ5QWxsKG5vZGUuY2hpbGRzLCBbXCJvcmRlclwiLCBcInN1Ym9yZGVyXCJdKTtcbiAgICAgICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgc29ydFRyZWUpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxuXG5cbiAgICBpZiAoc2VsZi50cmVlVmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYudG90YWw7XG4gICAgfVxuXG4gICAgc2VsZi50b3RhbCA9IHtcbiAgICAgICAgaWQ6IFwidG90YWxcIixcbiAgICAgICAgbGFiZWw6IFwiQFRvdGFsXCIsXG4gICAgICAgIGNoaWxkczogW10sXG5cbiAgICAgICAgc2hvd0lmWmVybzogdHJ1ZSxcbiAgICAgICAgdG90YWxPbkJvdHRvbTogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgbW9kaWZpZXJzID0gW107XG5cbiAgICB2YXIgaSA9MDtcblxuICAgIF8uZWFjaChzZWxmLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGwuc3Vib3JkZXIgPSBpKys7ICAgICAgICAgICAgICAgLy8gc3Vib3JkZXIgaXMgdGhlIG9yaWdpbmFsIG9yZGVyLiBJbiBjYXNlIG9mIHRpZSB1c2UgdGhpcy5cbiAgICAgICAgbC5jbGFzcyA9IGwuY2xhc3MgfHwgXCJMSU5FXCI7XG4gICAgICAgIGlmICghcmVnaXN0ZXJlZE1vZGlmaWVyc1tsLmNsYXNzXSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9kaWZpZXIgXCIgKyBsLmNsYXNzICsgXCIgbm90IGRlZmluZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtb2RpZmllciA9IG5ldyByZWdpc3RlcmVkTW9kaWZpZXJzW2wuY2xhc3NdKGwpO1xuICAgICAgICBtb2RpZmllci5zdWJvcmRlciA9IGk7XG4gICAgICAgIG1vZGlmaWVycy5wdXNoKG1vZGlmaWVyKTtcbiAgICB9KTtcblxuICAgIG1vZGlmaWVycyA9IF8uc29ydEJ5QWxsKG1vZGlmaWVycywgW1wiZXhlY09yZGVyXCIsIFwiZXhlY1N1Ym9yZGVyXCIsIFwic3Vib3JkZXJcIl0pO1xuXG4gICAgXy5lYWNoKG1vZGlmaWVycywgZnVuY3Rpb24obSkge1xuICAgICAgICBtLm1vZGlmeShzZWxmLnRvdGFsLCBzZWxmLm9wdGlvbnMpO1xuICAgIH0pO1xuXG4gICAgc29ydFRyZWUoc2VsZi50b3RhbCk7XG5cbiAgICBzZWxmLnRyZWVWYWxpZCA9IHRydWU7XG4gICAgcmV0dXJuIHNlbGYudG90YWw7XG59O1xuXG5mdW5jdGlvbiBjYWxjVG90YWxzKG5vZGUsIGZpbHRlcikge1xuICAgIGlmICghZmlsdGVyKG5vZGUpKSByZXR1cm4gMDtcbiAgICBpZiAodHlwZW9mIG5vZGUuY2hpbGRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIG5vZGUuaW1wb3J0ID0gMDtcbiAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjKSB7XG4gICAgICAgICAgICBub2RlLmltcG9ydCArPSBjYWxjVG90YWxzKGMsIGZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUuaW1wb3J0ID0gbm9kZS5pbXBvcnQgfHwgMDtcbiAgICB9XG4gICAgbm9kZS5pbXBvcnQgPSByb3VuZChub2RlLmltcG9ydCwgXCJST1VORFwiLCAwLjAxKTtcbiAgICByZXR1cm4gbm9kZS5pbXBvcnQ7XG59XG5cblByaWNlMi5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oaWQsIGZpbHRlcikge1xuXG4gICAgaWYgKHR5cGVvZiBpZCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGZpbHRlciA9aWQ7XG4gICAgICAgIGlkPW51bGw7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlkID0gaWQgfHwgXCJ0b3RhbFwiO1xuICAgIHZhciByZW5kZXJSZXN1bHQ7XG4gICAgaWYgKCFmaWx0ZXIpIGZpbHRlciA9IGZ1bmN0aW9uKCkge3JldHVybiB0cnVlO307XG5cblxuXG4vKlxuLy8gVklTVUFMSVpBVElPTiBGTEFHUyBJTiBFQUNIIE5PREVcbiAgICBzaG93SWZaZXJvOiAgICAgICAgIFNob3cgZXZlbiBpZiBUb3RhbCBpcyB6ZXJvXG4gICAgaWZPbmVIaWRlUGFyZW50OiAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoaXMgZ3JvdXAgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlIGl0IHdpdGggdGhlIGNoYWxkXG4gICAgaWZPbmVIaWRlQ2hpbGQ6ICAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoZSBjaGlsZFxuICAgIGhpZGVUb3RhbDogICAgICAgICAgSnVzdCByZW1vdmUgIHRoZSB0b3RhbCBhbmQgcHV0IGFsbCB0aGUgY2hpbGRzXG4gICAgdG90YWxPbkJvdHRvbTogICAgICAgICBQdXQgdGhlIFRvdGFsIG9uIHRoZSBkb3BcbiAgICBoaWRlRGV0YWlsOiAgICAgICAgIERvIG5vdCBzaG93IHRoZSBkZXRhaWxzXG5cbiAgICBoaWRlSWZOb0NoaWxkczogICAgIEhpZGUgaWYgaXMgYSBwYXJlbnQgd2l0aCBubyBjaGlsZHNcbiovXG5cblxuICAgIGZ1bmN0aW9uIHJlbmRlck5vZGUobm9kZSwgbGV2ZWwpIHtcblxuICAgICAgICB2YXIgcmVuZGVyVG90YWwgPSB0cnVlO1xuICAgICAgICB2YXIgcmVuZGVyRGV0YWlsID0gdHJ1ZTtcbiAgICAgICAgaWYgKCFmaWx0ZXIobm9kZSkpIHJldHVybiAwO1xuICAgICAgICBpZiAoKCFub2RlLnNob3dJZlplcm8pICYmICghbm9kZS5xdWFudGl0eSkgJiYgKCFub2RlLmltcG9ydCkpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgIGlmICgobm9kZS5jaGlsZHMpJiYobm9kZS5jaGlsZHMubGVuZ3RoID09PSAxKSYmKCFub2RlLmhpZGVEZXRhaWwpKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVQYXJlbnQpIHJlbmRlclRvdGFsID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobm9kZS5pZk9uZUhpZGVDaGlsZCkgcmVuZGVyRGV0YWlsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCgoIW5vZGUuY2hpbGRzKXx8KG5vZGUuY2hpbGRzLmxlbmd0aCA9PT0gMCkpJiYobm9kZS5oaWRlSWZOb0NoaWxkcykpICB7XG4gICAgICAgICAgICByZW5kZXJUb3RhbCA9ZmFsc2U7XG4gICAgICAgICAgICByZW5kZXJEZXRhaWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS5oaWRlRGV0YWlsKSByZW5kZXJEZXRhaWw9IGZhbHNlO1xuICAgICAgICBpZiAobm9kZS5oaWRlVG90YWwpIHJlbmRlclRvdGFsPWZhbHNlO1xuXG4gICAgICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZShub2RlKTtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuY2hpbGRzO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5zaG93SWZaZXJvO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5oaWRlRGV0YWlsO1xuICAgICAgICBkZWxldGUgbmV3Tm9kZS5oaWRlVG90YWw7XG4gICAgICAgIGRlbGV0ZSBuZXdOb2RlLmlmT25lSGlkZVBhcmVudDtcbiAgICAgICAgZGVsZXRlIG5ld05vZGUuaWZPbmVIaWRlQ2hpbGQ7XG4gICAgICAgIG5ld05vZGUubGV2ZWwgPSBsZXZlbDtcblxuICAgICAgICBpZiAoKHJlbmRlclRvdGFsKSAmJiAoIW5vZGUudG90YWxPbkJvdHRvbSkpIHtcbiAgICAgICAgICAgIHJlbmRlclJlc3VsdC5wdXNoKG5ld05vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbmRlckRldGFpbCkge1xuICAgICAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZW5kZXJOb2RlKGNoaWxkTm9kZSwgcmVuZGVyVG90YWwgPyBsZXZlbCArMSA6IGxldmVsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICgocmVuZGVyVG90YWwpICYmIChub2RlLnRvdGFsT25Cb3R0b20pKSB7XG4gICAgICAgICAgICByZW5kZXJSZXN1bHQucHVzaChuZXdOb2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlclJlc3VsdCA9IFtdO1xuXG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICB2YXIgbm9kZSA9IGZpbmROb2RlKHNlbGYudG90YWwsIGlkKTtcblxuICAgIGNhbGNUb3RhbHMobm9kZSwgZmlsdGVyKTtcblxuICAgIHJlbmRlck5vZGUobm9kZSwgMCk7XG5cbiAgICByZXR1cm4gcmVuZGVyUmVzdWx0O1xufTtcblxuXG5QcmljZTIucHJvdG90eXBlLnJlbmRlclRyZWUgPSBmdW5jdGlvbihpZCwgZmlsdGVyKSB7XG5cbiAgICBpZiAodHlwZW9mIGlkID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgZmlsdGVyID1pZDtcbiAgICAgICAgaWQ9bnVsbDtcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWQgPSBpZCB8fCBcInRvdGFsXCI7XG4gICAgdmFyIHJlbmRlclRyZWVSZXN1bHQ7XG4gICAgaWYgKCFmaWx0ZXIpIGZpbHRlciA9IGZ1bmN0aW9uKCkge3JldHVybiB0cnVlO307XG5cblxuXG4vKlxuLy8gVklTVUFMSVpBVElPTiBGTEFHUyBJTiBFQUNIIE5PREVcbiAgICBzaG93SWZaZXJvOiAgICAgICAgIFNob3cgZXZlbiBpZiBUb3RhbCBpcyB6ZXJvXG4gICAgaWZPbmVIaWRlUGFyZW50OiAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoaXMgZ3JvdXAgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlIGl0IHdpdGggdGhlIGNoYWxkXG4gICAgaWZPbmVIaWRlQ2hpbGQ6ICAgICBJZiB0aGlzIGdyb3VwIGhhcyBvbmx5IG9uZSBjaGlsZCwgcmVtb3ZlIHRoZSBjaGlsZFxuICAgIGhpZGVUb3RhbDogICAgICAgICAgSnVzdCByZW1vdmUgIHRoZSB0b3RhbCBhbmQgcHV0IGFsbCB0aGUgY2hpbGRzXG4gICAgdG90YWxPbkJvdHRvbTogICAgICAgICBQdXQgdGhlIFRvdGFsIG9uIHRoZSBkb3BcbiAgICBoaWRlRGV0YWlsOiAgICAgICAgIERvIG5vdCBzaG93IHRoZSBkZXRhaWxzXG4qL1xuXG5cbiAgICBmdW5jdGlvbiByZW5kZXJUcmVlTm9kZShub2RlLCBwYXJlbnROb2RlKSB7XG5cbiAgICAgICAgaWYgKCFmaWx0ZXIobm9kZSkpIHJldHVybiAwO1xuXG4gICAgICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZShub2RlKTtcbiAgICAgICAgbmV3Tm9kZS5jaGlsZHMgPSBbXTtcblxuICAgICAgICBfLmVhY2gobm9kZS5jaGlsZHMsIGZ1bmN0aW9uKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgcmVuZGVyVHJlZU5vZGUoY2hpbGROb2RlLCBuZXdOb2RlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJlbmRlclRvdGFsID0gdHJ1ZTtcbiAgICAgICAgdmFyIHJlbmRlckRldGFpbCA9IHRydWU7XG4gICAgICAgIGlmICgoIW5vZGUuc2hvd0lmWmVybykgJiYgKCFub2RlLnF1YW50aXR5KSAmJiAoIW5vZGUuaW1wb3J0KSkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgaWYgKChuZXdOb2RlLmNoaWxkcy5sZW5ndGggPT09IDEpJiYoIW5vZGUuaGlkZURldGFpbCkpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZVBhcmVudCkgcmVuZGVyVG90YWwgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmIChub2RlLmlmT25lSGlkZUNoaWxkKSByZW5kZXJEZXRhaWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKG5ld05vZGUuY2hpbGRzLmxlbmd0aCA9PT0gMCkmJihub2RlLmhpZGVJZk5vQ2hpbGRzKSkge1xuICAgICAgICAgICAgcmVuZGVyVG90YWwgPWZhbHNlO1xuICAgICAgICAgICAgcmVuZGVyRGV0YWlsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUuaGlkZURldGFpbCkgcmVuZGVyRGV0YWlsPSBmYWxzZTtcbiAgICAgICAgaWYgKG5vZGUuaGlkZVRvdGFsKSByZW5kZXJUb3RhbD1mYWxzZTtcblxuXG4gICAgICAgIC8vICAgICAgICAgICAgbmV3Tm9kZS5wYXJlbnQgPSBwYXJlbnROb2RlO1xuXG4gICAgICAgIGlmICghcmVuZGVyRGV0YWlsKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcyA9IFtdO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAocmVuZGVyVG90YWwpIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZW5kZXJUcmVlUmVzdWx0ID0gbmV3Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkczogW10sXG4gICAgICAgICAgICAgICAgICAgIGhpZGVUb3RhbDogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmVhY2gobmV3Tm9kZS5jaGlsZHMsIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlLmNoaWxkcy5wdXNoKG4pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldExldmVsKG5vZGUsIGxldmVsKSB7XG4gICAgICAgIG5vZGUubGV2ZWwgPSBsZXZlbDtcbiAgICAgICAgXy5lYWNoKG5vZGUuY2hpbGRzLCBmdW5jdGlvbihuKSB7XG4gICAgICAgICAgICBzZXRMZXZlbChuLCBsZXZlbCsxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2VsZi5jb25zdHJ1Y3RUcmVlKCk7XG5cbiAgICB2YXIgbm9kZSA9IGZpbmROb2RlKHNlbGYudG90YWwsIGlkKTtcblxuICAgIGNhbGNUb3RhbHMobm9kZSwgZmlsdGVyKTtcblxuXG4gICAgcmVuZGVyVHJlZVJlc3VsdCA9IG51bGw7XG5cbiAgICByZW5kZXJUcmVlTm9kZShub2RlLCBudWxsKTtcblxuICAgIHNldExldmVsKHJlbmRlclRyZWVSZXN1bHQsIDApO1xuXG4gICAgcmV0dXJuIHJlbmRlclRyZWVSZXN1bHQ7XG59O1xuXG5mdW5jdGlvbiBmaW5kTm9kZShub2RlLCBpZCkge1xuICAgIHZhciBpO1xuICAgIGlmICghbm9kZSkgcmV0dXJuIG51bGw7XG4gICAgaWYgKG5vZGUuaWQgPT09IGlkKSByZXR1cm4gbm9kZTtcbiAgICBpZiAoIW5vZGUuY2hpbGRzKSByZXR1cm4gbnVsbDtcbiAgICBmb3IgKGk9MDsgaTxub2RlLmNoaWxkcy5sZW5ndGg7IGkrPTEpIHtcbiAgICAgICAgdmFyIGZOb2RlID0gZmluZE5vZGUobm9kZS5jaGlsZHNbaV0sIGlkKTtcbiAgICAgICAgaWYgKGZOb2RlKSByZXR1cm4gZk5vZGU7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5QcmljZTIucHJvdG90eXBlLmdldEltcG9ydCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlkID0gaWQgfHwgXCJ0b3RhbFwiO1xuICAgIHNlbGYuY29uc3RydWN0VHJlZSgpO1xuXG4gICAgdmFyIG5vZGUgPSBmaW5kTm9kZShzZWxmLnRvdGFsLCBpZCk7XG5cbiAgICBpZiAobm9kZSkge1xuICAgICAgICByZXR1cm4gbm9kZS5pbXBvcnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufTtcblxuUHJpY2UyLnByb3RvdHlwZS5hZGRBdHRyaWJ1dGVzID0gZnVuY3Rpb24oYXRyaWJ1dGUpIHtcbiAgICB2YXIgc2VsZj10aGlzO1xuICAgIHZhciBhdHRycztcbiAgICBpZiAodHlwZW9mIGF0cmlidXRlID09PSBcInN0cmluZ1wiICkge1xuICAgICAgICBhdHRycyA9IFthdHJpYnV0ZV07XG4gICAgfSBlbHNlIGlmIChhdHJpYnV0ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGF0dHJzID0gYXRyaWJ1dGU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBBdHRyaWJ1dGVcIik7XG4gICAgfVxuICAgIF8uZWFjaChhdHRycywgZnVuY3Rpb24oYSkge1xuICAgICAgICBfLmVhY2goc2VsZi5saW5lcywgZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgaWYgKCFsLmF0dHJpYnV0ZXMpIGwuYXR0cmlidXRlcyA9IFtdO1xuICAgICAgICAgICAgaWYgKCFfLmNvbnRhaW5zKGwuYXR0cmlidXRlcywgYSkpIHtcbiAgICAgICAgICAgICAgICBsLmF0dHJpYnV0ZXMucHVzaChhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5QcmljZTIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmoubGluZXMgPSBfLm1hcCh0aGlzLmxpbmVzLCBfLmNsb25lKTtcbiAgICBfLmVhY2gob2JqLmxpbmVzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbC5mcm9tID09PSBcIm51bWJlclwiKSBsLmZyb20gPSBkdS5pbnQyZGF0ZShsLmZyb20pO1xuICAgICAgICBpZiAodHlwZW9mIGwudG8gPT09IFwibnVtYmVyXCIpIGwudG8gPSBkdS5pbnQyZGF0ZShsLnRvKTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xufTtcblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlMjtcblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbi8qXG5cbkFncmVnYXRlIE1vZGlmaWVyXG49PT09PT09PT09PT09PT09PVxuXG4gICAgZ3JvdXBCeSAgICAgICAgICAgICBGbGFnIG9mIHRoZSBsaW5lcyB0aGF0IHNob3VsZCBiZSByZXBsYWNlZFxuICAgIGV4ZWNPcmRlciAgICAgICAgICAgT3JkZXIgaW4gd2hpY2ggdGhpcyBtb2RpZmllciBpIGV4Y2V2dXRlZC5cblxufVxuXG4qL1xuXG52YXIgUHJpY2VBZ3JlZ2F0b3IgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDk7XG4gICAgdGhpcy5ncm91cEJ5ID0gbGluZS5ncm91cEJ5O1xuICAgIGlmICggISAodGhpcy5ncm91cEJ5IGluc3RhbmNlb2YgIEFycmF5KSkge1xuICAgICAgICB0aGlzLmdyb3VwQnkgPSBbIHRoaXMuZ3JvdXBCeSBdO1xuICAgIH1cbn07XG5cblByaWNlQWdyZWdhdG9yLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBuZXdOb2RlID0gXy5jbG9uZSh0aGlzLmxpbmUpO1xuICAgIG5ld05vZGUuY2hpbGRzID0gW107XG4gICAgdmFyIGksbDtcbiAgICBmb3IgKGk9MDsgaTx0cmVlLmNoaWxkcy5sZW5ndGg7IGkrPTEpIHtcbiAgICAgICAgbD10cmVlLmNoaWxkc1tpXTtcbiAgICAgICAgaWYgKF8uaW50ZXJzZWN0aW9uKGwuYXR0cmlidXRlcywgc2VsZi5ncm91cEJ5KS5sZW5ndGggPT09ICBzZWxmLmdyb3VwQnkubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdOb2RlLmNoaWxkcy5wdXNoKGwpO1xuICAgICAgICAgICAgdHJlZS5jaGlsZHNbaV0gPSB0cmVlLmNoaWxkc1t0cmVlLmNoaWxkcy5sZW5ndGgtMV07XG4gICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgIGktPTE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdHJlZS5jaGlsZHMucHVzaChuZXdOb2RlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VBZ3JlZ2F0b3I7XG5cblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgZHU9IHJlcXVpcmUoXCIuL2RhdGVfdXRpbHMuanNcIik7XG5cbi8qXG5cbkNhbGNQcmljZSBNb2RpZmllclxuPT09PT09PT09PT09PT09PT1cblxuICAgIHBoYXNlICAgICAgICAgICAgIEZsYWcgb2YgdGhlIGxpbmVzIHRoYXQgc2hvdWxkIGJlIHJlcGxhY2VkXG4gICAgZXhlY09yZGVyICAgICAgICAgICBPcmRlciBpbiB3aGljaCB0aGlzIG1vZGlmaWVyIGkgZXhjZXZ1dGVkLlxuICAgIHJ1bGVzICAgICAgICAgICAgICBBcnJheSBvZiBydWxlc1xuXG5cblxufVxuXG4qL1xuXG52YXIgUHJpY2VDYWxjUHJpY2UgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5leGVjU3Vib3JkZXIgPSBsaW5lLnBoYXNlO1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA1O1xuXG59O1xuXG5QcmljZUNhbGNQcmljZS5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSwgb3B0aW9ucykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gcnVsZURvZXNBcHBseSAocnVsZSkge1xuICAgICAgICB2YXIgaVJlc2VydmF0aW9uID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5yZXNlcnZhdGlvbik7XG4gICAgICAgIGlmICgocnVsZS5yZXNlcnZhdGlvbk1pbikmJihpUmVzZXJ2YXRpb24gPCBkdS5kYXRlMmludChydWxlLnJlc2VydmF0aW9uTWluKSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLnJlc2VydmF0aW9uTWF4KSYmKGlSZXNlcnZhdGlvbiA+IGR1LmRhdGUyaW50KHJ1bGUucmVzZXJ2YXRpb25NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB2YXIgaUNoZWNraW4gPSBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgaUNoZWNrb3V0ID0gZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGlmICgocnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbikmJiggaUNoZWNraW4gLSBpUmVzZXJ2YXRpb24gPCBydWxlLmRheXNCZWZvcmVDaGVja2luTWluICkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKChydWxlLmRheXNCZWZvcmVDaGVja2luTWluIHx8IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW49PT0wKSYmKCBpQ2hlY2tpbiAtIGlSZXNlcnZhdGlvbiA+IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NYXggKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1pbikmJiggaUNoZWNraW4gPCBkdS5kYXRlMmludChydWxlLmNoZWNraW5NaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tpbk1heCkmJiggaUNoZWNraW4gPiBkdS5kYXRlMmludChydWxlLmNoZWNraW5NYXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNaW4pJiYoIGlDaGVja291dCA8IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuY2hlY2tvdXRNYXgpJiYoIGlDaGVja291dCA+IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tvdXRNYXgpKSkgcmV0dXJuIGZhbHNlO1xuXG5cbiAgICAgICAgLy8gV2UgY2xjdWxhdGUgYW4gZWZlY3RpdmUgY2hlY2tpbi9jaGVja291dCB0YWtpbmcgaW4gYWNjb3VudCB0aGUgc3RheUxlbmd0aEZyb20gYW5kIHN0YXlMZW5ndGhUb1xuXG4gICAgICAgIHZhciBlZkNoZWNrb3V0LCBlZkNoZWNraW47XG4gICAgICAgIGlmIChydWxlLnN0YXlMZW5ndGhGcm9tKSB7XG4gICAgICAgICAgICBlZkNoZWNraW4gPSBNYXRoLm1heChpQ2hlY2tpbiwgZHUuZGF0ZTJpbnQocnVsZS5zdGF5TGVuZ3RoRnJvbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWZDaGVja2luID0gaUNoZWNraW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJ1bGUuc3RheUxlbmd0aFRvKSB7XG4gICAgICAgICAgICBlZkNoZWNrb3V0ID0gTWF0aC5taW4oaUNoZWNrb3V0LCBkdS5kYXRlMmludChydWxlLnN0YXlMZW5ndGhUbykgKzEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWZDaGVja291dCA9IGlDaGVja291dDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZWZMZW4gPSBlZkNoZWNrb3V0IC1lZkNoZWNraW47XG4gICAgICAgIGlmIChlZkxlbj4wKSB7XG4gICAgICAgICAgICBpZiAoKHJ1bGUubWluU3RheSkmJiggZWZMZW4gPCBydWxlLm1pblN0YXkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBpZiAoKHJ1bGUubWF4U3RheSB8fCBydWxlLm1heFN0YXk9PT0wKSYmKCBlZkxlbiA+IHJ1bGUubWF4U3RheSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcHJvcG9ydGlvbkFwcGx5KGlJbiwgaU91dCwgaUFwcGx5RnJvbSwgaUFwcGx5VG8pIHtcbiAgICAgICAgdmFyIGEgPSBpSW4gPiBpQXBwbHlGcm9tID8gaUluIDogaUFwcGx5RnJvbTtcbiAgICAgICAgdmFyIGIgPSBpT3V0IDwgaUFwcGx5VG8gPyBpT3V0IDogaUFwcGx5VG87XG4gICAgICAgIGlmIChiPmEpIHJldHVybiAwO1xuICAgICAgICByZXR1cm4gKGItYSkvKGlPdXQtaUluKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5SdWxlKGxpbmUsIHJ1bGUpIHtcbiAgICAgICAgdmFyIGEsYixpO1xuICAgICAgICB2YXIgZGF5cyA9IFtdO1xuICAgICAgICB2YXIgbEZyb20gPSBsaW5lLmZyb20gPyBkdS5kYXRlMmludChsaW5lLmZyb20pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja2luKTtcbiAgICAgICAgdmFyIGxUbyA9IGxpbmUudG8gPyBkdS5kYXRlMmludChsaW5lLnRvKSA6IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tvdXQpO1xuXG4gICAgICAgIHZhciByRnJvbSA9IHJ1bGUuYXBwbHlGcm9tID8gZHUuZGF0ZTJpbnQocnVsZS5hcHBseUZyb20pOiBsRnJvbTtcbiAgICAgICAgdmFyIHJUbyA9IHJ1bGUuYXBwbHlUbyA/IGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlUbykgKyAxIDogbFRvO1xuXG4gICAgICAgIGEgPSBNYXRoLm1heChyRnJvbSwgbEZyb20pO1xuICAgICAgICBiID0gTWF0aC5taW4oclRvLCBsVG8pO1xuXG4gICAgICAgIGZvciAoaT1hOyBpPGI7IGkrPTEpIHtcbiAgICAgICAgICAgIGRheXMucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF5cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5MaW5lKGxpbmUpIHtcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIHZhciBkYXlzID0gW107XG4gICAgICAgIHZhciBsRnJvbSA9IGxpbmUuZnJvbSA/IGR1LmRhdGUyaW50KGxpbmUuZnJvbSkgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgbFRvID0gbGluZS50byA/IGR1LmRhdGUyaW50KGxpbmUudG8pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGZvciAoaT1sRnJvbTsgaTxsVG87IGkrPTEpIHtcbiAgICAgICAgICAgIGRheXMucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF5cztcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdGhlIHByaWNlcyB3aXRoIHRoZSBzYW1lIG9yIGdyZWF0ZXIgcGhhc2UuXG5cbiAgICB2YXIgc2FtZVBoYXNlQ2FsY1ByaWNlcyA9IFtdO1xuICAgIHZhciBwb3N0cG9uZWRDYWxjUHJpY2VzID0gW107XG4gICAgdmFyIGFwcGxpZWRDYWxjUHJpY2VzID0gW107XG5cbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAobC5wcmljZVBlckRheSkge1xuICAgICAgICAgICAgaWYgKGwucGhhc2UgPT09IHNlbGYubGluZS5waGFzZSkgeyAvLyBSZW1vdmUgYW5kIGdldCB0aGUgYmVzdFxuICAgICAgICAgICAgICAgIHNhbWVQaGFzZUNhbGNQcmljZXMucHVzaChsKTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgICAgICBpLT0xO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsLnBoYXNlID4gc2VsZi5saW5lLnBoYXNlKSB7IC8vIFJlbW92ZSBhbmQgcmVwcmNlc3MgIGxhdGVyXG4gICAgICAgICAgICAgICAgcG9zdHBvbmVkQ2FsY1ByaWNlcy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzW2ldID0gdHJlZS5jaGlsZHNbdHJlZS5jaGlsZHMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGktPTE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFwcGxpZWRDYWxjUHJpY2VzLnB1c2gobCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYXBwbGllZFJ1bGVzID0gXy5maWx0ZXIoc2VsZi5saW5lLnJ1bGVzLCBydWxlRG9lc0FwcGx5KTtcblxuICAgIC8vIFRoaXMgaGFzaCBjb250YWlucyB0aGUgYmVzdCBwcmljZSBmb3IgZWFjaCBsaW5lIGFuZCBkYXlcbiAgICAvLyBwcmljZVBlckRheVsnM3wxODQ3NSddPSAxNSBNZWFucyB0aGF0IHRoZSBsaW5lIHRyZWVbM10gd2lsbCBoYXZlIGEgcHJpY2Ugb2YgMTVcbiAgICAvLyBhdCBkYXkgMTg0NzVcbiAgICB2YXIgcHJpY2VQZXJEYXkgPSB7fTtcbiAgICBfLmVhY2goYXBwbGllZFJ1bGVzLCBmdW5jdGlvbihydWxlKSB7XG4gICAgICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCwgbGluZUlkeCkgeyAvLyBUT0RPIG1pcmFyIHRvdCBsJ2FyYnJlXG4gICAgICAgICAgICBpZiAobC5jbGFzcyAhPT0gXCJMSU5FXCIpIHJldHVybjtcbiAgICAgICAgICAgIGlmICghIF8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBydWxlLmFwcGx5SWRDb25jZXB0QXR0cmlidXRlLnRvU3RyaW5nKCkpKSByZXR1cm47XG4gICAgICAgICAgICBfLmVhY2goZGF5c0luUnVsZShsLCBydWxlKSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIHZhciBrPSBsaW5lSWR4Kyd8JytkO1xuXG4gICAgICAgICAgICAgICAgdmFyIHByYyA9IHJ1bGUuYXBwbHlQQyAqICBsLnF1YW50aXR5ICogIGwuYmFzZVByaWNlIC8gMTAwO1xuICAgICAgICAgICAgICAgIF8uZWFjaChhcHBsaWVkQ2FsY1ByaWNlcywgZnVuY3Rpb24ob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEgXy5jb250YWlucyhvZC5hdHRyaWJ1dGVzLCBydWxlLmFwcGx5SWRDb25jZXB0QXR0cmlidXRlLnRvU3RyaW5nKCkpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGlmIChvZC5wcmljZVBlckRheVtrXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJjID0gcHJjICsgIG9kLnByaWNlUGVyRGF5W2tdICogcnVsZS5hcHBseVBDLzEwMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFwcmljZVBlckRheVtrXSkge1xuICAgICAgICAgICAgICAgICAgICBwcmljZVBlckRheVtrXT1wcmM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpY2VQZXJEYXlba10gPSBNYXRoLm1pbihwcmljZVBlckRheVtrXSwgcHJjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciB2YXQgPTA7XG4gICAgdmFyIGJhc2UgPTA7XG4gICAgdmFyIHRvdGFsSW1wb3J0ID0wO1xuXG4gICAgLy8gdG90YWxJbXBvcnQgYW5kIGJhc2UgYXJlIHRoZSB0b3RhbCBhbW91bnRzIG9mIGNhcGNQcmljZXMgdGhhdCBhcmUgYXBwbGllZFxuICAgIC8vIFRoZSBWQVQgaXMgYSBwb25kZXJhdGVkIGF2ZXJhZ2Ugb2YgYWxsIHRoZSBsaW5lcyB0aGVyIHRoZSBjYWxjUHJpY2UgYXBwbGllcy5cblxuICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCwgbGluZUlkeCkge1xuICAgICAgICBpZiAobC5wcmljZVBlckRheSkgcmV0dXJuO1xuICAgICAgICB2YXIgcHJjPTA7XG4gICAgICAgIF8uZWFjaChkYXlzSW5MaW5lKGwpLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICB2YXIgaz0gbGluZUlkeCsnfCcrZDtcbiAgICAgICAgICAgIGlmIChwcmljZVBlckRheVtrXSkge1xuICAgICAgICAgICAgICAgIHByYyArPSBwcmljZVBlckRheVtrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGxWYXQgPSAwO1xuICAgICAgICBfLmVhY2gobC50YXhlcywgZnVuY3Rpb24odGF4KSB7XG4gICAgICAgICAgICBpZiAodGF4LnR5cGUgPT09IFwiVkFUXCIpIHtcbiAgICAgICAgICAgICAgICBsVmF0ID0gdGF4LlBDO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoKGJhc2UgKyBwcmMpICE9PSAwKSB7XG4gICAgICAgICAgICB2YXQgPSAodmF0KmJhc2UgKyBsVmF0KnByYykgLyAoYmFzZSArIHByYyk7XG4gICAgICAgIH1cbiAgICAgICAgYmFzZSA9IGJhc2UgKyBwcmM7XG4gICAgICAgIGlmIChsLmJhc2VJbXBvcnQpIHtcbiAgICAgICAgICAgIHRvdGFsSW1wb3J0ID0gdG90YWxJbXBvcnQgKyBsLmltcG9ydCAqIHByYy9sLmJhc2VJbXBvcnQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBiZXN0TGluZSA9IF8uY2xvbmUoc2VsZi5saW5lKTtcblxuICAgIGJlc3RMaW5lLmJhc2VJbXBvcnQgPSBiYXNlO1xuICAgIGJlc3RMaW5lLmJhc2VQcmljZSA9IGJhc2U7XG4gICAgYmVzdExpbmUuaW1wb3J0ID0gdG90YWxJbXBvcnQ7XG4gICAgYmVzdExpbmUucXVhbnRpdHkgPSAxO1xuICAgIGJlc3RMaW5lLmNsYXNzID0gXCJMSU5FXCI7XG4gICAgYmVzdExpbmUuc3Vib3JkZXIgPSBzZWxmLmV4ZWNTdWJvcmRlcjtcbiAgICBiZXN0TGluZS5wcmljZVBlckRheSA9IHByaWNlUGVyRGF5O1xuXG4gICAgYmVzdExpbmUudGF4ZXMgPSBiZXN0TGluZS50YXhlcyB8fCBbXTtcblxuICAgIHZhciB0YXggPSBfLmZpbmRXaGVyZShiZXN0TGluZS50YXhlcyx7dHlwZTogXCJWQVRcIn0pO1xuICAgIGlmICghdGF4KSB7XG4gICAgICAgIHRheCA9IHtcbiAgICAgICAgICAgIHR5cGU6IFwiVkFUXCJcbiAgICAgICAgfTtcbiAgICAgICAgYmVzdExpbmUudGF4ZXMucHVzaCh0YXgpO1xuICAgIH1cbiAgICB0YXguUEMgPSB2YXQ7XG5cbiAgICAvLyBGaW5kIHRoZSBiZXN0IGNhbGNQcmljZSBjb25jZXB0IGluIHRoZSBzYW1lIHBoYXNlLlxuXG4gICAgc2FtZVBoYXNlQ2FsY1ByaWNlcy5wdXNoKGJlc3RMaW5lKTtcblxuICAgIHZhciBiZXN0TGluZUluUGhhc2UgPSBfLnJlZHVjZShzYW1lUGhhc2VDYWxjUHJpY2VzLCBmdW5jdGlvbihiZXN0TGluZSwgbGluZSkge1xuICAgICAgICBpZiAoIWxpbmUpIHJldHVybiBiZXN0TGluZTtcbiAgICAgICAgcmV0dXJuIChsaW5lLmltcG9ydCA8IGJlc3RMaW5lLmltcG9ydCkgPyBsaW5lIDogYmVzdExpbmU7XG4gICAgfSk7XG5cbiAgICBpZiAoYmVzdExpbmVJblBoYXNlLmltcG9ydCAhPT0gMCkge1xuICAgICAgICB0cmVlLmNoaWxkcy5wdXNoKGJlc3RMaW5lSW5QaGFzZSk7XG4gICAgfVxuXG4gICAgLy8gRmluYWx5IHdlIHJlYXBseSB0aGUgY2FsY1ByaWNlcyBvZiBncmVhdGVyIHBoYXNlcyB0aGF0IHd1ZXJlIGFwcGxpZWQgYmVmb3JlLlxuXG4gICAgcG9zdHBvbmVkQ2FsY1ByaWNlcyA9IF8uc29ydEJ5KHBvc3Rwb25lZENhbGNQcmljZXMsICdwaGFzZScpO1xuXG4gICAgXy5lYWNoKHBvc3Rwb25lZENhbGNQcmljZXMsIGZ1bmN0aW9uKGwpIHtcbiAgICAgICAgdmFyIG1vZGlmaWVyID0gbmV3IFByaWNlQ2FsY1ByaWNlKGwpO1xuICAgICAgICBtb2RpZmllci5hcHBseSh0cmVlLCBvcHRpb25zKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VDYWxjUHJpY2U7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfPSh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcbnZhciBkdT0gcmVxdWlyZShcIi4vZGF0ZV91dGlscy5qc1wiKTtcblxuLypcblxuRGlzY291bnQgTW9kaWZpZXJcbj09PT09PT09PT09PT09PT09XG5cbiAgICBwaGFzZSAgICAgICAgICAgICBGbGFnIG9mIHRoZSBsaW5lcyB0aGF0IHNob3VsZCBiZSByZXBsYWNlZFxuICAgIGV4ZWNPcmRlciAgICAgICAgICAgT3JkZXIgaW4gd2hpY2ggdGhpcyBtb2RpZmllciBpIGV4Y2V2dXRlZC5cbiAgICBydWxlcyAgICAgICAgICAgICAgQXJyYXkgb2YgcnVsZXNcblxuXG5cbn1cblxuKi9cblxudmFyIFByaWNlRGlzY291bnQgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5leGVjU3Vib3JkZXIgPSBsaW5lLnBoYXNlO1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA1O1xuXG59O1xuXG5QcmljZURpc2NvdW50LnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlLCBvcHRpb25zKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBydWxlRG9lc0FwcGx5IChydWxlKSB7XG4gICAgICAgIHZhciBpUmVzZXJ2YXRpb24gPSBkdS5kYXRlMmludChvcHRpb25zLnJlc2VydmF0aW9uKTtcbiAgICAgICAgaWYgKChydWxlLnJlc2VydmF0aW9uTWluKSYmKGlSZXNlcnZhdGlvbiA8IGR1LmRhdGUyaW50KHJ1bGUucmVzZXJ2YXRpb25NaW4pKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUucmVzZXJ2YXRpb25NYXgpJiYoaVJlc2VydmF0aW9uID4gZHUuZGF0ZTJpbnQocnVsZS5yZXNlcnZhdGlvbk1heCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHZhciBpQ2hlY2tpbiA9IGR1LmRhdGUyaW50KG9wdGlvbnMuY2hlY2tpbik7XG4gICAgICAgIHZhciBpQ2hlY2tvdXQgPSBkdS5kYXRlMmludChvcHRpb25zLmNoZWNrb3V0KTtcbiAgICAgICAgaWYgKChydWxlLmRheXNCZWZvcmVDaGVja2luTWluKSYmKCBpQ2hlY2tpbiAtIGlSZXNlcnZhdGlvbiA8IHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW4gKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoKHJ1bGUuZGF5c0JlZm9yZUNoZWNraW5NaW4gfHwgcnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1pbj09PTApJiYoIGlDaGVja2luIC0gaVJlc2VydmF0aW9uID4gcnVsZS5kYXlzQmVmb3JlQ2hlY2tpbk1heCApKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja2luTWluKSYmKCBpQ2hlY2tpbiA8IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tpbk1pbikpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja2luTWF4KSYmKCBpQ2hlY2tpbiA+IGR1LmRhdGUyaW50KHJ1bGUuY2hlY2tpbk1heCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja291dE1pbikmJiggaUNoZWNrb3V0IDwgZHUuZGF0ZTJpbnQocnVsZS5jaGVja291dE1pbikpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICgocnVsZS5jaGVja291dE1heCkmJiggaUNoZWNrb3V0ID4gZHUuZGF0ZTJpbnQocnVsZS5jaGVja291dE1heCkpKSByZXR1cm4gZmFsc2U7XG5cblxuICAgICAgICAvLyBXZSBjbGN1bGF0ZSBhbiBlZmVjdGl2ZSBjaGVja2luL2NoZWNrb3V0IHRha2luZyBpbiBhY2NvdW50IHRoZSBzdGF5TGVuZ3RoRnJvbSBhbmQgc3RheUxlbmd0aFRvXG5cbiAgICAgICAgdmFyIGVmQ2hlY2tvdXQsIGVmQ2hlY2tpbjtcbiAgICAgICAgaWYgKHJ1bGUuc3RheUxlbmd0aEZyb20pIHtcbiAgICAgICAgICAgIGVmQ2hlY2tpbiA9IE1hdGgubWF4KGlDaGVja2luLCBkdS5kYXRlMmludChydWxlLnN0YXlMZW5ndGhGcm9tKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZkNoZWNraW4gPSBpQ2hlY2tpbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocnVsZS5zdGF5TGVuZ3RoVG8pIHtcbiAgICAgICAgICAgIGVmQ2hlY2tvdXQgPSBNYXRoLm1pbihpQ2hlY2tvdXQsIGR1LmRhdGUyaW50KHJ1bGUuc3RheUxlbmd0aFRvKSArMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZkNoZWNrb3V0ID0gaUNoZWNrb3V0O1xuICAgICAgICB9XG4gICAgICAgIHZhciBlZkxlbiA9IGVmQ2hlY2tvdXQgLWVmQ2hlY2tpbjtcbiAgICAgICAgaWYgKGVmTGVuPjApIHtcbiAgICAgICAgICAgIGlmICgocnVsZS5taW5TdGF5KSYmKCBlZkxlbiA8IHJ1bGUubWluU3RheSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGlmICgocnVsZS5tYXhTdGF5IHx8IHJ1bGUubWF4U3RheT09PTApJiYoIGVmTGVuID4gcnVsZS5tYXhTdGF5KSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBwcm9wb3J0aW9uQXBwbHkoaUluLCBpT3V0LCBpQXBwbHlGcm9tLCBpQXBwbHlUbykge1xuICAgICAgICB2YXIgYSA9IGlJbiA+IGlBcHBseUZyb20gPyBpSW4gOiBpQXBwbHlGcm9tO1xuICAgICAgICB2YXIgYiA9IGlPdXQgPCBpQXBwbHlUbyA/IGlPdXQgOiBpQXBwbHlUbztcbiAgICAgICAgaWYgKGI+YSkgcmV0dXJuIDA7XG4gICAgICAgIHJldHVybiAoYi1hKS8oaU91dC1pSW4pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRheXNJblJ1bGUobGluZSwgcnVsZSkge1xuICAgICAgICB2YXIgYSxiLGk7XG4gICAgICAgIHZhciBkYXlzID0gW107XG4gICAgICAgIHZhciBsRnJvbSA9IGxpbmUuZnJvbSA/IGR1LmRhdGUyaW50KGxpbmUuZnJvbSkgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgbFRvID0gbGluZS50byA/IGR1LmRhdGUyaW50KGxpbmUudG8pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGlmIChydWxlLmFwcGxpY2F0aW9uVHlwZSA9PT0gXCJXSE9MRVwiKSB7XG4gICAgICAgICAgICBhID0gbEZyb207XG4gICAgICAgICAgICBiID0gbFRvO1xuICAgICAgICB9IGVsc2UgaWYgKHJ1bGUuYXBwbGljYXRpb25UeXBlID09PSBcIkJZREFZXCIpIHtcbiAgICAgICAgICAgIHZhciByRnJvbSA9IGR1LmRhdGUyaW50KHJ1bGUuYXBwbHlGcm9tKTtcbiAgICAgICAgICAgIHZhciByVG8gPSBkdS5kYXRlMmludChydWxlLmFwcGx5VG8pICsgMTtcblxuICAgICAgICAgICAgYSA9IE1hdGgubWF4KHJGcm9tLCBsRnJvbSk7XG4gICAgICAgICAgICBiID0gTWF0aC5taW4oclRvLCBsVG8pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaT1hOyBpPGI7IGkrPTEpIHtcbiAgICAgICAgICAgIGRheXMucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF5cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYXlzSW5MaW5lKGxpbmUpIHtcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIHZhciBkYXlzID0gW107XG4gICAgICAgIHZhciBsRnJvbSA9IGxpbmUuZnJvbSA/IGR1LmRhdGUyaW50KGxpbmUuZnJvbSkgOiBkdS5kYXRlMmludChvcHRpb25zLmNoZWNraW4pO1xuICAgICAgICB2YXIgbFRvID0gbGluZS50byA/IGR1LmRhdGUyaW50KGxpbmUudG8pIDogZHUuZGF0ZTJpbnQob3B0aW9ucy5jaGVja291dCk7XG4gICAgICAgIGZvciAoaT1sRnJvbTsgaTxsVG87IGkrPTEpIHtcbiAgICAgICAgICAgIGRheXMucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF5cztcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdGhlIGRpc2NvdW50cyB3aXRoIHRoZSBzYW1lIG9yIGdyZWF0ZXIgcGhhc2UuXG5cbiAgICB2YXIgc2FtZVBoYXNlRGlzY291bnRzID0gW107XG4gICAgdmFyIHBvc3Rwb25lZERpc2NvdW50cyA9IFtdO1xuICAgIHZhciBhcHBsaWVkRGlzY291bnRzID0gW107XG5cbiAgICB2YXIgaSxsO1xuICAgIGZvciAoaT0wOyBpPHRyZWUuY2hpbGRzLmxlbmd0aDsgaSs9MSkge1xuICAgICAgICBsPXRyZWUuY2hpbGRzW2ldO1xuICAgICAgICBpZiAobC5kaXNjb3VudFBlckRheSkge1xuICAgICAgICAgICAgaWYgKGwucGhhc2UgPT09IHNlbGYubGluZS5waGFzZSkgeyAvLyBSZW1vdmUgYW5kIGdldCB0aGUgYmVzdFxuICAgICAgICAgICAgICAgIHNhbWVQaGFzZURpc2NvdW50cy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzW2ldID0gdHJlZS5jaGlsZHNbdHJlZS5jaGlsZHMubGVuZ3RoLTFdO1xuICAgICAgICAgICAgICAgIHRyZWUuY2hpbGRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGktPTE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGwucGhhc2UgPiBzZWxmLmxpbmUucGhhc2UpIHsgLy8gUmVtb3ZlIGFuZCByZXByY2VzcyAgbGF0ZXJcbiAgICAgICAgICAgICAgICBwb3N0cG9uZWREaXNjb3VudHMucHVzaChsKTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkc1tpXSA9IHRyZWUuY2hpbGRzW3RyZWUuY2hpbGRzLmxlbmd0aC0xXTtcbiAgICAgICAgICAgICAgICB0cmVlLmNoaWxkcy5wb3AoKTtcbiAgICAgICAgICAgICAgICBpLT0xO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcHBsaWVkRGlzY291bnRzLnB1c2gobCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYXBwbGllZFJ1bGVzID0gXy5maWx0ZXIoc2VsZi5saW5lLnJ1bGVzLCBydWxlRG9lc0FwcGx5KTtcblxuICAgIC8vIFRoaXMgaGFzaCBjb250YWlucyB0aGUgYmVzdCBkaXNjb3VudCBmb3IgZWFjaCBsaW5lIGFuZCBkYXlcbiAgICAvLyBkaXNjb3VudFBlckRheVsnM3wxODQ3NSddPSAxNSBNZWFucyB0aGF0IHRoZSBsaW5lIHRyZWVbM10gd2lsbCBhcHBseXNcbiAgICAvLyBhIDE1JSBkaXNjb3VudCBhdCBkYXkgMTg0NzVcbiAgICB2YXIgZGlzY291bnRQZXJEYXkgPSB7fTtcbiAgICBfLmVhY2goYXBwbGllZFJ1bGVzLCBmdW5jdGlvbihydWxlKSB7XG4gICAgICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCwgbGluZUlkeCkgeyAvLyBUT0RPIG1pcmFyIHRvdCBsJ2FyYnJlXG4gICAgICAgICAgICBpZiAobC5jbGFzcyAhPT0gXCJMSU5FXCIpIHJldHVybjtcbiAgICAgICAgICAgIGlmICghIF8uY29udGFpbnMobC5hdHRyaWJ1dGVzLCBydWxlLmFwcGx5SWRDb25jZXB0QXR0cmlidXRlLnRvU3RyaW5nKCkpKSByZXR1cm47XG4gICAgICAgICAgICBfLmVhY2goZGF5c0luUnVsZShsLCBydWxlKSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIHZhciBrPSBsaW5lSWR4Kyd8JytkO1xuXG4gICAgICAgICAgICAgICAgdmFyIGRzYyA9IC0gcnVsZS5hcHBseURpc2NvdW50UEMgKiAgbC5xdWFudGl0eSAqICBsLmJhc2VQcmljZSAvIDEwMDtcbiAgICAgICAgICAgICAgICBfLmVhY2goYXBwbGllZERpc2NvdW50cywgZnVuY3Rpb24ob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEgXy5jb250YWlucyhvZC5hdHRyaWJ1dGVzLCBydWxlLmFwcGx5SWRDb25jZXB0QXR0cmlidXRlLnRvU3RyaW5nKCkpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIGlmIChvZC5kaXNjb3VudFBlckRheVtrXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZHNjID0gZHNjIC0gIG9kLmRpc2NvdW50UGVyRGF5W2tdICogcnVsZS5hcHBseURpc2NvdW50UEMvMTAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWRpc2NvdW50UGVyRGF5W2tdKSBkaXNjb3VudFBlckRheVtrXT0wO1xuICAgICAgICAgICAgICAgIGRpc2NvdW50UGVyRGF5W2tdID0gTWF0aC5taW4oZGlzY291bnRQZXJEYXlba10sIGRzYyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgdmF0ID0wO1xuICAgIHZhciBiYXNlID0wO1xuICAgIHZhciB0b3RhbEltcG9ydCA9MDtcblxuICAgIC8vIHRvYWxlSW1wb3J0IGFuZCBiYXNlIGFyZSB0aGUgdG90YWwgYW1vdW50cyBvZiBkaXNjb3VudHMgdGhhdCBhcmUgYXBwbGllZFxuICAgIC8vIFRoZSBWQVQgaXMgYSBwb25kZXJhdGVkIGF2ZXJhZ2Ugb2YgYWxsIHRoZSBsaW5lcyB0aGVyIHRoZSBkaXNjb3VudCBhcHBsaWVzLlxuXG4gICAgXy5lYWNoKHRyZWUuY2hpbGRzLCBmdW5jdGlvbihsLCBsaW5lSWR4KSB7XG4gICAgICAgIGlmIChsLmRpc2NvdW50UGVyRGF5KSByZXR1cm47XG4gICAgICAgIHZhciBkc2M9MDtcbiAgICAgICAgXy5lYWNoKGRheXNJbkxpbmUobCksIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHZhciBrPSBsaW5lSWR4Kyd8JytkO1xuICAgICAgICAgICAgaWYgKGRpc2NvdW50UGVyRGF5W2tdKSB7XG4gICAgICAgICAgICAgICAgZHNjICs9IGRpc2NvdW50UGVyRGF5W2tdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgbFZhdCA9IDA7XG4gICAgICAgIF8uZWFjaChsLnRheGVzLCBmdW5jdGlvbih0YXgpIHtcbiAgICAgICAgICAgIGlmICh0YXgudHlwZSA9PT0gXCJWQVRcIikge1xuICAgICAgICAgICAgICAgIGxWYXQgPSB0YXguUEM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgoYmFzZSArIGRzYykgIT09IDApIHtcbiAgICAgICAgICAgIHZhdCA9ICh2YXQqYmFzZSArIGxWYXQqZHNjKSAvIChiYXNlICsgZHNjKTtcbiAgICAgICAgfVxuICAgICAgICBiYXNlID0gYmFzZSArIGRzYztcbiAgICAgICAgaWYgKGwuYmFzZUltcG9ydCkge1xuICAgICAgICAgICAgdG90YWxJbXBvcnQgPSB0b3RhbEltcG9ydCArIGwuaW1wb3J0ICogZHNjL2wuYmFzZUltcG9ydDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIGJlc3RMaW5lID0gXy5jbG9uZShzZWxmLmxpbmUpO1xuXG4gICAgYmVzdExpbmUuYmFzZUltcG9ydCA9IGJhc2U7XG4gICAgYmVzdExpbmUuYmFzZVByaWNlID0gYmFzZTtcbiAgICBiZXN0TGluZS5pbXBvcnQgPSB0b3RhbEltcG9ydDtcbiAgICBiZXN0TGluZS5xdWFudGl0eSA9IDE7XG4gICAgYmVzdExpbmUuY2xhc3MgPSBcIkxJTkVcIjtcbiAgICBiZXN0TGluZS5zdWJvcmRlciA9IHNlbGYuZXhlY1N1Ym9yZGVyO1xuICAgIGJlc3RMaW5lLmRpc2NvdW50UGVyRGF5ID0gZGlzY291bnRQZXJEYXk7XG5cbiAgICBiZXN0TGluZS50YXhlcyA9IGJlc3RMaW5lLnRheGVzIHx8IFtdO1xuXG4gICAgdmFyIHRheCA9IF8uZmluZFdoZXJlKGJlc3RMaW5lLnRheGVzLHt0eXBlOiBcIlZBVFwifSk7XG4gICAgaWYgKCF0YXgpIHtcbiAgICAgICAgdGF4ID0ge1xuICAgICAgICAgICAgdHlwZTogXCJWQVRcIlxuICAgICAgICB9O1xuICAgICAgICBiZXN0TGluZS50YXhlcy5wdXNoKHRheCk7XG4gICAgfVxuICAgIHRheC5QQyA9IHZhdDtcblxuICAgIC8vIEZpbmQgdGhlIGJlc3QgZGlzY291bnQgY29uY2VwdCBpbiB0aGUgc2FtZSBwaGFzZS5cblxuICAgIHNhbWVQaGFzZURpc2NvdW50cy5wdXNoKGJlc3RMaW5lKTtcblxuICAgIHZhciBiZXN0TGluZUluUGhhc2UgPSBfLnJlZHVjZShzYW1lUGhhc2VEaXNjb3VudHMsIGZ1bmN0aW9uKGJlc3RMaW5lLCBsaW5lKSB7XG4gICAgICAgIGlmICghbGluZSkgcmV0dXJuIGJlc3RMaW5lO1xuICAgICAgICByZXR1cm4gKGxpbmUuaW1wb3J0IDwgYmVzdExpbmUuaW1wb3J0KSA/IGxpbmUgOiBiZXN0TGluZTtcbiAgICB9KTtcblxuICAgIGlmIChiZXN0TGluZUluUGhhc2UuaW1wb3J0ICE9PSAwKSB7XG4gICAgICAgIHRyZWUuY2hpbGRzLnB1c2goYmVzdExpbmVJblBoYXNlKTtcbiAgICB9XG5cbiAgICAvLyBGaW5hbHkgd2UgcmVhcGx5IHRoZSBkaXNjb3VudHMgb2YgZ3JlYXRlciBwaGFzZXMgdGhhdCB3dWVyZSBhcHBsaWVkIGJlZm9yZS5cblxuICAgIHBvc3Rwb25lZERpc2NvdW50cyA9IF8uc29ydEJ5KHBvc3Rwb25lZERpc2NvdW50cywgJ3BoYXNlJyk7XG5cbiAgICBfLmVhY2gocG9zdHBvbmVkRGlzY291bnRzLCBmdW5jdGlvbihsKSB7XG4gICAgICAgIHZhciBtb2RpZmllciA9IG5ldyBQcmljZURpc2NvdW50KGwpO1xuICAgICAgICBtb2RpZmllci5hcHBseSh0cmVlLCBvcHRpb25zKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VEaXNjb3VudDtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgUHJpY2VJbnN1cmFuY2UgPSBmdW5jdGlvbihsaW5lKSB7XG4gICAgdGhpcy5saW5lID0gbGluZTtcbiAgICB0aGlzLmV4ZWNPcmRlciA9IGxpbmUuZXhlY09yZGVyIHx8IDg7XG59O1xuXG5QcmljZUluc3VyYW5jZS5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbCA9IF8uY2xvbmUodGhpcy5saW5lKTtcblxuXG4gICAgdmFyIGJhc2UgPSAwO1xuICAgIF8uZWFjaCh0cmVlLmNoaWxkcywgZnVuY3Rpb24obCkge1xuICAgICAgICBiYXNlICs9IGwuaW1wb3J0O1xuICAgIH0pO1xuXG4gICAgdmFyIHByaWNlO1xuICAgIGlmICh0eXBlb2Ygc2VsZi5saW5lLnByaWNlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIHByaWNlID0gc2VsZi5saW5lLnByaWNlO1xuICAgIH0gZWxzZSBpZiAoICh0eXBlb2Ygc2VsZi5saW5lLnByaWNlPT09XCJvYmplY3RcIikgJiYgKHNlbGYubGluZS5wcmljZS50eXBlID09PSAnUEVSJykgKSB7XG4gICAgICAgIHByaWNlID0gYmFzZSAqIHNlbGYubGluZS5wcmljZS5wcmljZVBDLzEwMDtcbiAgICAgICAgaWYgKHByaWNlPHNlbGYubGluZS5wcmljZS5wcmljZU1pbikgcHJpY2UgPSBzZWxmLmxpbmUucHJpY2UucHJpY2VNaW47XG4gICAgfSBlbHNlIGlmICggKHR5cGVvZiBzZWxmLmxpbmUucHJpY2U9PT1cIm9iamVjdFwiKSAmJiAoc2VsZi5saW5lLnByaWNlLnR5cGUgPT09ICdFU0MnKSApIHtcbiAgICAgICAgcHJpY2U9TnVtYmVyLk1BWF9WQUxVRTtcbiAgICAgICAgXy5lYWNoKHNlbGYubGluZS5wcmljZS5zY2FsZVByaWNlcywgZnVuY3Rpb24oc3ApIHtcbiAgICAgICAgICAgIGlmICgoYmFzZSA8PSBzcC5zdGF5UHJpY2VNYXgpICYmIChzcC5wcmljZSA8IHByaWNlKSkge1xuICAgICAgICAgICAgICAgIHByaWNlID0gc3AucHJpY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAocHJpY2UgPT09IE51bWJlci5NQVhfVkFMVUUpIHtcbiAgICAgICAgICAgIHByaWNlID0gTmFOO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBsLmltcG9ydCA9IHByaWNlO1xuICAgIGwuYmFzZUltcG9ydCA9IHByaWNlO1xuICAgIGwuYmFzZVByaWNlID0gcHJpY2U7XG4gICAgbC5xdWFudGl0eSA9IDE7XG5cbiAgICB0cmVlLmNoaWxkcy5wdXNoKGwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcmljZUluc3VyYW5jZTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKmpzbGludCBub2RlOiB0cnVlICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF89KHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgUHJpY2VMaW5lID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCAwO1xufTtcblxuUHJpY2VMaW5lLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbih0cmVlKSB7XG4gICAgdmFyIGwgPSBfLmNsb25lKHRoaXMubGluZSk7XG5cbiAgICB2YXIgcHJpY2UgPSBsLnByaWNlO1xuXG4gICAgbC5pbXBvcnQgPSBsLnByaWNlICogbC5xdWFudGl0eTtcbiAgICBpZiAoIWlzTmFOKGwucGVyaW9kcykpIHtcbiAgICAgICAgbC5pbXBvcnQgPSBsLmltcG9ydCAqIGwucGVyaW9kcztcbiAgICB9XG5cbiAgICBpZiAobC5kaXNjb3VudCkge1xuICAgICAgICBsLmltcG9ydCA9IGwuaW1wb3J0ICogKDEgLSBsLmRpc2NvdW50LzEwMCk7XG4gICAgfVxuXG4gICAgbC5iYXNlSW1wb3J0ID0gbC5pbXBvcnQ7XG4gICAgbC5iYXNlUHJpY2UgPSBsLnByaWNlO1xuXG4gICAgdHJlZS5jaGlsZHMucHVzaChsKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJpY2VMaW5lO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qanNsaW50IG5vZGU6IHRydWUgKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgXz0odHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG52YXIgcm91bmQgPSByZXF1aXJlKCcuL3JvdW5kJyk7XG5cbnZhciBQcmljZVZhdEluY2x1ZGVkID0gZnVuY3Rpb24obGluZSkge1xuICAgIHRoaXMubGluZSA9IGxpbmU7XG4gICAgdGhpcy5leGVjT3JkZXIgPSBsaW5lLmV4ZWNPcmRlciB8fCA3O1xufTtcblxuUHJpY2VWYXRJbmNsdWRlZC5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24odHJlZSkge1xuXG4gICAgZnVuY3Rpb24gYXBwbHlWYXROb2RlKG5vZGUpIHtcbiAgICAgICAgXy5lYWNoKG5vZGUudGF4ZXMsIGZ1bmN0aW9uKHRheCkge1xuICAgICAgICAgICAgaWYgKHRheC50eXBlID09PSBcIlZBVFwiKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5pbXBvcnQgPSByb3VuZChub2RlLmJhc2VJbXBvcnQgKiAoMSArIHRheC5QQy8xMDApLFwiUk9VTkRcIiwgMC4wMSk7XG4gICAgICAgICAgICAgICAgbm9kZS5wcmljZSA9IG5vZGUuYmFzZVByaWNlICogKDEgKyB0YXguUEMvMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIF8uZWFjaChub2RlLmNoaWxkcywgYXBwbHlWYXROb2RlKTtcbiAgICB9XG5cbiAgICBhcHBseVZhdE5vZGUodHJlZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByaWNlVmF0SW5jbHVkZWQ7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLypqc2xpbnQgbm9kZTogdHJ1ZSAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcm91bmQodmFsLCByb3VuZGluZ1R5cGUsIHJvdW5kaW5nKSB7XG4gICAgdmFyIHY7XG4gICAgaWYgKCghcm91bmRpbmdUeXBlKSB8fCAocm91bmRpbmdUeXBlID09PSBcIk5PTkVcIikpIHtcbiAgICAgICAgdiA9IE1hdGgucm91bmQodmFsIC8gMC4wMSkgKiAwLjAxO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMSkgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJGTE9PUlwiKSkge1xuICAgICAgICB2PSBNYXRoLmZsb29yKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMikgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJST1VORFwiKSkge1xuICAgICAgICB2PSBNYXRoLnJvdW5kKHZhbCAvIHJvdW5kaW5nKSAqIHJvdW5kaW5nO1xuICAgIH0gZWxzZSBpZiAoKHJvdW5kaW5nVHlwZSA9PT0gMykgfHwgKHJvdW5kaW5nVHlwZSA9PT0gXCJDRUlMXCIpKSB7XG4gICAgICAgIHY9IE1hdGguY2VpbCh2YWwgLyByb3VuZGluZykgKiByb3VuZGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHJvdW5kaW5nVHlwZTogcm91bmRpbmdUeXBlXCIpO1xuICAgIH1cbiAgICByZXR1cm4gKyhNYXRoLnJvdW5kKHYgKyBcImUrOFwiKSAgKyBcImUtOFwiKTtcbn07XG4iXX0=
