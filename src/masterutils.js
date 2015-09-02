/*jslint node: true */

(function() {
    "use strict";

    var MasterUtils = {
        dateUtils: require('./date_utils.js'),
        round: require('./round.js'),
        price:  require('./Price.js')
    };

    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = MasterUtils;
        }
        exports.MasterUtils = MasterUtils;
    } else {
        root.MasterUtils = MasterUtils;
    }

    if (window) {
        window.MasterUtils = MasterUtils;
    }

}());
