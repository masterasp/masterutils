/*jslint node: true */
"use strict";

var _=require('lodash');

/*

Agregate Modifier
=================

    groupBy             Flag of the lines that should be replaced
    execOrder           Order in which this modifier i excevuted.

}

*/

var PriceAgregator = function(line) {
    this.line = line;
    this.execOrder = line.execOrder || 0;
    this.groupBy = line.groupBy;
};

PriceAgregator.prototype.modify = function(tree) {
    var self = this;
    var newNode = _.clone(this.line);
    newNode.childs = [];
    var i,l;
    for (i=0; i<tree.length; i+=1) {
        l=tree[i];
        if (_.contain(l.flags, self.groupBy)) {
            newNode.childs.push(l);
            tree[i] = tree[tree.length-1];
            tree.pop();
        }
    }
    tree.push(newNode);
};

module.exports = PriceAgregator;


