/*jslint node: true */
"use strict";

var _ = require('lodash');

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




