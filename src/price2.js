/*jslint node: true */
"use strict";

var _=require('lodash');
var round = require('./round');
var du = require('./date_utils');

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
    "LINE": require("./price_line.js"),
    "VATINCLUDED": require("./price_vatincluded.js"),
    "CALCPRICE": require("./price_calcprice.js"),
};

var Price2 = function(p1, p2) {
    var self = this;
    self.lines = [];
    self.options = {};
    _.each(arguments, function(p) {
        if (p) {
            if ((typeof p === "object")&&(p.lines)) {
                _.each(p.lines, function(l) {
                    self.lines.push(_.clone(l));
                });
            } else if (p instanceof Array) {
                _.each(p, function(l) {
                    self.lines.push(_.clone(l));
                });
            } else if ((typeof p === "object")&&(p.class || p.label)) {
                self.lines.push(_.clone(p));
            } else if (typeof p === "object") {
                self.options = p;
            }
        }
    });

    self.treeValid=false;
};

Price2.prototype.addPrice = function(p, attr) {
    var self = this;
    if (!p) return;
    var cp;
    if ((typeof p === "object")&& (p.lines)) {
        cp = p.lines;
    } else if (cp instanceof Array) {
        cp = p;
    } else if (typeof p === "object") {
        cp = [p];
    }
    _.each(cp, function(l) {
        var newLine = _.clone(l);
        if (attr) {
            l.attributes.push(attr);
        }
        self.lines.push(newLine);
    });
    self.treeValid=false;
};

Price2.prototype.constructTree = function(parentOptions) {

    var self = this;

    function sortTree(node) {
        if (node.childs) {
            node.childs = _.sortByAll(node.childs, ["order", "suborder"]);
            _.each(node.childs, sortTree);
        }
    }





//    if (self.treeValid) {
//        return self.total;
//    }

    self.total = {
        id: "total",
        label: "@Total",
        childs: [],

        showIfZero: true,
        totalOnBottom: true
    };

    if (parentOptions) {
        _.extend(self.total, parentOptions);
    }

    var modifiers = [];

    var i =0;

    _.each(self.lines, function(l) {
        l.suborder = i++;               // suborder is the original order. In case of tie use this.
        l.class = l.class || "LINE";
        if (!registeredModifiers[l.class]) {
            throw new Error("Modifier " + l.class + " not defined.");
        }
        var modifier = new registeredModifiers[l.class](l);
        modifier.suborder = i;
        modifiers.push(modifier);
    });

    modifiers = _.sortByAll(modifiers, ["execOrder", "execSuborder", "suborder"]);

    _.each(modifiers, function(m) {
        m.modify(self.total, self.options);
    });

    sortTree(self.total);

    self.treeValid = true;
    return self.total;
};

function calcTotals(node, filter) {
    if (typeof node.childs !== "undefined") {
        node.import = 0;
        _.each(node.childs, function(c) {
            node.import += calcTotals(c, filter);
        });
    } else {
        node.import = node.import || 0;
    }
    node.import = round(node.import, "ROUND", 0.01);
    return node.import;
}


