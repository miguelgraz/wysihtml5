/**
* Gets all nodes from an html element (including text nodes)
* Returns height in pixels
*
* @author Gabriel Engel
* BASED ON: 
* - http://james.padolsey.com/javascript/replacing-text-in-the-dom-its-not-that-simple/
* - http://code.jquery.com/jquery-1.8.3.js # getText
*
* Receives a body or any base element, and sums up it's child nodes
*/

wysihtml5.quirks.countChildNodes = (function() { 
  
  function getHeight(node){
    // jQuery aproach to find height, use whichever is greater.
    height = Math.max(node.scrollHeight, node.offsetHeight, node.clientHeight);
    return (height + node.offsetTop);
  }

  function getParagraphHeight(node, firstNode){
    // Text element, wrap up in a paragraph to get height.
    firstNode.insertAdjacentHTML('afterbegin', '<p>'+ node.data +' &nbsp;</p>');
    response = getHeight(firstNode.firstElementChild);
    
    // Remove element not to affect editing.
    firstNode.removeChild(firstNode.firstElementChild);
    return response;
  }

  function countChildNodes(node){
    var firstNode = node;
    var ret = 40; // Initial size

    for ( node = node.firstChild; node; node = node.nextSibling ) {
      
      // A BR after a BR should sum height.
      var isABrAfterBr = (node.previousSibling && node.previousSibling.nodeName == 'BR' && node.nodeName == 'BR');

      if( (node.nodeType === 3) || isABrAfterBr ){
        ret = ret + getParagraphHeight(node, firstNode);
      } else {
        ret = ret + getHeight(node);
      }
    }

    return ret;
  }

  return countChildNodes;

})();