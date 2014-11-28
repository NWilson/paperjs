(function(root, factory) {
  if (typeof define === 'functon' && define.amd)
    define([], factory);
  else
    root.paperjs = factory();
})(this, function() {
  var paperjs = {};

  function displayElt(elt, d, optShowType) {
    if (d && optShowType) elt.style.display = optShowType;
    else if (d) elt.style.removeProperty('display');
    else elt.style.display = 'none';
  }

  function isShown(elt) {
    return window.getComputedStyle(elt, null).display != 'none';
  }

  var PaperObject = function () {};
  PaperObject.prototype.dispose = function() {
    this._disposeEvents();
    this._disposeChildren();
  };
  PaperObject.prototype.show = function(s) { displayElt(this._rootElt, s); };
  PaperObject.prototype.focus = function() { this._focusElt.focus(); };
  PaperObject.prototype.select = function() { this._focusElt.select(); };
  PaperObject.prototype.appendToNative = function(p) { p.appendChild(this._rootElt); };
  PaperObject.prototype.removeFromNative = function(p) { p.removeChild(this._rootElt); };
  PaperObject.prototype.appendChild = function(elt) {
    this._contentElt.appendChild(elt._rootElt);
    if (this._children === null) this._children = [];
    this._children.push(elt);
  };
  PaperObject.prototype.removeChildren = function() { this._disposeChildren(); };
  PaperObject.prototype._rootElt = null;
  PaperObject.prototype._focusElt = null;
  PaperObject.prototype._contentElt = null;
  PaperObject.prototype._children = null;
  PaperObject.prototype._disposeChildren = function() {
    if (this._children === null) return;
    for (var i = 0; i < this._children.length; ++i) {
      var c = this._children[i];
      this._contentElt.removeChild(c._rootElt);
      c.dispose();
    }
    this._children.length = 0;
  }
  PaperObject.prototype._eventHandlers = null;
  PaperObject.prototype._addEvent = function(target, type, fn) {
    if (this._eventHandlers === null) this._eventHandlers = [];
    this._eventHandlers.push({target: target, type: type, fn: fn});
    target.addEventListener(type, fn, false);
  }
  PaperObject.prototype._disposeEvents = function() {
    if (this._eventHandlers === null) return;
    for (var i = 0; i < this._eventHandlers.length; ++i) {
      var e = this._eventHandlers[i];
      e.target.removeEventListener(e.type, e.fn, false);
    }
    this._eventHandlers.length = 0;
  }

  var paperArrow = '<svg viewBox="0 0 24 24" height="24px" width="24px" preserveAspectRatio="xMidYMid meet" fit=""><g><path d="M7 10l5 5 5-5z"></path></g></svg>';

  var PaperDlg = function(modal) {
    this._rootElt = this._contentElt = document.createElement('div');
    this._rootElt.className = 'paperDialog';
    this._modal = modal;
    if (modal) {
      var sheet = document.createElement('div');
      sheet.className = 'paperModal';
      sheet.appendChild(this._rootElt);
      this._rootElt = sheet;
      document.body.appendChild(this._rootElt);
    }
  };
  PaperDlg.prototype = new PaperObject();
  PaperDlg.prototype.dispose = function() {
    if (this._modal) document.body.removeChild(this._rootElt);
    this._disposeEvents();
    this._disposeChildren();
  };
  PaperDlg.prototype.addClass = function(type) {
    this._contentElt.classList.add(type);
  };
  paperjs.createDialog = function(modal) { return new PaperDlg(modal); }

  var PaperTextfield = function(labelText, tipText, isPassword) {
    var self = this;
    var field = this._rootElt = document.createElement('div');
    field.className = 'paperTextfield';
    var label = this._label = document.createElement('span');
    label.className = 'paperPlaceholder';
    label.textContent = labelText;
    field.appendChild(label);
    var input = this._focusElt = document.createElement('input');
    input.type = isPassword ? 'password' : 'text';
    if (tipText) input.title = tipText;
    field.appendChild(input);

    this._addEvent(label, 'click', function(event) {
      self._focusElt.focus();
    });
    this._addEvent(input, 'blur', function(event) {
      self._rootElt.classList.remove('paperFocus');
      if (self._focusElt.value == '')
        self._label.classList.add('paperPlaceholder');
    });
    this._addEvent(input, 'focus', function(event) {
      self._rootElt.classList.add('paperFocus');
      self._label.classList.remove('paperPlaceholder');
    });

    this._addEvent(input, 'input', function(event) {
      self.onchange();
    });
  };
  PaperTextfield.prototype = new PaperObject();
  PaperTextfield.prototype.onchange = function() {};
  PaperTextfield.prototype.setText = function(text) { this._focusElt.value = text; };
  PaperTextfield.prototype.getText = function() { return this._focusElt.value; };
  paperjs.createTextfield = function(labelText, tipText, isPassword) {
    return new PaperTextfield(labelText, tipText, isPassword);
  };

  var PaperMenuElementBase = function() {};
  PaperMenuElementBase.prototype = new PaperObject();
  PaperMenuElementBase.prototype._initMenuElementBase = function() {
    var self = this;
    var menu = this._menu = document.createElement('div');
    menu.className = 'paperMenu';
    this._rootElt.appendChild(menu);

    this._data = [];
    this._active = null;

    // Used in the blur handler - we don't hide the menu if the user clicked on it
    // or on the disclosure button; they handle the menu themselves.
    this._menuMousedown = new Number(0);
    this._addEvent(this._menu, 'mousedown', function(event) {
      self._menuMousedown = Date.now();
    });
    if (this._disclosure) {
      this._addEvent(this._disclosure, 'mousedown', function(event) {
        self._menuMousedown = Date.now();
      });
      this._addEvent(this._disclosure, 'click', function(event) {
        var shown = isShown(self._menu);
        self._focusElt.focus();
        self._showMenu(!shown);
        if (!shown && self.ondisclose !== undefined)
          self.ondisclose();
        event.preventDefault();
      });
    }

    this._addEvent(menu, 'click', function(event) {
      var idx = self._elementIdx(event.target);
      if (idx >= 0 && !self._data[idx].header) {
        self._selectRow(event.target, true);
        if (self._onitemselected !== undefined)
          self._onitemselected();
      }
      self._focusElt.focus();
      event.preventDefault();
    });

    this._addEvent(document, 'click', function(event) {
      if (!isShown(self._menu) || event.defaultPrevented)
        return;
      self._showMenu(true);
    });
  };
  PaperMenuElementBase.prototype.appendItem = function(itemText, header) {
    var elt = document.createElement('div');
    elt.className = 'paperItem';
    elt.textContent = itemText;
    if (header) elt.classList.add('paperHeaderItem');
    this._menu.appendChild(elt);
    this._data.push({elt: elt, header: !!header});
  };
  PaperMenuElementBase.prototype.clearItems = function() {
    for (var i = 0; i < this._data.length; ++i)
      this._menu.removeChild(this._data[i].elt);
    this._data.length = 0;
    this._active = null;
  };
  PaperMenuElementBase.prototype.getSelection = function() {
    return this._active ? this._elementIdx(this._active.elt) : -1;
  };
  PaperMenuElementBase.prototype.setSelection = function(idx) {
    if (idx < this._data.length)
      this._selectRow(idx, false);
  };
  PaperMenuElementBase.prototype._showMenu = function(show) {
    var shown = isShown(this._menu);
    if (show && !shown && this._onmenushow !== undefined)
      this._onmenushow();
    displayElt(this._menu, show, 'block');
  };
  PaperMenuElementBase.prototype._elementIdx = function(elt) {
    var prev = elt, i = 0;
    while ((prev = prev.previousSibling)) ++i;
    return i < this._data.length && this._data[i].elt.isEqualNode(elt) ? i : -1;
  }
  PaperMenuElementBase.prototype._selectRow = function(id, notify) {
    var idx = typeof id == 'number' ? id : this._elementIdx(id);
    if (this._active)
      this._active.elt.classList.remove('paperActive');
    if (idx < 0) {
      this._active = null;
      return;
    }
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
    if (notify && this.onselectionchange !== undefined)
      this.onselectionchange();
    if (this._onselectionchange !== undefined)
      this._onselectionchange();
  };
  PaperMenuElementBase.prototype._selectNextRow = function(increment, notify) {
    this._showMenu(true);
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

  var PaperOmnibox = function(labelText, tipText) {
    var self = this;
    var box = this._rootElt = document.createElement('div');
    box.className = 'paperOmnibox';
    var label = this._label = document.createElement('span');
    label.textContent = labelText;
    box.appendChild(label);
    var input = this._focusElt = document.createElement('input');
    input.type = 'text';
    input.title = tipText;
    box.appendChild(input);
    var img = this._disclosure = document.createElement('div');
    img.className = 'paperExpander';
    img.innerHTML = paperArrow;
    box.appendChild(img);
    this._initMenuElementBase();

    this._addEvent(label, 'click', function(event) {
      self._focusElt.focus();
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
        self._showMenu(false);
      if (event.keyCode == 46 && isShown(self._menu) && self.deleteCallback()) // delete
        event.preventDefault();
    });

    this._addEvent(input, 'blur', function(event) {
      setTimeout(function() {
        if (self._menuMousedown < Date.now() - 150) {
          self._rootElt.classList.remove('paperFocus');
          if (self._focusElt.value == '')
            self._label.classList.add('paperPlaceholder');
          self._showMenu(false);
        }
      }, 100);
    });
    this._addEvent(input, 'focus', function(event) {
      self._rootElt.classList.add('paperFocus');
      self._label.classList.remove('paperPlaceholder');
    });
  };
  PaperOmnibox.prototype = new PaperMenuElementBase();
  PaperOmnibox.prototype.ondisclose = function() {};
  PaperOmnibox.prototype.oneditchange = function() {};
  PaperOmnibox.prototype.onselectionchange = function() {};
  PaperOmnibox.prototype.deleteCallback = function() { return false /* not handled */; };
  PaperOmnibox.prototype.activate = function() {
    this._showMenu(true);
    this._focusElt.focus();
  };
  PaperOmnibox.prototype.setText = function(t) { this._focusElt.value = t; };
  PaperOmnibox.prototype.getText = function() { return this._focusElt.value; };
  paperjs.createOmnibox = function(labelText, tipText) {
    return new PaperOmnibox(labelText, tipText);
  };

  var PaperCombo = function(labelText, tipText) {
    var self = this;
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
    var img = this._disclosure = document.createElement('div');
    img.className = 'paperExpander';
    img.innerHTML = paperArrow;
    combo.appendChild(img);
    this._initMenuElementBase();

    this._onmenushow = function() {
      if (!self._active) return;
      var style = getComputedStyle(self._data[0].elt);
      var h = parseInt(style.paddingTop) + parseInt(style.height) + parseInt(style.paddingBottom);
      self._menu.style.marginTop = '-' + (h * self._elementIdx(self._active.elt)) + 'px';
    };
    this._onitemselected = function() {
      self._showMenu(false);
    };
    this._onselectionchange = function() {
      self._focusElt.textContent = this._active.elt.textContent;
    };

    this._addEvent(value, 'keydown', function(event) {
      var code = event.keyCode || event.which;
      if (code == 40 || code == 38) {
        // arrow keys
        if (isShown(self._menu))
          self._selectNextRow(event.keyCode == 40 ? 1 : -1, true);
        else
          self._showMenu(true);
        event.preventDefault();
      }
      if (event.keyCode == 27) // escape
        self._showMenu(false);
    });

    this._addEvent(value, 'blur', function(event) {
      setTimeout(function() {
        if (self._menuMousedown < Date.now() - 150) {
          self._rootElt.classList.remove('paperFocus');
          self._showMenu(false);
        }
      }, 100);
    });
    this._addEvent(value, 'focus', function(event) {
      self._rootElt.classList.add('paperFocus');
    });

    this._addEvent(value, 'click', function(event) {
      self._showMenu(true);
    });
  };
  PaperCombo.prototype = new PaperMenuElementBase();
  PaperCombo.prototype.setTip = function(tipText) { this._focusElt.title = tipText; };
  paperjs.createCombo = function(labelText, tipText) { return new PaperCombo(labelText, tipText); };

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

  var PaperDialogHeader = function() {
    var header = this._rootElt = this._contentElt = document.createElement('div');
    header.className = 'paperDialogHeader';
  };
  PaperDialogHeader.prototype = new PaperObject;
  PaperDialogHeader.prototype.setText = function(text) { this._contentElt.textContent = text; };
  PaperDialogHeader.prototype.WARNING = 'paperDialogWarning';
  PaperDialogHeader.prototype.ERROR = 'paperDialogError';
  PaperDialogHeader.prototype.setTheme = function(theme) {
    if (theme == this.WARNING) {
      this._rootElt.classList.remove(this.ERROR);
      this._rootElt.classList.add(this.WARNING);
    } else if (theme == this.ERROR) {
      this._rootElt.classList.remove(this.WARNING);
      this._rootElt.classList.add(this.ERROR);
    }
  }
  paperjs.createDialogHeader = function() { return new PaperDialogHeader(); };

  var PaperDialogFooter = function() {
    var bar = this._rootElt = this._contentElt = document.createElement('div');
    bar.className = 'paperDialogFooter';
  };
  PaperDialogFooter.prototype = new PaperObject();
  paperjs.createDialogFooter = function() { return new PaperDialogFooter(); }

  var PaperDialogFooterStatus = function(statusText) {
    var text = this._rootElt = document.createElement('div');
    text.className = 'paperStatus';
    text.textContent = statusText;
    return this;
  };
  PaperDialogFooterStatus.prototype = new PaperObject();
  PaperDialogFooterStatus.prototype.setText = function(t) { this._rootElt.textContent = t; };
  paperjs.createDialogFooterStatus = function(text) { return new PaperDialogFooterStatus(text); };

  var PaperCheckbox = function(labelText) {
    var label = this._rootElt = document.createElement('label');
    label.className = 'paperCheckbox';
    var check = this._focusElt = document.createElement('input');
    check.type = 'checkbox';
    label.appendChild(check);
    label.appendChild(document.createTextNode(labelText));
  };
  PaperCheckbox.prototype = new PaperObject();
  PaperCheckbox.prototype.isChecked = function() { return this._focusElt.checked; };
  paperjs.createCheckbox = function(text) { return new PaperCheckbox(text); };

  var PaperParagraph = function(text) {
    var p = this._rootElt = document.createElement('p');
    p.className = 'paperParagraph';
  };
  PaperParagraph.prototype = new PaperObject;
  PaperParagraph.prototype.setText = function(text) { this._rootElt.textContent = text; };
  paperjs.createParagraph = function(text) { return new PaperParagraph(text); };

  var PaperLabelledStatic = function(text, label) {
    var xxx = this._rootElt = document.createElement('div');
    xxx.textContent = label + " " + text;
    this._xxx_label = label;
  };
  PaperLabelledStatic.prototype = new PaperObject;
  PaperLabelledStatic.prototype.setText = function(text) {
    this._rootElt.textContent = this._xxx_label + " " + text;
  };
  paperjs.createLabelledStatic = function(text, label) { return new PaperLabelledStatic(text, label); };

  var PaperContainer = function() {
    this._rootElt = this._contentElt = document.createElement('div');
  };
  PaperContainer.prototype = new PaperObject;
  paperjs.createContainer = function() { return new PaperContainer(); };

  return paperjs;
});
