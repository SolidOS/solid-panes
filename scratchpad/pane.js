"use strict";
exports.__esModule = true;
var data_1 = require("./data");
var view_1 = require("./view");
exports.pane = {
    canHandle: function (subject, store) { return data_1.isPad(subject, store); },
    label: function (subject, store) { return data_1.getTitle(store, subject); },
    view: view_1.view
};
