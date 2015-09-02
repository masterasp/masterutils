/*jslint node: true */
"use strict";

var _=require('lodash');
var round = require('./round');
var du = require('./date_utils');

var Price = function(lines) {
    if (!lines) lines =[];
    var self = this;

// Clone the array;
    self.lines = _.map(lines, _.clone);

    self.toJSON = function() {
        var obj = {};
        obj.lines = _.map(self.lines, _.clone);
        _.each(obj.lines, function(l) {
            if (typeof l.from === "number") l.from = du.int2date(l.from);
            if (typeof l.to === "number") l.to = du.int2date(l.to);
        });
        return obj;
    };

    self.lineImport = function(line, options) {
        options = options || {};
        options = _.extend({
            withTaxes: true,
            withDiscounts: true,
            rounded: true
        }, options);

        var lineImport = line.price * line.quantity;
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

    self.getImport = function(options) {
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

    self.addPrice = function(p) {
        if (!p) return;
        _.each(p.lines, function(l) {
            self.lines.push(_.clone(l));
        });
    };

};

module.exports = Price;
