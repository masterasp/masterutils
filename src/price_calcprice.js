/*jslint node: true */
"use strict";

var _ = require('lodash');
var du = require("./date_utils.js");

/*

CalcPrice Modifier
=================

    phase             Flag of the lines that should be replaced
    execOrder           Order in which this modifier i excevuted.
    rules              Array of rules



}

*/

function priceInterval(intervals, imp) {
    var bestInterval = _.reduce(intervals, function (best, interval) {
        if (!best) return interval;
        if ((interval.fromImport > best.fromImport) && (interval.fromImport <= imp)) return interval;
        return best;
    });
    if (!bestInterval) return imp;
    if (bestInterval.pc) {
        imp = imp * bestInterval.pc / 100;
    } else {
        imp = 0;
    }
    if (bestInterval.import) {
        imp += bestInterval.import;
    }
    return imp;
}

var PriceCalcPrice = function (line) {
    this.line = line;
    this.execOrder = line.phase;

};

PriceCalcPrice.prototype.modify = function (tree, options) {

    var self = this;

    function ruleDoesApply(rule) {
        var iReservation = du.date2int(options.reservation);
        if ((rule.reservationMin) && (iReservation < du.date2int(rule.reservationMin))) return false;
        if ((rule.reservationMax) && (iReservation > du.date2int(rule.reservationMax))) return false;
        var iCheckin = du.date2int(options.checkin);
        var iCheckout = du.date2int(options.checkout);
        if ((rule.daysBeforeCheckinMin) && (iCheckin - iReservation < rule.daysBeforeCheckinMin)) return false;
        if ((rule.daysBeforeCheckinMin || rule.daysBeforeCheckinMin === 0) && (iCheckin - iReservation > rule.daysBeforeCheckinMax)) return false;
        if ((rule.checkinMin) && (iCheckin < du.date2int(rule.checkinMin))) return false;
        if ((rule.checkinMax) && (iCheckin > du.date2int(rule.checkinMax))) return false;
        if ((rule.checkoutMin) && (iCheckout < du.date2int(rule.checkoutMin))) return false;
        if ((rule.checkoutMax) && (iCheckout > du.date2int(rule.checkoutMax))) return false;


        // We clculate an efective checkin/checkout taking in account the stayLengthFrom and stayLengthTo

        var efCheckout, efCheckin;
        if (rule.stayLengthFrom) {
            efCheckin = Math.max(iCheckin, du.date2int(rule.stayLengthFrom));
        } else {
            efCheckin = iCheckin;
        }
        if (rule.stayLengthTo) {
            efCheckout = Math.min(iCheckout, du.date2int(rule.stayLengthTo) + 1);
        } else {
            efCheckout = iCheckout;
        }
        var efLen = efCheckout - efCheckin;
        if (efLen > 0) {
            if ((rule.minStay) && (efLen < rule.minStay)) return false;
            if ((rule.maxStay || rule.maxStay === 0) && (efLen > rule.maxStay)) return false;
        } else {
            return false;
        }

        return true;
    }


    function daysInRule(line, rule) {
        var a, b, i;
        var days = [];
        var lFrom = line.from ? du.date2int(line.from) : du.date2int(options.checkin);
        var lTo = line.to ? du.date2int(line.to) : du.date2int(options.checkout);
        if (_.contains(line.attributes, "DOWNPAYMENT")) {
            lFrom = du.date2int(options.checkin);
            lTo = du.date2int(options.checkout);
        }
        var rFrom = rule.applyFrom ? du.date2int(rule.applyFrom) : lFrom;
        var rTo = rule.applyTo ? du.date2int(rule.applyTo) + 1 : lTo;

        a = Math.max(rFrom, lFrom);
        b = Math.min(rTo, lTo);

        for (i = a; i < b; i += 1) {
            days.push(i);
        }
        return days;
    }

    function daysInLine(line) {
        var i;
        var days = [];
        var lFrom = line.from ? du.date2int(line.from) : du.date2int(options.checkin);
        var lTo = line.to ? du.date2int(line.to) : du.date2int(options.checkout);
        if (_.contains(line.attributes, "DOWNPAYMENT")) {
            lFrom = du.date2int(options.checkin);
            lTo = du.date2int(options.checkout);
        }
        for (i = lFrom; i < lTo; i += 1) {
            days.push(i);
        }
        return days;
    }

    // Remove the prices with the same or greater phase.

    var samePhaseCalcPrices = [];
    var postponedCalcPrices = [];
    var appliedCalcPrices = [];

    var i, l;
    for (i = 0; i < tree.childs.length; i += 1) {
        l = tree.childs[i];
        var existsND = (_.find(l.rules, function (r) {
            return r.applyND > 0
        }) !== undefined);
        if (l.pricePerDay || existsND) {
            if (l.phase === self.line.phase) { // Remove and get the best
                samePhaseCalcPrices.push(l);
                tree.childs[i] = tree.childs[tree.childs.length - 1];
                tree.childs.pop();
                i -= 1;
            } else if (l.phase > self.line.phase) { // Remove and reprcess  later
                postponedCalcPrices.push(l);
                tree.childs[i] = tree.childs[tree.childs.length - 1];
                tree.childs.pop();
                i -= 1;
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
    var discountNights = 0;
    let daysOnDiscountNightsApplies = {};
    var mainConceptAttribute = '';

    _.each(appliedRules, function (rule) {
        if (rule.applyPC) {
            _.each(tree.childs, function (l, lineIdx) { // TODO mirar tot l'arbre
                if (l.class !== "LINE") return;
                if (!_.contains(l.attributes, rule.applyIdConceptAttribute.toString())) return;
                var dr = daysInRule(l, rule);
                _.each(dr, function (d) {
                    var k = lineIdx + '|' + d;

                    var basePrice = l.price;
                    if (typeof l.discount === "number") {
                        // basePrice = basePrice * (1 - l.discount / 100);
                    }
                    if (typeof l.quantity === "number") basePrice = basePrice * l.quantity;
                    if (typeof l.periods !== "number") {
                        basePrice = basePrice / dr.length;
                    }

                    var prc = rule.applyPC * basePrice / 100;
                    _.each(appliedCalcPrices, function (od) {
                        if (od.pricePerDay === undefined || od.pricePerDay === null) return;
                        if (!_.contains(od.attributes, rule.applyIdConceptAttribute.toString())) return;
                        if (od.pricePerDay[k]) {
                            prc = prc + od.pricePerDay[k] * rule.applyPC / 100;
                        }
                    });

                    if (typeof pricePerDay[k] === "undefined") {
                        pricePerDay[k] = prc;
                    } else {
                        pricePerDay[k] = Math.min(pricePerDay[k], prc);
                    }
                });
            });
        }
        if (rule.applyPrice) {
            var dr = daysInRule(self.line, rule);
            _.each(dr, function (d) {
                if (typeof pricePerDayFixed[d] === "undefined") {
                    pricePerDayFixed[d] = rule.applyPrice;
                } else {
                    pricePerDayFixed[d] = Math.min(rule.applyPrice, pricePerDayFixed[d]);
                }
            });
        }
        if (rule.applyND) {
            mainConceptAttribute = rule.applyIdConceptAttribute.toString();
            if (rule.applyND > discountNights) {
                discountNights = rule.applyND;
                daysOnDiscountNightsApplies = daysInRule(self.line, rule);
            }
        }
    });

    var base = 0;

    // totalImport and base are the total amounts of capcPrices that are applied
    // The VAT is a ponderated average of all the lines ther the calcPrice applies.

    _.each(tree.childs, function (l, lineIdx) {
        if (l.pricePerDay) return;
        var prc = 0;
        _.each(daysInLine(l), function (d) {
            var k = lineIdx + '|' + d;
            if (pricePerDay[k]) {
                prc += pricePerDay[k];
            }
        });

        base = base + prc;
    });

    _.each(daysInLine(self.line), function (d) {
        var prc = pricePerDayFixed[d] || 0;

        base = base + prc;
    });

    var iCheckin = du.date2int(options.checkin);
    var iCheckout = du.date2int(options.checkout);
    var basePricePerDay = new Array(iCheckout - iCheckin).fill(0);
    var basePricePerDayAsObject = {};

    _.each(tree.childs, function (l, lineIdx) {
        if (!_.contains(l.attributes, mainConceptAttribute.toString())) return;
        var dr = daysInLine(l);
        _.each(dr, function (d) {
            var basePrice = l.price;
            if (typeof l.discount === "number") {
                // basePrice = basePrice * (1 - l.discount / 100);
            }
            if (typeof l.quantity === "number") basePrice = basePrice * l.quantity;
            if (typeof l.periods !== "number") {
                basePrice = basePrice / dr.length;
            }

            basePricePerDay[d - iCheckin] += basePrice;

            if (basePricePerDayAsObject[d] == null) {
                basePricePerDayAsObject[d] = 0;
            }
            basePricePerDayAsObject[d] += basePrice;

        });
    });

    if (discountNights > 0) {
        const filteredDiscountDayByDay = daysOnDiscountNightsApplies.reduce((acc, discountAppliedDay) => {
            acc.push(basePricePerDayAsObject[discountAppliedDay]);
            return acc;
        }, []).sort(function (a, b) {
            return a - b
        });
        for (let i = 0; i < discountNights; i++) {
            base -= filteredDiscountDayByDay[i] == null ? 0 : filteredDiscountDayByDay[i];
        }
    }

    var bestLine = _.clone(self.line);
    base = priceInterval(self.line.intervals, base);

    bestLine.baseImport = base;
    bestLine.basePrice = base;
    bestLine.import = base;
    if (!bestLine.price) bestLine.price = base;
    bestLine.quantity = 1;
    bestLine.class = "LINE";
    bestLine.suborder = self.execSuborder;
    bestLine.pricePerDay = Object.keys(pricePerDay).length > 0 ? pricePerDay : null;

    bestLine.taxes = bestLine.taxes || [];

    // Find the best calcPrice concept in the same phase.

    samePhaseCalcPrices.push(bestLine);

    var bestLineInPhase = _.reduce(samePhaseCalcPrices, function (bestLine, line) {
        if (!line) return bestLine;
        return (line.import < bestLine.import) ? line : bestLine;
    });

    if (bestLineInPhase.import !== 0) {
        tree.childs.push(bestLineInPhase);
    }

    // Finaly we reaply the calcPrices of greater phases that wuere applied before.

    postponedCalcPrices = _.sortBy(postponedCalcPrices, 'phase');

    _.each(postponedCalcPrices, function (l) {
        var modifier = new PriceCalcPrice(l);
        modifier.apply(tree, options);
    });
};

module.exports = PriceCalcPrice;
