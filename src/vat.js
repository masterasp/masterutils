/*jslint node: true */
"use strict";

var _=require('lodash');

var PriceVat = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 7;
    this.id = line.id || "vat";
    this.label = line.label || "@VAT";
    this.order = line.order || 9;
};

PriceVat.prototype.modify = function(tree) {

    var self = this;
    var ac = 0;

    function applyVatNode(node) {
        _.each(node.taxes, function(tax) {
            if (tax.type === "VAT") {
                ac += node.import * (tax.PC/100);
            }
        });
        _.each(node.childs, applyVatNode);
    }

    applyVatNode(tree);

    var l= {
        id: self.id,
        label: self.label,
        import: ac,
        order: self.order
    };

    tree.childs.push(l);
};

module.exports = PriceVat;
