// Author: Jerroyd Moore / https://github.com/jerroydmoore/leaflet-button
/*
The MIT License (MIT)

Copyright (c) 2013 Jerroyd Moore

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

L.Control.Button = L.Control.extend({
    includes: L.Mixin.Events,
    options: {
        position: 'topleft',
    },
    initialize: function (label, options) {
        L.setOptions(this, options);
        var button = null;

        if (label instanceof HTMLElement) {
            button = label;
            try {
                button.parentNode.removeChild(button);
            } catch (e) { }
        } else if (typeof label === "string") 
        {
            button = L.DomUtil.create('button', this.options.className);
        } else {
            throw new Error('L.Control.Button: failed to initialize, label must either be text or a dom element');
        }

        L.DomUtil.addClass(button, this.options.position);

        this._container = button;

        return this;
    },
    isToggled: function () {
        return L.DomUtil.hasClass(this._container, this.options.toggleButton);
    },
    _fireClick: function (e) {
        this.fire('click');

        if (this.options.toggleButton) {
            var btn = this._container;
            if (this.isToggled()) {
                L.DomUtil.removeClass(this._container, this.options.toggleButton);
            } else {
                L.DomUtil.addClass(this._container, this.options.toggleButton);
            }
        }
    },
    onAdd: function (map) {
        if (this._container) {
            L.DomEvent.on(this._container, 'click', this._fireClick, this);
            var stop = L.DomEvent.stopPropagation;
            L.DomEvent.on(this._container, 'mousedown', stop)
                      .on(this._container, 'touchstart', stop)
                      .on(this._container, 'dblclick', stop)
                      .on(this._container, 'mousewheel', stop)
                      .on(this._container, 'MozMozMousePixelScroll', stop)
            this.fire('load');

            this._map = map;
        }

        return this._container;
    },
    onRemove: function (map) {
        if (this._container && this._map) {
            L.DomEvent.off(this._container, 'click', this._fireClick, this);
            L.DomEvent.off(this._container, 'mousedown', stop)
                      .off(this._container, 'touchstart', stop)
                      .off(this._container, 'dblclick', stop)
                      .off(this._container, 'mousewheel', stop)
                      .off(this._container, 'MozMozMousePixelScroll', stop)

            this.fire('unload');
            this._map = null;
        }

        return this;
    }
});

L.control.button = function (label, options) {
    return new L.Control.Button(label, options);
};