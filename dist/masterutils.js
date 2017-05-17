(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _=(typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var du = require('./date_utils');

exports.trim = function(m, intDate) {

    m.firstBookableDate = du.date2int(m.firstBookableDate);
    while ((m.matrix.length>1) && (m.matrix[0] === 0)) {
        m.matrix.shift();
        m.firstBookableDate += 1;
    }

    while ((m.matrix.length>1) && (m.matrix[m.matrix.length-1] === 0)) {
        m.matrix.pop();
    }

    if (!intDate) {
        m.firstBookableDate = du.int2date(m.firstBookableDate);
    }

};


exports.AND = function(m1, m2, intDate) {
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

    exports.trim(out, intDate);
    if (!intDate) {
        out.firstBookableDate = du.int2date(out.firstBookableDate);
    }

    return out;
};

exports.OR = function(m1, m2, intDate) {
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

    exports.trim(out, intDate);
    if (!intDate) {
        out.firstBookableDate = du.int2date(out.firstBookableDate);
    }


    return out;
};

exports.ZERO = function(intDate) {
    if (intDate) {
        return {
            firstBookableDate: du.today(),
            matrix: [0]
        };
    } else {
        return {
            firstBookableDate: du.int2date(du.today()),
            matrix: [0]
        };
    }
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
        availabilityMatrix: require('./availability_matrix.js'),
        personArrayUtils: require('./person_array_utils.js')
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
},{"./availability_matrix.js":1,"./creditcard.js":2,"./date_utils.js":3,"./person_array_utils.js":5,"./price2.js":6,"./round.js":11}],5:[function(require,module,exports){
(function (global){
/*jslint node: true */
"use strict";

var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

exports.defaultAges = {
    maxBabyAge: 2,
    maxChildAge: 12,
    minAdultAge: 18,
    minRetiredAge: 65
};

exports.getPossibilities = function(possibleAges, fits) {
    possibleAges.sort(function(a,b) {
        return b[0] - a[0];
    });

    var possibilities = [];

    function fill(possibility) {

        var i;

        // Calculate a set of ages of the lower bound of each limit
        var ages = possibility.map(function(p) {
            return p[0];
        });
        if (!fits(ages)) return;
        possibilities.push(possibility);
        var idx = _.findIndex(possibleAges,function(limits) {
            return possibility[possibility.length-1][0] === limits[0];
        });
        for (i=idx; i<possibleAges.length; i+=1) {
            var newPossibility = _.cloneDeep(possibility);
            newPossibility.push(_.cloneDeep(possibleAges[i]));
            fill(newPossibility);
        }
    }

    var i;
    for (i=0; (i<possibleAges.length)&&(possibleAges[i][1]>=18); i+=1) {
        var newPossibility = [ _.cloneDeep(possibleAges[i]) ];
        fill(newPossibility );
    }

    return possibilities;
};

exports.str2ages = function(S) {
    var res = [];

    var arr;
    if (typeof S === "string") {
        arr = S.split(',');
    } else if (S instanceof Array) {
        arr = S;
    } else {
        return res;
    }

    var i;
    for (i = 0; i < arr.length; i += 1) {
        switch (arr[i]) {
            case 'A':
            case '18+':
                res.push(exports.defaultAges.minAdultAge);
                break;
            case 'R':
            case '65+':
                res.push(exports.defaultAges.minRetiredAge);
                break;
            case 'B':
                res.push(0);
                break;
            case 'C':
                res.push(exports.defaultAges.maxBabyAge+1);
                break;
            case 'T':
                res.push(exports.defaultAges.minAdultAge -1);
                break;
            default:
                var age = parseInt(arr[i]);
                if (!isNaN(age))  {
                    res.push(age);
                }
        }
    }
    return res;
};


exports.personsInRange = function(guestAges, minAge, maxAge) {
    var n =0;
    try {
        var arr;
        if (/^[ARTCB]+$/.exec(guestAges)) {
            arr = guestAges.split('');
        } else {
            arr = guestAges.split(',');
        }
        var i;
        for (i = 0; i < arr.length; i += 1) {
            var age;
            switch (arr[i]) {
                case 'A':
                case '18+':
                    age = exports.defaultAges.minAdultAge;
                    break;
                case 'R':
                case '65+':
                    age = exports.defaultAges.minRetiredAge;
                    break;
                case 'B':
                    age = 0;
                    break;
                case 'C':
                    age = exports.defaultAges.maxChildAge;
                    break;
                case 'T':
                    age = exports.defaultAges.maxChildAge +1;
                    break;
                default:
                    age = parseInt(arr[i]);
                    if (isNaN(age)) return 0;
            }
            if ((age>=minAge) && (age<=maxAge)) n +=1;
        }
    } catch(err) {
        return 0;
    }
    return n;
};

exports.fits = function(guestAges, maxAdults, maxChilds, maxBabies, maxChildAge, maxBabyAge) {
    var self = this;
    var a = maxAdults || 0;
    var b = maxBabies || 0;
    var c = maxChilds || 0;

    var tmpGuestAges = _.clone(guestAges);

    tmpGuestAges.sort(function(a,b) {
        return a-b;
    });

    var i;
    for (i =0; i< tmpGuestAges.length; i+=1) {
        if (tmpGuestAges[i] <= maxBabyAge) {
            if (b>0) {
                b -= 1;
            } else {
                return false;
            }
        } else if (tmpGuestAges[i] <= maxChildAge) {
            if (c>0) {
                c -= 1;
            } else if (a>0) {
                a -= 1;
            } else {
                return false;
            }
        } else {
            if (a>0) {
                a -= 1;
            } else {
                return false;
            }
        }
    }

    return true;
};

exports.personSets2index = function(personArraySet) {
    var result = {
        age2personType: new Array(100),
        association2index: {}
    };

    var range2letter = {};
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var nextLetter = 0;

    _.each(personArraySet, function(set, setIndex) {
        _.each(set, function(possibility) {
            var possibilityStr = "";
            _.each(possibility, function(range) {
                var k= range[0]+'-'+range[1];
                if (!range2letter[k]) {
                    range2letter[k] = letters[nextLetter];
                    nextLetter +=1;
                    var i;
                    for (i=range[0] ; i<= range[1]; i++) {
                        result.age2personType[i] = range2letter[k];
                    }
                }
                possibilityStr += range2letter[k];
            });
            result.association2index[possibilityStr] = setIndex;
        });
    });

    result.age2personType = result.age2personType.join("");

    var k = result.age2personType.length;
    while ((k>1) && (result.age2personType[k-1] === result.age2personType[k-2])) k -= 1;

    result.age2personType = result.age2personType.substring(0, k);

    return result;
};





}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
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
    "CALCPRICE": require("./price_calcprice.js"),
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

Price2.prototype.addPrice = function(p, attr) {
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
        var newLine = _.clone(l);
        if (attr) {
            l.attributes.push(attr);
        }
        self.lines.push(newLine);
    });
    self.treeValid=false;
};

Price2.prototype.constructTree = function(parentOptions) {

    var self = this;

    function sortTree(node) {
        if (node.childs) {
            node.childs = _.sortByAll(node.childs, ["order", "suborder"]);
            _.each(node.childs, sortTree);
        }
    }





//    if (self.treeValid) {
//        return self.total;
//    }

    self.total = {
        id: "total",
        label: "@Total",
        childs: [],

        showIfZero: true,
        totalOnBottom: true
    };

    if (parentOptions) {
        _.extend(self.total, parentOptions);
    }

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


Price2.prototype.renderTree = function(id, filter, parentOptions) {

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

        var newNode = _.cloneDeep(node);


        if (newNode.childs) {
            newNode.childs = [];

            newNode.import = 0;
            _.each(node.childs, function(childNode) {
                newNode.import += renderTreeNode(childNode, newNode);
            });
        }

        if ((!newNode.units) &&(  round(newNode.price, "ROUND", 0.01)  === newNode.import)) {
            delete newNode.price;
        }


        var renderTotal = true;
        var renderDetail = true;
        if ((!newNode.showIfZero) && (!newNode.quantity) && (!newNode.import)) renderTotal = false;
        if ((newNode.childs)&&(newNode.childs.length === 1)&&(!newNode.hideDetail)) {
            if (newNode.ifOneHideParent) renderTotal = false;
            if (newNode.ifOneHideChild) renderDetail = false;
        }
        if ((newNode.childs)&&(newNode.childs.length === 0)&&(newNode.hideIfNoChilds)) {
            renderTotal =false;
            renderDetail = false;
        }
        if (newNode.hideDetail) renderDetail= false;
        if (newNode.hideTotal) renderTotal=false;


        //            newNode.parent = parentNode;

        if (!renderDetail) {
            delete newNode.childs;
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

        return newNode.import || 0;

    }

    function setLevel(node, level) {
        node.level = level;
        _.each(node.childs, function(n) {
            setLevel(n, level+1);
        });
    }

    self.constructTree(parentOptions);

    var node = findNode(self.total, id);



    renderTreeResult = null;

    renderTreeNode(node, null);

    calcTotals(renderTreeResult, filter);

    setLevel(renderTreeResult, 0);

    return renderTreeResult;
};


Price2.prototype.render = function(id, filter, parentOptions) {
    var renderResult;
    var self = this;


    function renderNode(node, level) {

        var newNode = _.clone(node);
        delete newNode.childs;
        delete newNode.showIfZero;
        delete newNode.hideDetail;
        delete newNode.hideTotal;
        delete newNode.ifOneHideParent;
        delete newNode.ifOneHideChild;
        newNode.level = level;

        if (!node.totalOnBottom) {
            renderResult.push(newNode);
        }

        _.each(node.childs, function(childNode) {
            renderNode(childNode, level +1);
        });

        if (node.totalOnBottom) {
            renderResult.push(newNode);
        }
    }


    var tree = self.renderTree(id, filter, parentOptions);

    renderResult = [];

    renderNode(tree, 0);

    return renderResult;
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

Price2.prototype.getImport = function(id, filter) {
    var self = this;
    id = id || "total";

    var topNode= self.renderTree(id, filter);

    if (topNode) {
        return topNode.import;
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

Price2.attrFilter = function(attr) {
    attr = attr.toString();
    return function(n) {
        if ((n.childs) ||
            (_.contains(n.attributes, attr))) {
            return true;
        } else {
            return false;
        }
    };
};


Price2.prototype.forEachLead = function(id, cb) {


    if (typeof id === "function") {
        cb = id;
        id = "total";
    }
    var self = this;
    self.constructTree();


    var node = findNode(self.total, id);

    function callEachNode(node) {
        if (!node.childs) return cb(node);
        _.each(node.childs, function (childNode) {
            callEachNode(childNode);
        });
    }

    callEachNode(node);
};

Price2.prototype.forEachLeadWithParent = function(id, cb) {

    function setParents(node) {
        node.parent = null;
        _.each(node.childs, function(c) {
            setParents(c);
            c.parent = node;
        });
    }

    function removeParents(node) {
        delete node.parent;
        _.each(node.childs, function(c) {
            removeParents(c);
            delete c.parent;
        });
    }

    if (typeof id === "function") {
        cb = id;
        id = "total";
    }
    var self = this;
    self.constructTree();


    var node = findNode(self.total, id);

    function callEachNode(node) {
        if (!node.childs) return cb(node);
        _.each(node.childs, function (childNode) {
            callEachNode(childNode);
        });
    }

    setParents(self.total);

    callEachNode(node);

    removeParents(self.total);
};





module.exports = Price2;


}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./date_utils":3,"./price_agregator.js":7,"./price_calcprice.js":8,"./price_line.js":9,"./price_vatincluded.js":10,"./round":11}],7:[function(require,module,exports){
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

    if (!self.groupBy) return;

    if (! (self.groupBy instanceof Array)) {
        self.groupBy = [self.groupBy];
    }
    if (! (self.groupBy[0] instanceof Array)) {
        self.groupBy = [self.groupBy];
    }

    function match(l) {
        return !!_.find(self.groupBy, function(groupBy) {
            return _.intersection(l.attributes, groupBy).length === groupBy.length;
        });
    }



    var i,l;
    for (i=0; i<tree.childs.length; i+=1) {
        l=tree.childs[i];

        if (match(l)) {
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
},{}],8:[function(require,module,exports){
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

function priceInterval(intervals, imp) {
    var bestInterval = _.reduce(intervals, function(best, interval) {
        if (!best) return interval;
        if ((interval.fromImport > best.fromImport) && (interval.fromImport <= imp)) return interval;
        return best;
    });
    if (!bestInterval) return imp;
    if (bestInterval.pc) {
        imp = imp *bestInterval.pc/100;
    } else {
        imp = 0;
    }
    if (bestInterval.import) {
        imp += bestInterval.import;
    }
    return imp;
}

var PriceCalcPrice = function(line) {
    this.line = line;
    this.execOrder = line.phase;

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


    function daysInRule(line, rule) {
        var a,b,i;
        var days = [];
        var lFrom = line.from ? du.date2int(line.from) : du.date2int(options.checkin);
        var lTo = line.to ? du.date2int(line.to) : du.date2int(options.checkout);
        if (_.contains(line.attributes,"DOWNPAYMENT")) {
            lFrom = du.date2int(options.checkin);
            lTo = du.date2int(options.checkout);
        }
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
        if (_.contains(line.attributes,"DOWNPAYMENT")) {
            lFrom = du.date2int(options.checkin);
            lTo = du.date2int(options.checkout);
        }
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
    var pricePerDayFixed = {};
    _.each(appliedRules, function(rule) {
        if (rule.applyPC) {
            _.each(tree.childs, function(l, lineIdx) { // TODO mirar tot l'arbre
                if (l.class !== "LINE") return;
                if (! _.contains(l.attributes, rule.applyIdConceptAttribute.toString())) return;
                var dr = daysInRule(l, rule);
                _.each(dr, function(d) {
                    var k= lineIdx+'|'+d;

                    var basePrice = l.price;
                    if (typeof l.discount === "number") {
                        basePrice = basePrice * (1 - l.discount/100);
                    }
                    if (typeof l.quantity === "number") basePrice = basePrice * l.quantity;
                    if (typeof l.periods !== "number") {
                        basePrice = basePrice / dr.length;
                    }

                    var prc = rule.applyPC *  basePrice / 100;
                    _.each(appliedCalcPrices, function(od) {
                        if (! _.contains(od.attributes, rule.applyIdConceptAttribute.toString())) return;
                        if (od.pricePerDay[k]) {
                            prc = prc +  od.pricePerDay[k] * rule.applyPC/100;
                        }
                    });

                    if (typeof pricePerDay[k] === "undefined") {
                        pricePerDay[k]=prc;
                    } else {
                        pricePerDay[k] = Math.min(pricePerDay[k], prc);
                    }
                });
            });
        }
        if (rule.applyPrice) {
            var dr = daysInRule(self.line, rule);
            _.each(dr, function(d) {
                if (typeof pricePerDayFixed[d] === "undefined") {
                    pricePerDayFixed[d]=rule.applyPrice;
                } else {
                    pricePerDayFixed[d] = Math.min(rule.applyPrice, pricePerDayFixed[d]);
                }
            });
        }
    });

    var base =0;

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

        base = base + prc;
    });

    _.each(daysInLine(self.line), function(d) {
        var prc = pricePerDayFixed[d] || 0;

        base = base + prc;
    });

    var bestLine = _.clone(self.line);
    base  = priceInterval(self.line.intervals,  base);

    bestLine.baseImport = base;
    bestLine.basePrice = base;
    bestLine.import = base;
    if(!bestLine.price) bestLine.price = base;
    bestLine.quantity = 1;
    bestLine.class = "LINE";
    bestLine.suborder = self.execSuborder;
    bestLine.pricePerDay = Object.keys(pricePerDay).length > 0 ? pricePerDay : null;

    bestLine.taxes = bestLine.taxes || [];

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
},{"./date_utils.js":3}],9:[function(require,module,exports){
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
    if (l.periods !== null && !isNaN(l.periods)) {
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
                _.each(node.pricePerDay, function(p, idx) {
                    node.pricePerDay[idx] = node.pricePerDay[idx] * (1 + tax.PC/100);
                });
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