Price2.prototype.renderTree = function(id, filter, parentOptions) {

    if (typeof id === "function") {
        filter =id;
        id=null;
    }

    var self = this;
    id = id || "total";
    var renderTreeResult;
    if (!filter) filter = function() {return true;};



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


    function renderTreeNode(node, parentNode) {

        if (!filter(node)) return 0;

        var newNode = _.cloneDeep(node);


        if (newNode.childs) {
            newNode.childs = [];

            newNode.import = 0;
            _.each(node.childs, function(childNode) {
                newNode.import += renderTreeNode(childNode, newNode);
            });
        }

        if ((!newNode.units) &&(  round(newNode.price, "ROUND", 0.01)  === newNode.import)) {
            delete newNode.price;
        }


        var renderTotal = true;
        var renderDetail = true;
        if ((!newNode.showIfZero) && (!newNode.quantity) && (!newNode.import)) renderTotal = false;
        if ((newNode.childs)&&(newNode.childs.length === 1)&&(!newNode.hideDetail)) {
            if (newNode.ifOneHideParent) renderTotal = false;
            if (newNode.ifOneHideChild) renderDetail = false;
        }
        if ((newNode.childs)&&(newNode.childs.length === 0)&&(newNode.hideIfNoChilds)) {
            renderTotal =false;
            renderDetail = false;
        }
        if (newNode.hideDetail) renderDetail= false;
        if (newNode.hideTotal) renderTotal=false;


        //            newNode.parent = parentNode;

        if (!renderDetail) {
            delete newNode.childs;
        }


        if (renderTotal) {
            if (parentNode) {
                parentNode.childs.push(newNode);
            }

            if (parentNode === null) {
                renderTreeResult = newNode;
            }
        } else {
            if (!parentNode) {
                parentNode = {
                    childs: [],
                    hideTotal: true
                };
            }
            _.each(newNode.childs, function(n) {
                parentNode.childs.push(n);
            });
        }

        return newNode.import || 0;

    }

    function setLevel(node, level) {
        node.level = level;
        _.each(node.childs, function(n) {
            setLevel(n, level+1);
        });
    }

    self.constructTree(parentOptions);

    var node = findNode(self.total, id);



    renderTreeResult = null;

    renderTreeNode(node, null);

    calcTotals(renderTreeResult, filter);

    setLevel(renderTreeResult, 0);

    return renderTreeResult;
};


Price2.prototype.render = function(id, filter, parentOptions) {
    var renderResult;
    var self = this;


    function renderNode(node, level) {

        var newNode = _.clone(node);
        delete newNode.childs;
        delete newNode.showIfZero;
        delete newNode.hideDetail;
        delete newNode.hideTotal;
        delete newNode.ifOneHideParent;
        delete newNode.ifOneHideChild;
        newNode.level = level;

        if (!node.totalOnBottom) {
            renderResult.push(newNode);
        }

        _.each(node.childs, function(childNode) {
            renderNode(childNode, level +1);
        });

        if (node.totalOnBottom) {
            renderResult.push(newNode);
        }
    }


    var tree = self.renderTree(id, filter, parentOptions);

    renderResult = [];

    renderNode(tree, 0);

    return renderResult;
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

Price2.prototype.getImport = function(id, filter) {
    var self = this;
    id = id || "total";

    var topNode= self.renderTree(id, filter);

    if (topNode) {
        return topNode.import;
    } else {
        return 0;
    }
};

Price2.prototype.addAttributes = function(atribute) {
    var self=this;
    var attrs;
    if (typeof atribute === "string" ) {
        attrs = [atribute];
    } else if (atribute instanceof Array) {
        attrs = atribute;
    } else {
        throw new Error("Invalid Attribute");
    }
    _.each(attrs, function(a) {
        _.each(self.lines, function(l) {
            if (!l.attributes) l.attributes = [];
            if (!_.contains(l.attributes, a)) {
                l.attributes.push(a);
            }
        });
    });
};

Price2.prototype.toJSON = function() {
    var obj = {};
    obj.lines = _.map(this.lines, _.clone);
    _.each(obj.lines, function(l) {
        if (typeof l.from === "number") l.from = du.int2date(l.from);
        if (typeof l.to === "number") l.to = du.int2date(l.to);
    });
    return obj;
};

Price2.attrFilter = function(attr) {
    attr = attr.toString();
    return function(n) {
        if ((n.childs) ||
            (_.contains(n.attributes, attr))) {
            return true;
        } else {
            return false;
        }
    };
};


Price2.prototype.forEachLead = function(id, cb) {

    if (typeof id === "function") {
        cb = id;
        id = "total";
    }
    var self = this;
    self.constructTree();

    var node = findNode(self.total, id);

    function callEachNode(node) {
        if (!node.childs) return cb(node);
        _.each(node.childs, function (childNode) {
            callEachNode(childNode);
        });
    }

    callEachNode(node);
};





module.exports = Price2;

