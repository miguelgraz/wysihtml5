/**
 * WYSIHTML5 Editor
 *
 * @param {Element} textareaElement Reference to the textarea which should be turned into a rich text interface
 * @param {Object} [config] See defaultConfig object below for explanation of each individual config option
 *
 * @events
 *    load
 *    beforeload (for internal use only)
 *    focus
 *    focus:composer
 *    focus:textarea
 *    blur
 *    blur:composer
 *    blur:textarea
 *    change
 *    change:composer
 *    change:textarea
 *    paste
 *    paste:composer
 *    paste:textarea
 *    newword:composer
 *    destroy:composer
 *    undo:composer
 *    redo:composer
 *    beforecommand:composer
 *    aftercommand:composer
 *    enable:composer
 *    disable:composer
 *    change_view
 */
(function(wysihtml5) {
  var undef;
  
  var defaultConfig = {
    // Give the editor a name, the name will also be set as class name on the iframe and on the iframe's body 
    name:                 undef,
    // Whether the editor should look like the textarea (by adopting styles)
    style:                true,
    // Id of the toolbar element, pass falsey value if you don't want any toolbar logic
    toolbar:              undef,
    // Whether urls, entered by the user should automatically become clickable-links
    autoLink:             true,
    // Resizes editor height when content is bigger than container
    autoResize:           true,
    // Object which includes parser rules to apply when html gets inserted via copy & paste
    // See parser_rules/*.js for examples
    parserRules:          { tags: { br: {}, span: {}, div: {}, p: {} }, classes: {} },
    // Parser method to use when the user inserts content via copy & paste
    parser:               wysihtml5.dom.parse,
    // Class name which should be set on the contentEditable element in the created sandbox iframe, can be styled via the 'stylesheets' option
    composerClassName:    "wysihtml5-editor",
    // Class name to add to the body when the wysihtml5 editor is supported
    bodyClassName:        "wysihtml5-supported",
    // By default wysihtml5 will insert a <br> for line breaks, set this to false to use <p>
    useLineBreaks:        true,
    // Array (or single string) of stylesheet urls to be loaded in the editor's iframe
    stylesheets:          [],
    // Placeholder text to use, defaults to the placeholder attribute on the textarea element
    placeholderText:      undef,
    // Whether the rich text editor should be rendered on touch devices (wysihtml5 >= 0.3.0 comes with basic support for iOS 5)
    supportTouchDevices:  true,
    // Whether senseless <span> elements (empty or without attributes) should be removed/replaced with their content
    cleanUp:              true
  };
  
  wysihtml5.Editor = wysihtml5.lang.Dispatcher.extend(
    /** @scope wysihtml5.Editor.prototype */ {
    constructor: function(textareaElement, config) {
      this.textareaElement  = typeof(textareaElement) === "string" ? document.getElementById(textareaElement) : textareaElement;
      this.config           = wysihtml5.lang.object({}).merge(defaultConfig).merge(config).get();
      this.textarea         = new wysihtml5.views.Textarea(this, this.textareaElement, this.config);
      this.currentView      = this.textarea;
      this._isCompatible    = wysihtml5.browser.supported();
      
      // Sort out unsupported/unwanted browsers here
      if (!this._isCompatible || (!this.config.supportTouchDevices && wysihtml5.browser.isTouchDevice())) {
        var that = this;
        setTimeout(function() { that.fire("beforeload").fire("load"); }, 0);
        return;
      }
      
      // Add class name to body, to indicate that the editor is supported
      wysihtml5.dom.addClass(document.body, this.config.bodyClassName);
      
      this.composer = new wysihtml5.views.Composer(this, this.textareaElement, this.config);
      this.currentView = this.composer;
      
      if (typeof(this.config.parser) === "function") {
        this._initParser();
      }

      if (this.config.autoResize === true){
        this._initAutoResize();
      }
      
      this.on("beforeload", function() {
        this.synchronizer = new wysihtml5.views.Synchronizer(this, this.textarea, this.composer);
        if (this.config.toolbar) {
          this.toolbar = new wysihtml5.toolbar.Toolbar(this, this.config.toolbar);
        }
      });
    },
    
    isCompatible: function() {
      return this._isCompatible;
    },

    clear: function() {
      this.currentView.clear();
      return this;
    },

    getValue: function(parse) {
      return this.currentView.getValue(parse);
    },

    setValue: function(html, parse) {
      this.fire("unset_placeholder");
      
      if (!html) {
        return this.clear();
      }
      
      this.currentView.setValue(html, parse);
      return this;
    },

    focus: function(setToEnd) {
      this.currentView.focus(setToEnd);
      return this;
    },

    /**
     * Deactivate editor (make it readonly)
     */
    disable: function() {
      this.currentView.disable();
      return this;
    },
    
    /**
     * Activate editor
     */
    enable: function() {
      this.currentView.enable();
      return this;
    },
    
    isEmpty: function() {
      return this.currentView.isEmpty();
    },
    
    hasPlaceholderSet: function() {
      return this.currentView.hasPlaceholderSet();
    },
    
    parse: function(htmlOrElement) {
      var returnValue = this.config.parser(htmlOrElement, this.config.parserRules, this.composer.sandbox.getDocument(), this.config.cleanUp);
      if (typeof(htmlOrElement) === "object") {
        wysihtml5.quirks.redraw(htmlOrElement);
      }
      return returnValue;
    },

    /** Auto-resize the iframe by resizing it's parent wrapper.
     *  ref:  r043v code at https://github.com/xing/wysihtml5/issues/18#issuecomment-11041675
     *  @param editor is wysihtml5 editor instance.
     */
    autoResize: function( editor ){

      var setupAutoResize = function(){
        // Get elements
        var iframe     = editor.composer.iframe;
        var iframeHtml = iframe.contentWindow.document.getElementsByTagName('html')[0];
        var editorWrapper = iframe.parentNode;
        var iframeBody = iframeHtml.lastChild;

        // 0 - Reset styles
        iframeHtml.style.height   = "100%";
        iframeHtml.style.width    = "100%";
        iframeHtml.style.overflow = "hidden";

        iframeBody.style.height   = "auto"; // https://github.com/xing/wysihtml5/issues/18#issuecomment-11202670
        iframeBody.style.lineHeight = '20px';
        iframeBody.style.width    = "100%";

        iframe.style.height = '100%';

        editorWrapper.style.height = '100%'; // Force editor wrapper not to overflow

        // Editor specific listener
        editor.on("aftercommand:composer", resize); // Set bold, italic, etc
        editor.on("change_view", resize); // Change wysi/source view

        // Typing listeners
        editor.on("newword:composer", resize); // Only way to observe on firefox
        editor.on("undo:composer", resize);
        editor.on("paste", resize);

        // Focus/Blur listeners
        editor.on("focus", resize);
        editor.on("blur", resize);

        iframeBody.addEventListener('keyup', resize, false);
        iframeBody.addEventListener("keydown", resize, false);
        iframeBody.addEventListener("keypress", resize, false);
        iframeBody.addEventListener('blur', resize, false);
        iframeBody.addEventListener('focus', resize, false);

        // Set the first size
        editor.on("load", resize);
        resize();
      }

      // IE 9 won't setup the editor before
      setTimeout(setupAutoResize, 200);

      var resize = function(){
        // Get elements
        var iframe     = editor.composer.iframe;
        var iframeHtml = iframe.contentWindow.document.getElementsByTagName('html')[0];
        var iframeBody = iframeHtml.lastChild;

        // 1 - Get Current height for all childNodes:
        var rightHeight = wysihtml5.quirks.countChildNodes(iframeBody);

        // 2 - Set Current height
        iframe.style.height = rightHeight + 'px';
      }

      var resizeOnDelete = function(event){
        var key = event.keyCode || event.charCode;
        if( key == 8 || key == 46 ){ // Delete or Backspace
          resize();
        }
      }

    },

    /**
     * Observes for longer content
     * Only for chrome
     */
    _initAutoResize: function(){
      // var isChrome = !!(window.chrome && chrome.webstore && chrome.webstore.install);
      // if (isChrome) 
      this.autoResize( this );
    },

    /**
     * Prepare html parser logic
     *  - Observes for paste and drop
     */
    _initParser: function() {
      this.on("paste:composer", function() {
        var keepScrollPosition  = true,
            that                = this;
        that.composer.selection.executeAndRestore(function() {
          wysihtml5.quirks.cleanPastedHTML(that.composer.element);
          that.parse(that.composer.element);
        }, keepScrollPosition);
      });
    }
  });
})(wysihtml5);
