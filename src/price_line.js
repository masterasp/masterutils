/*jslint node: true */
"use strict";

var _=require('lodash');

var PriceLine = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 0;
};

PriceLine.prototype.modify = function(tree) {
    tree.push(_.clone(this.line));
};

module.exports = PriceLine;
