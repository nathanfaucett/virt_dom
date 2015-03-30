var has = require("has"),
    eventListener = require("event_listener"),
    consts = require("./consts"),
    eventClassMap = require("./event_class_map"),
    isEventSupported = require("./is_event_supported");


var topLevelTypes = consts.topLevelTypes,
    topLevelToEvent = consts.topLevelToEvent,
    EventHandlerPrototype;


module.exports = EventHandler;


function EventHandler(document, window) {
    var viewport = {
        currentScrollLeft: 0,
        currentScrollTop: 0
    };

    this.document = document;
    this.window = window;
    this.viewport = viewport;
    this.handleDispatch = null;

    this.__isListening = {};
    this.__listening = {};
    this.__listeningCount = {};

    function callback() {
        viewport.currentScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        viewport.currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    }

    this.__callback = callback;
    eventListener.on(window, "scroll resize", callback);
}

EventHandlerPrototype = EventHandler.prototype;

EventHandlerPrototype.clear = function() {
    var listening = this.__listening,
        listeningCount = this.__listeningCount,
        isListening = this.__isListening,
        localHas = has,
        type;

    for (type in listening) {
        if (localHas(listening, type)) {
            listening[type]();
            delete isListening[type];
            delete listeningCount[type];
            delete listening[type];
        }
    }

    eventListener.off(this.window, "scroll resize", this.__callback);
};

EventHandlerPrototype.on = function(id, topLevelType) {
    var document = this.document,
        window = this.window,
        isListening = this.__isListening,
        listeningCount = this.__listeningCount;

    if (isListening[topLevelType] === undefined) {
        if (topLevelType === topLevelTypes.topWheel) {
            if (isEventSupported("wheel")) {
                this.trapBubbledEvent(topLevelTypes.topWheel, "wheel", document);
            } else if (isEventSupported("mousewheel")) {
                this.trapBubbledEvent(topLevelTypes.topWheel, "mousewheel", document);
            } else {
                this.trapBubbledEvent(topLevelTypes.topWheel, "DOMMouseScroll", document);
            }
        } else if (topLevelType === topLevelTypes.topScroll) {
            if (isEventSupported("scroll", true)) {
                this.trapCapturedEvent(topLevelTypes.topScroll, "scroll", document);
            } else {
                this.trapBubbledEvent(topLevelTypes.topScroll, "scroll", window);
            }
        } else if (
            topLevelType === topLevelTypes.topFocus ||
            topLevelType === topLevelTypes.topBlur
        ) {
            if (isEventSupported("focus", true)) {
                this.trapBubbledEvent(topLevelTypes.topFocus, "focus", document);
                this.trapBubbledEvent(topLevelTypes.topBlur, "blur", document);
            } else if (isEventSupported("focusin")) {
                this.trapBubbledEvent(topLevelTypes.topFocus, "focusin", document);
                this.trapBubbledEvent(topLevelTypes.topBlur, "focusout", document);
            }

            isListening[topLevelTypes.topFocus] = true;
            isListening[topLevelTypes.topBlur] = true;
        } else {
            this.trapBubbledEvent(topLevelType, topLevelToEvent[topLevelType], document);
        }

        isListening[topLevelType] = true;
    }

    listeningCount[topLevelType] = (listeningCount[topLevelType] || 0) + 1;
};

EventHandlerPrototype.off = function(id, topLevelType) {
    var listening = this.__listening,
        listeningCount = this.__listeningCount;

    listeningCount[topLevelType] -= 1;

    if (listeningCount[topLevelType] <= 0) {
        delete listeningCount[topLevelType];
        listening[topLevelType]();
        delete listening[topLevelType];
    }
};

EventHandlerPrototype.trapBubbledEvent = function(topType, type, element) {
    var _this = this,
        listening = this.__listening;

    function handler(nativeEvent) {
        _this.dispatchEvent(topType, nativeEvent);
    }

    eventListener.on(element, type, handler);

    function removeBubbledEvent() {
        eventListener.off(element, type, handler);
    }
    listening[topType] = removeBubbledEvent;

    return removeBubbledEvent;
};

EventHandlerPrototype.trapCapturedEvent = function(topType, type, element) {
    var _this = this,
        listening = this.__listening;

    function handler(nativeEvent) {
        _this.dispatchEvent(topType, nativeEvent);
    }

    eventListener.capture(element, type, handler);

    function removeCapturedEvent() {
        eventListener.off(element, type, handler);
    }
    listening[topType] = removeCapturedEvent;

    return removeCapturedEvent;
};

EventHandlerPrototype.dispatchEvent = function(topType, nativeEvent) {
    this.handleDispatch(topType, eventClassMap[topType].getPooled(nativeEvent, this), nativeEvent);
};
