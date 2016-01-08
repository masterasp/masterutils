/*jslint node: true */
"use strict";

var _=require('lodash');
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
        imp = import *bestInterval.pc/100;
    } else {
        imp = 0;
    }
    if (bestInterval.import) {
        imp += bestInterval.import;
    }
    return imp;
}

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
    bestLine.import = priceInterval(self.line.intervals,  totalImport);
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
