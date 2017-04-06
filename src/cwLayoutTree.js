/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery */
(function (cwApi, $) {
    "use strict";

    // constructor
    var cwLayoutTree = function (options, viewSchema) {
        cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
        cwApi.registerLayoutForJSActions(this);
        this.maxLength = {};
        this.maxLength.downward = {};
        this.maxLength.upward = {} ; 
        this.maxLength.offset = 150;     
        this.popOut = {};
        this.hiddenNodes = [];
        this.getPopOutList(this.options.CustomOptions['popOutList']);
        this.getHiddenNodeList(this.options.CustomOptions['hidden-nodes']);
    };


    cwLayoutTree.prototype.getPopOutList = function(options) {
        if(options) {
            var optionList = options.split("#");
            var optionSplit;

            for (var i = 0; i < optionList.length; i += 1) {
                if(optionList[i] !== "") {
                    var optionSplit = optionList[i].split(",");
                    this.popOut[optionSplit[0]] = optionSplit[1];
                }
            }
        }
    };

    cwLayoutTree.prototype.getHiddenNodeList = function(options) {
        if(options) {

            var optionList = options.split(",");
            var optionSplit;
            for (var i = 0; i < optionList.length; i += 1) {
                if(optionList[i] !== "") {
                    this.hiddenNodes.push(optionList[i]);
                }
            }
        }
    };



    cwLayoutTree.prototype.drawAssociations = function (output, associationTitleText, object) {
        var depth = 0;
        var titleNodeRight,titleNodeLeft;
        this.originalObject = object;
        output.push('<div id="cwLayoutTree"></div>');
        if(cwAPI.isIndexPage()) {
            this.title = this.mmNode.NodeName;
            var child = this.viewSchema.NodesByID[this.nodeID].SortedChildren;
            if(child.length === 1) {
                titleNodeRight = this.viewSchema.NodesByID[child[0].NodeId].NodeName;
                this.maxLength[0] = titleNodeRight.length;
                this.simplifiedJson = {
                    "downward": {
                        "direction":"downward",
                        "title": titleNodeRight,
                        "name": "origin",
                        "children":this.simplify("downward",depth + 1,object) 
                    }
                };  
            } else if(child.length === 2) {
                titleNodeLeft  = this.viewSchema.NodesByID[child[1].NodeId].NodeName  ;             
                titleNodeRight = this.viewSchema.NodesByID[child[0].NodeId].NodeName;
               
                this.maxLength["downward"][0] = titleNodeRight.length;
                this.maxLength["upward"][0] = titleNodeLeft.length;
                
                this.simplifiedJson = {
                    "upward": {
                        "direction":"upward",
                        "title": titleNodeLeft,
                        "name": "origin",
                        "children":this.simplify("upward",depth + 1,object,null,child[0].NodeId) 
                    },
                    "downward": {
                        "direction":"downward",
                        "title": titleNodeRight,
                        "name": "origin",
                        "children":this.simplify("downward",depth + 1,object,null,child[1].NodeId)  
                    }
                };               
            }     
        } else {
            this.title = object.name;
            var child = this.viewSchema.NodesByID[this.viewSchema.RootNodesId[0]].SortedChildren;
            
            if(child.length === 1) {
                titleNodeRight = this.viewSchema.NodesByID[child[0].NodeId].NodeName;
                this.maxLength.downward[0] = titleNodeRight.length;
                this.simplifiedJson = {
                    "downward": {
                        "direction":"downward",
                        "title": this.viewSchema.NodesByID[child[0].NodeId].NodeName,
                        "name": "origin",
                        "children":this.simplify("downward",depth + 1,object) 
                    }
                };  
            } else if(child.length === 2) {
                titleNodeLeft  = this.viewSchema.NodesByID[child[1].NodeId].NodeName ;              
                titleNodeRight = this.viewSchema.NodesByID[child[0].NodeId].NodeName;
               
                this.maxLength.downward[0] = titleNodeRight.length;
                this.maxLength.upward[0] = titleNodeLeft.length;               

                this.simplifiedJson = {
                    "upward": {
                        "direction":"upward",
                        "title": this.viewSchema.NodesByID[child[1].NodeId].NodeName,
                        "name": "origin",
                        "children":this.simplify("upward",depth + 1,object,child[0].NodeId) 
                    },
                    "downward": {
                        "direction":"downward",
                        "title": this.viewSchema.NodesByID[child[0].NodeId].NodeName,
                        "name": "origin",
                        "children":this.simplify("downward",depth + 1,object,child[1].NodeId)  
                    }
                };               
            }
        }
        
    };



    cwLayoutTree.prototype.simplify = function (direction,depth,child,filter,nextFilter) {
        var childrenArray = [];
        var element;
        var nextChild;
        for (var associationNode in child.associations) {
            if (child.associations.hasOwnProperty(associationNode) && associationNode !== filter) {
                for (var i = 0; i < child.associations[associationNode].length; i += 1) {
                    nextChild = child.associations[associationNode][i];
                    if(this.hiddenNodes.indexOf(associationNode) !== -1) {
                        childrenArray = childrenArray.concat(this.simplify(direction,depth,nextChild,nextFilter));
                    } else {
                        element = {}; 
                        element.name = nextChild.name;
                        element.object_id = nextChild.object_id;
                        element.objectTypeScriptName = nextChild.objectTypeScriptName;

                        if(this.maxLength.hasOwnProperty(depth)) {
                            this.maxLength[direction][depth] = Math.max(this.maxLength[depth],element.name.length);                            
                        } else {
                            this.maxLength[direction][depth] = element.name.length;
                        }

                        element.children = this.simplify(direction,depth + 1,nextChild,nextFilter);
                        childrenArray.push(element);   
                    }
                }
            } 
        }
        return childrenArray;
    };


    cwLayoutTree.prototype.lookForObjects = function (id,scriptname,child) {
        var childrenArray = [];
        var element;
        var nextChild;
        if(child.objectTypeScriptName === scriptname && child.object_id == id) {
            return child;
        }
        for (var associationNode in child.associations) {
            if (child.associations.hasOwnProperty(associationNode)) {
                for (var i = 0; i < child.associations[associationNode].length; i += 1) {
                    nextChild = child.associations[associationNode][i];
                    element = this.lookForObjects(id,scriptname,nextChild);
                    if(element !== null) {
                        return element;
                    } 
                }
            }
        }
        return null;
    };





    cwLayoutTree.prototype.applyJavaScript = function () {
        var that = this;
        var libToLoad = [];

        if(cwAPI.isDebugMode() === true) {
            that.createTree();
        } else {
            libToLoad = ['modules/d3/d3.min.js','modules/d3Tree/d3Tree.concat.js','modules/d3Menu/d3-context-menu.concat.js'];
            // AsyncLoad
            cwApi.customLibs.aSyncLayoutLoader.loadUrls(libToLoad,function(error){
                if(error === null) {
                    that.createTree();                
                } else {
                    cwAPI.Log.Error(error);
                }
            });
        }
    };

    cwLayoutTree.prototype.createTree = function() {
        this.tree = new cwApi.customLibs.cwD3Tree(d3);


        var menuActions = [];
        var menuAction = {};
        menuAction.title = "Open Pop-Out";
        menuAction.eventName = "openPopOut";
        menuActions.push(menuAction);
        var menuAction2 = {};
        menuAction2.title = "Open ObjectPage";
        menuAction2.eventName = "openObjectPage";
        menuActions.push(menuAction2);


        var container = document.getElementById("cwLayoutTree");
        container.addEventListener('openObjectPage', this.openObjectPage.bind(this));  
        container.addEventListener('openPopOut', this.openPopOut.bind(this)); 
        this.tree.drawChart(this.simplifiedJson,container,this.title,this.maxLength,menuActions);

    };

    cwLayoutTree.prototype.openObjectPage = function(event) {
        var id = event.data.d.object_id;
        var scriptname = event.data.d.objectTypeScriptName;
        var object = this.lookForObjects(id,scriptname,this.originalObject);
        if(object) {
            location.href = this.singleLinkMethod(scriptname, object);
        }

    };

    cwLayoutTree.prototype.openPopOut = function(event) {
        var id = event.data.d.object_id;
        var scriptname = event.data.d.objectTypeScriptName;

        var object = this.lookForObjects(id,scriptname,this.originalObject);
        if(this.popOut[scriptname]) {
            cwApi.cwDiagramPopoutHelper.openDiagramPopout(object,this.popOut[scriptname]);
        }
        

    };




    cwApi.cwLayouts.cwLayoutTree = cwLayoutTree;
}(cwAPI, jQuery));