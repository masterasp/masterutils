/*jslint node: true */
"use strict";

const _ = require('lodash');
const PriceLine = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 0;
};

PriceLine.prototype.modify = function(tree) {
    const l = _.clone(this.line);

    l.import = l.price * l.quantity;

    if (l.discount) {
        l.import = l.import * (1 - l.discount/100);
    }

    if (l.periods !== null && !isNaN(l.periods)) {
        l.import = l.import * l.periods;
    }

    if (l.nightsDiscount) {
        l.import = l.import - (l.price * l.nightsDiscount);
    }

    l.baseImport = l.import;
    l.basePrice = l.price;

    tree.childs.push(l);
};

module.exports = PriceLine;
