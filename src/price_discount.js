/*jslint node: true */
"use strict";

var _=require('lodash');
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
            if (! _.contains(l.attributes, rule.applyIdConceptAttribute)) return;
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
