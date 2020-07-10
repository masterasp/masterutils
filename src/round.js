/*jslint node: true */
"use strict";

module.exports = function round(val, roundingType, rounding) {
    var v;
    if (val > 0) {
        val  = val + 0.0000001;
    }
    if (val < 0){
        val  = val - 0.0000001;
    }
    if ((!roundingType) || (roundingType === "NONE")) {
        v = Math.round(val / 0.01) * 0.01;
    } else if ((roundingType === 1) || (roundingType === "FLOOR")) {
        v= Math.floor(val / rounding) * rounding;
    } else if ((roundingType === 2) || (roundingType === "ROUND")) {
        v= Math.round(val / rounding) * rounding;
    } else if ((roundingType === 3) || (roundingType === "CEIL")) {
        v= Math.ceil(val / rounding) * rounding;
    } else {
        throw new Error("Invalid roundingType: roundingType");
    }
    return +(Math.round(v + "e+8")  + "e-8");
};
