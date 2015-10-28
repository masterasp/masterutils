/*jslint node: true */
"use strict";

var _=require('lodash');

var PriceVatIncluded = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 8;
};

PriceVatIncluded.prototype.modify = function(tree) {

    function applyVatNode(node) {
        _.each(node.taxes, function(tax) {
            if (tax.type === "VAT") {
                node.import = node.import * (1 + tax.PC/100);
                node.price = node.price * (1 + tax.PC/100);
            }
        });
        _.each(node.childs, applyVatNode);
    }

    applyVatNode(tree);
};

module.exports = PriceVatIncluded;
