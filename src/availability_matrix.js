/*jslint node: true */
"use strict";

var _=require('lodash');
var du = require('./date_utils');

exports.trim = function(m, intDate) {

    m.firstBookableDate = du.date2int(m.firstBookableDate);
    while ((m.matrix.length>1) && (m.matrix[0] === 0)) {
        m.matrix.shift();
        m.firstBookableDate += 1;
    }

    while ((m.matrix.length>1) && (m.matrix[m.matrix.length-1] === 0)) {
        m.matrix.pop();
    }

    if (!intDate) {
        m.firstBookableDate = du.int2date(m.firstBookableDate);
    }

};


exports.AND = function(m1, m2, intDate) {
    if (!m1) {
        return null;
    }
    if (!m2) {
        return null;
    }
    var i;
    var iFirstBookableDate1 = du.date2int(m1.firstBookableDate);
    var iFirstBookableDate2 = du.date2int(m2.firstBookableDate);
    var out = {
        firstBookableDate: Math.max(iFirstBookableDate1, iFirstBookableDate2),
        matrix: [0]
    };
    var L = Math.min(iFirstBookableDate1 + m1.matrix.length - out.firstBookableDate,
                     iFirstBookableDate2 + m2.matrix.length - out.firstBookableDate);
    for (i=0; i< L; i+=1) {
        var v = 0xFFFFFFF; // 28 DAYS

        var i1  =  i + out.firstBookableDate -iFirstBookableDate1;
        if (i1>=0 && i1<m1.matrix.length) {
            v = v & m1.matrix[i1];
        } else {
            v = 0;
        }

        var i2  =  i + out.firstBookableDate -iFirstBookableDate2;
        if (i2>=0 && i2<m2.matrix.length) {
            v = v & m2.matrix[i2];
        } else {
            v = 0;
        }

        out.matrix[i] = v;
    }

    exports.trim(out, intDate);
    if (!intDate) {
        out.firstBookableDate = du.int2date(out.firstBookableDate);
    }

    return out;
};

exports.OR = function(m1, m2, intDate) {
    if ((!m1)&&(!m2)) return null;
    if (!m1) {
        return _.clone(m2);
    }
    if (!m2) {
        return _.clone(m1);
    }
    var i;
    var iFirstBookableDate1 = du.date2int(m1.firstBookableDate);
    var iFirstBookableDate2 = du.date2int(m2.firstBookableDate);
    var out = {
        firstBookableDate: Math.min(iFirstBookableDate1, iFirstBookableDate2),
        matrix: [0]
    };
    var L = Math.max(iFirstBookableDate1 + m1.matrix.length - out.firstBookableDate,
                     iFirstBookableDate2 + m2.matrix.length - out.firstBookableDate);
    for (i=0; i< L; i+=1) {
        var v = 0; // 28 DAYS

        var i1  =  i + out.firstBookableDate -iFirstBookableDate1;
        if (i1>=0 && i1<m1.matrix.length) {
            v = v | m1.matrix[i1];
        }

        var i2  =  i + out.firstBookableDate -iFirstBookableDate2;
        if (i2>=0 && i2<m2.matrix.length) {
            v = v | m2.matrix[i2];
        }

        out.matrix[i] = v;
    }

    exports.trim(out, intDate);
    if (!intDate) {
        out.firstBookableDate = du.int2date(out.firstBookableDate);
    }


    return out;
};

exports.ZERO = function(intDate) {
    if (intDate) {
        return {
            firstBookableDate: du.today(),
            matrix: [0]
        };
    } else {
        return {
            firstBookableDate: du.int2date(du.today()),
            matrix: [0]
        };
    }
};
