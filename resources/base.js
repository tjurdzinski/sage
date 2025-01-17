if (typeof _sageInitialized === 'undefined') {
    _sageInitialized = 1;
    const _sage = {
        visiblePluses: [], // all visible toggle carets
        currentPlus: -1, // currently selected caret

        selectText: function (element) {
            const selection = window.getSelection(),
                range = document.createRange();

            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        },

        each: function (selector, callback) {
            Array.prototype.slice.call(document.querySelectorAll(selector), 0).forEach(callback)
        },

        hasClass: function (target, className) {
            if (!target.classList) return false;

            if (typeof className === 'undefined') {
                className = '_sage-show';
            }
            return target.classList.contains(className);
        },

        addClass: function (target, className) {
            if (typeof className === 'undefined') {
                className = '_sage-show';
            }
            target.classList.add(className);
        },

        removeClass: function (target, className) {
            if (typeof className === 'undefined') {
                className = '_sage-show';
            }
            target.classList.remove(className);
            return target;
        },

        next: function (element) {
            do {
                element = element.nextElementSibling;
            } while (element.nodeName.toLowerCase() !== 'dd');

            return element;
        },

        toggle: function (element, hide) {
            let parent = _sage.next(element);

            if (typeof hide === 'undefined') {
                hide = _sage.hasClass(element);
            }

            if (hide) {
                _sage.removeClass(element);
            } else {
                _sage.addClass(element);
            }

            if (parent.childNodes.length === 1) {
                parent = parent.childNodes[0].childNodes[0]; // reuse variable cause I can

                // parent is checked in case of empty <pre> when array("\n") is dumped
                if (parent && _sage.hasClass(parent, '_sage-parent')) {
                    _sage.toggle(parent, hide)
                }
            }
        },

        toggleChildren: function (element, hide) {
            const parent = _sage.next(element)
                , nodes = parent.getElementsByClassName('_sage-parent');
            let i = nodes.length;

            if (typeof hide === 'undefined') {
                hide = _sage.hasClass(element);
            }

            while (i--) {
                _sage.toggle(nodes[i], hide);
            }
            _sage.toggle(element, hide);
        },

        toggleAll: function (caret) {
            const elements = document.getElementsByClassName('_sage-parent')
            let i = elements.length
            const visible = _sage.hasClass(caret.parentNode);

            while (i--) {
                _sage.toggle(elements[i], visible);
            }
        },

        switchTab: function (target) {
            let lis, el = target, index = 0;

            target.parentNode.getElementsByClassName('_sage-active-tab')[0].className = '';
            target.className = '_sage-active-tab';

            // take the index of clicked title tab and make the same n-th content tab visible
            while (el = el.previousSibling) el.nodeType === 1 && index++;
            lis = target.parentNode.nextSibling.childNodes;
            for (let i = 0; i < lis.length; i++) {
                if (i === index) {
                    lis[i].style.display = 'block';

                    if (lis[i].childNodes.length === 1) {
                        el = lis[i].childNodes[0].childNodes[0];

                        if (_sage.hasClass(el, '_sage-parent')) {
                            _sage.toggle(el, false)
                        }
                    }
                } else {
                    lis[i].style.display = 'none';
                }
            }
        },

        isSibling: function (el) {
            for (; ;) {
                el = el.parentNode;
                if (!el || _sage.hasClass(el, '_sage')) break;
            }

            return !!el;
        },

        fetchVisiblePluses: function () {
            _sage.visiblePluses = [];
            _sage.each('._sage nav, ._sage-tabs>li:not(._sage-active-tab)', function (el) {
                if (el.offsetWidth !== 0 || el.offsetHeight !== 0) {
                    _sage.visiblePluses.push(el)
                }
            });
        },

        // some custom implementations screw up the JS when they see <head> or <meta charset>
        // this method survives minification
        tag: function (contents) {
            return '<' + contents + '>';
        },

        openInNewWindow: function (_sageContainer) {
            let newWindow;

            if (newWindow = window.open()) {
                newWindow.document.open();
                newWindow.document.write(
                    _sage.tag('html')
                    + _sage.tag('head')
                    + '<title>Sage ☯ (' + new Date().toISOString() + ')</title>'
                    + _sage.tag('meta charset="utf-8"')
                    + document.getElementsByClassName('_sage-js')[0].outerHTML
                    + document.getElementsByClassName('_sage-css')[0].outerHTML
                    + _sage.tag('/head')
                    + _sage.tag('body')
                    + '<input style="width: 100%" placeholder="Take some notes!">'
                    + '<div class="_sage">'
                    + _sageContainer.parentNode.outerHTML
                    + '</div>'
                    + _sage.tag('/body')
                );
                newWindow.document.close();
            }
        },

        sortTable: function (table, column, header) {
            const tbody = table.tBodies[0];

            const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

            const direction = (typeof header.sage_direction === 'undefined') ? 1 : header.sage_direction
            header.sage_direction = -1 * direction;

            [].slice.call(table.tBodies[0].rows)
                .sort(function (a, b) {
                    return direction * collator.compare(a.cells[column].textContent, b.cells[column].textContent)
                })
                .forEach(function (el) {
                    tbody.appendChild(el);
                });
        },

        keyCallBacks: {
            cleanup: function (i) {
                const focusedClass = '_sage-focused';
                const prevElement = document.querySelector('.' + focusedClass);
                prevElement && _sage.removeClass(prevElement, focusedClass);

                if (i !== -1) {
                    const el = _sage.visiblePluses[i];
                    _sage.addClass(el, focusedClass);


                    const offsetTop = function (el) {
                        return el.offsetTop + (el.offsetParent ? offsetTop(el.offsetParent) : 0);
                    };

                    const top = offsetTop(el) - (window.innerHeight / 2);
                    window.scrollTo(0, top);
                }

                _sage.currentPlus = i;
            },

            moveCursor: function (up, i) {
                // todo make the first VISIBLE plus active
                if (up) {
                    if (--i < 0) {
                        i = _sage.visiblePluses.length - 1;
                    }
                } else {
                    if (++i >= _sage.visiblePluses.length) {
                        i = 0;
                    }
                }

                _sage.keyCallBacks.cleanup(i);
                return false;
            }
        }
    };

    window.addEventListener("click", function (e) {
        let target = e.target
            , nodeName = target.nodeName.toLowerCase();

        if (!_sage.isSibling(target)) return;

        // auto-select name of variable
        if (nodeName === 'dfn') {
            _sage.selectText(target);
            target = target.parentNode;
        } else if (nodeName === 'var') { // stupid workaround for misc elements
            target = target.parentNode;    // to not stop event from further propagating
            nodeName = target.nodeName.toLowerCase()
        } else if (nodeName === 'th') {
            if (!e.ctrlKey) {
                _sage.sortTable(target.parentNode.parentNode.parentNode, target.cellIndex, target)
            }
            return false;
        }

        // switch tabs
        if (nodeName === 'li' && target.parentNode.className === '_sage-tabs') {
            if (target.className !== '_sage-active-tab') {
                _sage.switchTab(target);
                if (_sage.currentPlus !== -1) _sage.fetchVisiblePluses();
            }
            return false;
        }

        // handle clicks on the navigation caret
        if (nodeName === 'nav') {
            // special case for nav in footer
            if (target.parentNode.nodeName.toLowerCase() === 'footer') {
                target = target.parentNode;
                if (_sage.hasClass(target)) {
                    _sage.removeClass(target)
                } else {
                    _sage.addClass(target)
                }
            } else {
                // ensure doubleclick has different behaviour, see below
                setTimeout(function () {
                    const timer = parseInt(target._sageTimer, 10);
                    if (timer > 0) {
                        target._sageTimer--;
                    } else {
                        _sage.toggleChildren(target.parentNode); // <dt>
                        if (_sage.currentPlus !== -1) _sage.fetchVisiblePluses();
                    }
                }, 300);
            }

            e.stopPropagation();
            return false;
        } else if (_sage.hasClass(target, '_sage-parent')) {
            _sage.toggle(target);
            if (_sage.currentPlus !== -1) _sage.fetchVisiblePluses();
            return false;
        } else if (_sage.hasClass(target, '_sage-ide-link')) {
            e.preventDefault();
            const ajax = new XMLHttpRequest(); // add ajax call to contact editor but prevent link default action
            ajax.open('GET', target.href);
            ajax.send(null);
            return false;
        } else if (_sage.hasClass(target, '_sage-popup-trigger')) {
            let _sageContainer = target.parentNode;
            if (_sageContainer.nodeName.toLowerCase() === 'footer') {
                _sageContainer = _sageContainer.previousSibling;
            } else {
                while (_sageContainer && !_sage.hasClass(_sageContainer, '_sage-parent')) {
                    _sageContainer = _sageContainer.parentNode;
                }
            }

            _sage.openInNewWindow(_sageContainer);
        } else if (nodeName === 'pre' && e.detail === 3) { // triple click pre to select it all
            _sage.selectText(target);
        }
    }, false);

    window.addEventListener("dblclick", function (e) {
        const target = e.target;
        if (!_sage.isSibling(target)) return;

        if (target.nodeName.toLowerCase() === 'nav') {
            target._sageTimer = 2;
            _sage.toggleAll(target);
            if (_sage.currentPlus !== -1) _sage.fetchVisiblePluses();
            e.stopPropagation();
        }
    }, false);

    // keyboard navigation
    window.onkeydown = function (e) { // direct assignment is used to have priority over ex FAYT

        // do nothing if alt/ctrl key is pressed or if we're actually typing somewhere
        if (e.target !== document.body || e.altKey || e.ctrlKey) return;

        const keyCode = e.keyCode
            , shiftKey = e.shiftKey
        let i = _sage.currentPlus;


        if (keyCode === 68) { // 'd' : toggles navigation on/off
            if (i === -1) {
                _sage.fetchVisiblePluses();
                return _sage.keyCallBacks.moveCursor(false, i);
            } else {
                _sage.keyCallBacks.cleanup(-1);
                return false;
            }
        } else {
            if (i === -1) return;

            if (keyCode === 9) { // TAB : moves up/down depending on shift key
                return _sage.keyCallBacks.moveCursor(shiftKey, i);
            } else if (keyCode === 38) { // ARROW UP : moves up
                return _sage.keyCallBacks.moveCursor(true, i);
            } else if (keyCode === 40) { // ARROW DOWN : down
                return _sage.keyCallBacks.moveCursor(false, i);
            }
        }


        let _sageNode = _sage.visiblePluses[i];
        if (_sageNode.nodeName.toLowerCase() === 'li') { // we're on a trace tab
            if (keyCode === 32 || keyCode === 13) { // SPACE/ENTER
                _sage.switchTab(_sageNode);
                _sage.fetchVisiblePluses();
                return _sage.keyCallBacks.moveCursor(true, i);
            } else if (keyCode === 39) { // arrows
                return _sage.keyCallBacks.moveCursor(false, i);
            } else if (keyCode === 37) {
                return _sage.keyCallBacks.moveCursor(true, i);
            }
        }

        _sageNode = _sageNode.parentNode; // simple dump
        if (keyCode === 32 || keyCode === 13) { // SPACE/ENTER : toggles
            _sage.toggle(_sageNode);
            _sage.fetchVisiblePluses();
            return false;
        } else if (keyCode === 39 || keyCode === 37) { // ARROW LEFT/RIGHT : respectively hides/shows and traverses
            const visible = _sage.hasClass(_sageNode);
            const hide = keyCode === 37;

            if (visible) {
                _sage.toggleChildren(_sageNode, hide); // expand/collapse all children if immediate ones are showing
            } else {
                if (hide) { // LEFT
                    // traverse to parent and THEN hide
                    do {
                        _sageNode = _sageNode.parentNode
                    } while (_sageNode && _sageNode.nodeName.toLowerCase() !== 'dd');

                    if (_sageNode) {
                        _sageNode = _sageNode.previousElementSibling;

                        i = -1;
                        const parentPlus = _sageNode.querySelector('nav');
                        while (parentPlus !== _sage.visiblePluses[++i]) {
                        }
                        _sage.keyCallBacks.cleanup(i)
                    } else { // we are at root
                        _sageNode = _sage.visiblePluses[i].parentNode;
                    }
                }
                _sage.toggle(_sageNode, hide);
            }
            _sage.fetchVisiblePluses();
            return false;
        }
    };

    window.addEventListener("load", function (e) { // colorize microtime results relative to others
        const elements = Array.prototype.slice.call(document.querySelectorAll('._sage-microtime'), 0);
        elements.forEach(function (el) {
            const value = parseFloat(el.innerHTML)
            let min = Infinity
                , max = -Infinity
                , ratio;

            elements.forEach(function (el) {
                const val = parseFloat(el.innerHTML);

                if (min > val) min = val;
                if (max < val) max = val;
            });

            ratio = 1 - (value - min) / (max - min);

            el.style.background = 'hsl(' + Math.round(ratio * 120) + ',60%,70%)';
        });
    });
}

// debug purposes only, removed in minified source
function clg(i) {
    if (!window.console) return;
    const l = arguments.length;
    let o = 0;
    while (o < l) console.log(arguments[o++])
}
