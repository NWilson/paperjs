(function(root, factory) {
  if (typeof define === 'functon' && define.amd)
    define([], factory);
  else
    root.paperjs = factory();
})(this, function() {
  var paperjs = {};
  var PaperObject = function () {};
  PaperObject.prototype.dispose = function() {
    this._disposeEvents();
    this._disposeChildren();
  };
  PaperObject.prototype.focus = function() { this._focusElt.focus(); };
  PaperObject.prototype.select = function() { this._focusElt.select(); };
  PaperObject.prototype.appendToNative = function(p) { p.appendChild(this._rootElt); };
  PaperObject.prototype.appendChild = function(elt) {
    this._contentElt.appendChild(elt._rootElt);
    this._children.push(elt);
  };
  PaperObject.prototype._rootElt = null;
  PaperObject.prototype._focusElt = null;
  PaperObject.prototype._contentElt = null;
  PaperObject.prototype._children = [];
  PaperObject.prototype._disposeChildren = function() {
    for (var i = 0; i < this._children.length; ++i) {
      var c = this._children[i];
      this._contentElt.removeChild(c._rootElt);
      c.dispose();
    }
    this._children.length = 0;
  }
  PaperObject.prototype._eventHandlers = [];
  PaperObject.prototype._addEvent = function(target, type, fn) {
    this._eventHandlers.push({target: target, type: type, fn: fn});
    target.addEventListener(type, fn, false);
  }
  PaperObject.prototype._disposeEvents = function() {
    for (var i = 0; i < this._eventHandlers.length; ++i) {
      var e = this._eventHandlers[i];
      e.target.removeEventListener(e.type, e.fn, false);
    }
    this._eventHandlers.length = 0;
  }

  function displayElt(elt, d, optShowType) {
    if (d && optShowType) elt.style.display = optShowType;
    else if (d) elt.style.removeProperty('display');
    else elt.style.display = 'none';
  }

  function isShown(elt) {
    return window.getComputedStyle(elt, null).display != 'none';
  }

  var paperArrow = '<svg viewBox="0 0 24 24" height="24px" width="24px" preserveAspectRatio="xMidYMid meet" fit=""><g><path d="M7 10l5 5 5-5z"></path></g></svg>';

  var PaperDlg = function() {
    this._rootElt = this._contentElt = document.createElement('div');
    this._rootElt.className = 'paperDialog';
  };
  PaperDlg.prototype = new PaperObject();
  paperjs.createDialog = function() { return new PaperDlg(); }

  var PaperOmnibox = function(labelText, tipText) {
    var self = this;
    var box = this._rootElt = document.createElement('div');
    box.className = 'paperOmnibox';
    var label = document.createElement('span');
    label.textContent = labelText;
    box.appendChild(label);
    var input = this._focusElt = document.createElement('input');
    input.type = 'text';
    input.title = tipText;
    box.appendChild(input);
    var img = document.createElement('div');
    img.className = 'paperExpander';
    img.innerHTML = paperArrow;
    box.appendChild(img);
    var menu = this._menu = document.createElement('div');
    menu.className = 'paperMenu';
    box.appendChild(menu);

    this._data = [];
    this._active = null;

    // Used in the blur handler below - we don't hide the menu if the user clicked on it
    // or on the disclosure button; they handle the menu themselves.
    this._menuMousedown = new Number(0);
    this._addEvent(menu, 'mousedown', function(event) {
      self._menuMousedown = Date.now();
    });
    this._addEvent(img, 'mousedown', function(event) {
      self._menuMousedown = Date.now();
    });

    this._addEvent(img, 'click', function(event) {
      var shown = isShown(self._menu);
      displayElt(self._menu, !shown, 'block');
      self._focusElt.focus();
      if (!shown) self.onclick();
      event.preventDefault();
    });

    this._addEvent(input, 'input', function(event) {
      self.oneditchange();
    });

    this._addEvent(input, 'keydown', function(event) {
      var code = event.keyCode || event.which;
      if (code == 40 || code == 38) {
        // arrow keys
        self._selectNextRow(event.keyCode == 40 ? 1 : -1, true);
        event.preventDefault();
      }
      if (event.keyCode == 27) // escape
        displayElt(self._menu, false, 'block');
      if (event.keyCode == 46 && isShown(self._menu) && self.deleteCallback()) // delete
        event.preventDefault();
      if (code == 9) {
        // tab
        // We should really hide on blur, but that stops people interacting nicely
        // with the menu
        //displayElt(menu, false);
      }
    });

    this._addEvent(input, 'blur', function(event) {
      setTimeout(function() {
        if (self._menuMousedown < Date.now() - 150) displayElt(self._menu, false, 'block');
      }, 100);
    });

    this._addEvent(menu, 'click', function(event) {
      var idx = self._elementIdx(event.target);
      if (idx >= 0 && !self._data[idx].header) {
        self._selectRow(event.target, true);
      }
      self._focusElt.focus();
      event.preventDefault();
    });

    this._addEvent(document, 'click', function(event) {
      if (!isShown(self._menu) || event.defaultPrevented)
        return;
      displayElt(self._menu, true, 'block');
    });
  };
  PaperOmnibox.prototype = new PaperObject();
  PaperOmnibox.prototype.onclick = function() {};
  PaperOmnibox.prototype.oneditchange = function() {};
  PaperOmnibox.prototype.onselectionchange = function() {};
  PaperOmnibox.prototype.deleteCallback = function() { return false /* not handled */; };
  PaperOmnibox.prototype.appendItem = function(itemText, header) {
    var elt = document.createElement('div');
    elt.className = 'paperItem';
    elt.textContent = itemText;
    if (header) elt.classList.add('paperHeaderItem');
    this._menu.appendChild(elt);
    this._data.push({elt: elt, header: !!header});
  };
  PaperOmnibox.prototype.clearItems = function() {
    this._data.length = 0;
    this._active = null;
  };
  PaperOmnibox.prototype.getSelection = function() {
    return this._active ? this._elementIdx(this._active.elt) : -1;
  };
  PaperOmnibox.prototype.setSelection = function(idx) {
    this._active = idx < 0 ? null : idx < this._data.length
                           ? this._data[idx] : this._active;
  };
  PaperOmnibox.prototype._elementIdx = function(elt) {
    var prev = elt, i = 0;
    while ((prev = prev.previousSibling)) ++i;
    return i < this._data.length && this._data[i].elt.isEqualNode(elt) ? i : -1;
  }
  PaperOmnibox.prototype._selectRow = function(id, notify) {
    if (this._active)
      this._active.elt.classList.remove('paperActive');
    var idx = typeof id == 'number' ? id : this._elementIdx(id);
    var elt = this._data[idx].elt;
    this._active = this._data[idx];
    elt.classList.add('paperActive');
    if (elt.offsetTop < elt.parentNode.scrollTop)
      elt.parentNode.scrollTop = Math.ceil(elt.offsetTop);
    if (elt.offsetTop + elt.clientHeight >
        elt.parentNode.scrollTop + elt.parentNode.clientHeight)
      elt.parentNode.scrollTop =
          Math.floor(elt.offsetTop + elt.clientHeight -
                     elt.parentNode.clientHeight);
    if (notify) this.onselectionchange();
  };
  PaperOmnibox.prototype._selectNextRow = function(increment, notify) {
    displayElt(this._menu, true, 'block');
    if (this._data.length == 0)
      return;
    if (increment == 1) {
      var i = this._active ? this._elementIdx(this._active.elt) + 1 : 0;
      while (i < this._data.length && this._data[i].header) ++i;
      if (i < this._data.length) this._selectRow(i, notify);
    } else if (increment == -1) {
      var i = this._active ? this._elementIdx(this._active.elt) - 1 : this._data.length - 1;
      while (i >= 0 && this._data[i].header) --i;
      if (i >= 0) this._selectRow(i, notify);
    }
  };
  paperjs.createOmnibox = function(labelText, tipText) {
    return new PaperOmnibox(labelText, tipText);
  };

  var PaperCombo = function(labelText, tipText) {
    var combo = this._rootElt = document.createElement('div');
    combo.className = 'paperCombo';
    var label = document.createElement('span');
    label.textContent = labelText;
    combo.appendChild(label);
    var value = this._focusElt = document.createElement('div');
    value.tabIndex = 0;
    value.className = 'paperComboValue';
    if (tipText) value.title = tipText;
    combo.appendChild(value);
    var img = document.createElement('div');
    img.className = 'paperExpander';
    img.innerHTML = paperArrow;
    combo.appendChild(img);
    var menu = this._menu = document.createElement('div');
    menu.className = 'paperMenu';
    combo.appendChild(menu);
  };
  PaperCombo.prototype = new PaperObject();
  paperjs.createCombo = function(labelText, tipText) { return new PaperCombo(labelText, tipText); };

  var PaperButtonBar = function() {
    var bar = this._rootElt = this._contentElt = document.createElement('div');
    bar.className = 'paperButtonBar';
  };
  PaperButtonBar.prototype = new PaperObject();
  paperjs.createButtonBar = function() { return new PaperButtonBar(); }

  var PaperButton = function(buttonText, raised, defaulted, tipText) {
    var self = this;
    var button = this._rootElt = document.createElement('button');
    button.className = 'paperButton';
    button.textContent = buttonText;
    if (raised) button.classList.add('paperRaised');
    if (defaulted) button.classList.add('paperDefault');
    if (tipText) button.title = tipText;

    this._addEvent(button, 'click', function(event) {
      self.onclick();
    });
  };
  PaperButton.prototype = new PaperObject();
  PaperButton.prototype.onclick = function() {};
  paperjs.createButton = function(buttonText, raised, defaulted, tipText) {
    return new PaperButton(buttonText, raised, defaulted, tipText);
  };

  var PaperButtonBarStatus = function(statusText) {
    var text = this._rootElt = document.createElement('div');
    text.className = 'paperStatus';
    text.textContent = statusText;
    return this;
  };
  PaperButtonBarStatus.prototype = new PaperObject();
  paperjs.createButtonBarStatus = function(text) { return new PaperButtonBarStatus(text); };

  return paperjs;
});