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
    this.execOrder = line.execOrder || 9;
    this.groupBy = line.groupBy;
    if ( ! (this.groupBy instanceof  Array)) {
        this.groupBy = [ this.groupBy ];
    }
};

PriceAgregator.prototype.modify = function(tree) {
    var self = this;
    var newNode = _.clone(this.line);
    newNode.childs = [];

    if (!self.groupBy) return;

    if (! (self.groupBy instanceof Array)) {
        self.groupBy = [self.groupBy];
    }
    if (! (self.groupBy[0] instanceof Array)) {
        self.groupBy = [self.groupBy];
    }

    function match(l) {
        return !!_.find(self.groupBy, function(groupBy) {
            return _.intersection(l.attributes, groupBy).length === groupBy.length;
        });
    }



    var i,l;
    for (i=0; i<tree.childs.length; i+=1) {
        l=tree.childs[i];

        if (match(l)) {
            newNode.childs.push(l);
            tree.childs[i] = tree.childs[tree.childs.length-1];
            tree.childs.pop();
            i-=1;
        }
    }
    tree.childs.push(newNode);
};

module.exports = PriceAgregator;


