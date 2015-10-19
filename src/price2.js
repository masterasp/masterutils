/*jslint node: true */
"use strict";

var _=require('lodash');
var round = require('./round');

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
    "LINE": require("./price_line.js")
};

var Price2 = function(lines) {
    if (!lines) lines =[];

    // If another price (has lines)
    if (lines.lines) {
        lines = lines.lines;
    }

// Clone the array;
    this.lines = _.map(lines, _.clone);

    this.treeValid=false;
    this.renderValid=false;
};

Price2.prototype.addPrice = function(p) {
    var self = this;
    if (!p) return;
    var cp = _.clone(p);
    _.each(cp.lines, function(l) {
        self.lines.push(l);
    });
    this.treeValid=false;
    this.renderValid = false;
};


Price2.prototype.constructTree = function() {

    function sortTree(node) {
        if (node.childs) {
            _.sortBy(node.childs, ["order", "suborder"]);
            _.each(node.childs, sortTree);
        }
    }

    function calcTotal(node) {
        node.import = node.import || 0;
        if (node.childs) {
            _.each(node.childs, function(c) {
                node.import += calcTotal(c);
            });
        }
        return node.import;
    }

    function roundImports(node) {
        node.import = round(node.import, "ROUND", 0.01);
        _.each(node.childs, roundImports);
    }

    if (this.treeValid) {
        return this.total;
    }

    this.total = {
        id: "total",
        label: "@Total",
        childs: [],

        showIfZero: true,
        totalOnBottom: true
    };

    var modifiers = [];

    var i =0;

    _.each(this.lines, function(l) {
        l.suborder = i++;               // suborder is the original order. In case of tie use this.
        l.class = l.class || "LINE";
        if (!registeredModifiers[l.class]) {
            throw new Error("Modifier " + l.class + " not defined.");
        }
        var modifier = new registeredModifiers[l.class](l);
        modifiers.push(l);
    });

    modifiers = _.sortBy(modifiers, "execOrder");

    _.each(modifiers, function(m) {
        var modifier = new registeredModifiers[m.class](m);
        modifier.modify(this.root);
    });

    sortTree(this.root);

    calcTotal(this.root);
    roundImports(this.root);

    this.treeValid = true;
    return this.total;
};

Price2.prototype.render = function() {

    var self = this;
    this.render = [];


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


    function renderNode(node, level) {

        var renderTotal = true;
        var renderDetail = true;
        if ((!node.showIfZero) && (node.import === 0)) renderTotal = false;
        if ((node.childs)&&(node.childs.length === 1)) {
            if (node.ifOneHideParent) renderTotal = false;
            if (node.ifOneHideChild) renderDetail = false;
        }
        if (node.hideDetail) renderDetail= false;
        if (node.hideTotal) renderTotal=false;

        if ((renderTotal) && (!node.totalOnButton)) {
            node.level = level;
            self.render.push(node);
        }

        if (renderDetail) {
            _.each(node.childs, function(childNode) {
                renderNode(childNode, renderTotal ? level +1 : level);
            });
        }
        if ((renderTotal) && (node.totalOnButton)) {
            node.level = level;
            self.render.push(node);
        }
    }

    if (this.renderValid) {
        return this.render;
    }
    this.constructTree();

    renderNode(this.total);

    this.renderValid = true;
    return this.render;
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

Price2.prototype.getImport = function(id) {
    id = id || "total";
    this.constructTree();

    var node = findNode(this.total, id);

    if (node) {
        return node.import;
    } else {
        return 0;
    }
};





module.exports = Price2;

