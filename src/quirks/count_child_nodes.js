/**
* Calculates height of all text inside the editor.
*
* @author Gabriel Engel
*
* Receives a body or any base element, puts the content inside a temporary div, 
* get's the div height.
*
*/

wysihtml5.quirks.countChildNodes = (function() { 
  
  function getHeight(node){
    // jQuery aproach to find height, use whichever is greater.
    return Math.max(node.offsetHeight, node.clientHeight);
  }

  function getWholeHeight(data, firstNode){
    // Text element, wrap up in a paragraph to get height.
    var content = '<div>'+ data +' &nbsp;</div>';
    var node = firstNode.insertAdjacentHTML('afterbegin', content);
    var response = getHeight(firstNode.firstElementChild);
    
    // Remove element not to affect editing.
    firstNode.removeChild(firstNode.firstElementChild);
    return response;
  }

  function countChildNodes(node){
    var firstNode = node;
    var ret = 20; // Initial size
    ret = ret + getWholeHeight(firstNode.innerHTML, firstNode);
    return ret;
  }

  return countChildNodes;

})();