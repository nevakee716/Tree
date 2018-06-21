/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery */
(function (cwApi, $) {
    "use strict";

    
    var uniqueArrayJSON = function(array) {
        var a = array.concat();
        for(var i=0; i<a.length; ++i) {
            for(var j=i+1; j<a.length; ++j) {
                if(JSON.stringify(a[i]) == JSON.stringify(a[j])) {
                    a.splice(j--, 1);
                }
            }
        }

        return a;
    };


    // constructor
    var cwLayoutTree = function (options, viewSchema) {
        cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
        cwApi.registerLayoutForJSActions(this);
        this.multiLineCount = this.options.CustomOptions['multiLineCount'];
        this.multiLineCount = 5;
        this.maxLength = {};
        this.maxLength.downward = {};
        this.maxLength.upward = {} ; 
        if(this.options.CustomOptions['horizontalOffset']) this.maxLength.offset = this.options.CustomOptions['horizontalOffset'];
        else this.maxLength.offset = 20;    
        if(this.options.CustomOptions['horizontalSpacingFactor']) this.maxLength.offset = this.options.CustomOptions['horizontalSpacingFactor'];
        else this.linkLength = 6;           
        
        this.nodeIdLeft = this.options.CustomOptions['nodeIdLeft'];   
        this.nodeIdRight = this.options.CustomOptions['nodeIdRight'];   
        this.popOut = {};
        this.hiddenNodes = [];
        this.layoutsByNodeId = {};
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

    cwLayoutTree.prototype.getItemDisplayString = function(item){
        var l, getDisplayStringFromLayout = function(layout){
            return layout.displayProperty.getDisplayString(item);
        };
        if (item.nodeID === this.nodeID){
            return this.displayProperty.getDisplayString(item);
        }
        if (!this.layoutsByNodeId.hasOwnProperty(item.nodeID)){
            if (this.viewSchema.NodesByID.hasOwnProperty(item.nodeID)){
                var layoutOptions = this.viewSchema.NodesByID[item.nodeID].LayoutOptions;
                this.layoutsByNodeId[item.nodeID] = new cwApi.cwLayouts[item.layoutName](layoutOptions, this.viewSchema);
            } else {
                return item.name;
            }
        }
        return getDisplayStringFromLayout(this.layoutsByNodeId[item.nodeID]);
    };

    cwLayoutTree.prototype.drawAssociations = function (output, associationTitleText, object) {
        var depth = 0;
        var titleNodeRight,titleNodeLeft;
        this.originalObject = object;
        output.push('<div class="cwLayoutTree" id="cwLayoutTree_' + this.nodeID + '"></div>');
        if(cwAPI.isIndexPage()) {
            this.title = this.mmNode.NodeName;
            var child = this.viewSchema.NodesByID[this.nodeIdRight].SortedChildren;
            if(this.nodeIdLeft === "") {
                titleNodeRight = this.viewSchema.NodesByID[this.nodeIdRight].NodeName;
                this.maxLength["downward"][0] = titleNodeRight.length;
                this.simplifiedJson = {
                    "downward": {
                        "direction":"downward",
                        "title": titleNodeRight,
                        "name": "origin",
                        "children": this.simplify("downward",depth + 1,object.associations[this.nodeID])  
                    }
                };  
            } else if(this.nodeIdLeft !== "" && this.nodeIdRight !== "") {
                titleNodeLeft  = this.viewSchema.NodesByID[this.nodeIdRight].NodeName  ;             
                titleNodeRight = this.viewSchema.NodesByID[this.nodeIdLeft].NodeName;
               
                this.maxLength["downward"][0] = titleNodeRight.length;
                this.maxLength["upward"][0] = titleNodeLeft.length;
                
                this.simplifiedJson = {
                    "upward": {
                        "direction":"upward",
                        "title": titleNodeLeft,
                        "name": "origin",
                        "children":this.simplify("upward",depth + 1,object.associations[this.nodeID],null,this.nodeIdRight) 
                    },
                    "downward": {
                        "direction":"downward",
                        "title": titleNodeRight,
                        "name": "origin",
                        "children":this.simplify("downward",depth + 1,object.associations[this.nodeID],null,this.nodeIdLeft) 
                    }
                };               
            }     
        } else {
            this.title = this.getItemDisplayString(object);
            var child = this.viewSchema.NodesByID[this.viewSchema.RootNodesId[0]].SortedChildren;
            
            if(this.nodeIdLeft === "") {
                titleNodeRight = this.viewSchema.NodesByID[this.nodeIdRight].NodeName;
                this.maxLength.downward[0] = titleNodeRight.length;
                this.simplifiedJson = {
                    "downward": {
                        "direction":"downward",
                        "title": this.viewSchema.NodesByID[this.nodeIdRight].NodeName,
                        "name": "origin",
                        "children":this.simplify("downward",depth + 1,object.associations[this.nodeIdRight]) 
                    }
                };  
            } else if(this.nodeIdRight !== "" && this.nodeIdLeft !== "") {
                titleNodeLeft  = this.viewSchema.NodesByID[this.nodeIdLeft].NodeName ;              
                titleNodeRight = this.viewSchema.NodesByID[this.nodeIdRight].NodeName;
               
                this.maxLength.downward[0] = titleNodeRight.length;
                this.maxLength.upward[0] = titleNodeLeft.length;               

                this.simplifiedJson = {
                    "upward": {
                        "direction":"upward",
                        "title": this.viewSchema.NodesByID[this.nodeIdLeft].NodeName,
                        "name": "origin",
                        "children":this.simplify("upward",depth + 1,object.associations[this.nodeIdLeft]) 
                    },
                    "downward": {
                        "direction":"downward",
                        "title": this.viewSchema.NodesByID[this.nodeIdRight].NodeName,
                        "name": "origin",
                        "children":this.simplify("downward",depth + 1,object.associations[this.nodeIdRight])  
                         
                    }
                };               
            }
        }
        
    };

    cwLayoutTree.prototype.multiLine = function(name,size) {
        if(size !== "" && size > 0) {
            var nameSplit = name.split(" "); 
            var carry = 0;
            var multiLineName = "";
            for (var i = 0; i < nameSplit.length -1; i += 1) {
                if(nameSplit[i].length > size || carry + nameSplit[i].length > size) {
                    multiLineName += nameSplit[i] + "\n";
                    carry = 0;
                } else {
                    carry += nameSplit[i].length + 1;
                    multiLineName += nameSplit[i] + " ";
                }
            }
            multiLineName = multiLineName + nameSplit[nameSplit.length - 1];

            return multiLineName ;            
        } else {
            return name;
        }


    };

    cwLayoutTree.prototype.simplify = function (direction,depth,child,filter,nextFilter) {
        var childrenArray = [];
        var element;
        var nextChild;
        if(child && child.associations === undefined) child.associations = child;

        for (var associationNode in child.associations) {
            if (child.associations.hasOwnProperty(associationNode) && associationNode !== filter) {
                for (var i = 0; i < child.associations[associationNode].length; i += 1) {
                    nextChild = child.associations[associationNode][i];
                    if(this.hiddenNodes.indexOf(associationNode) !== -1) {
                        childrenArray = uniqueArrayJSON(childrenArray.concat(this.simplify(direction,depth,nextChild,nextFilter)));
                    } else {
                        element = {}; 
                        element.name = this.getItemDisplayString(nextChild);
                        element.object_id = nextChild.object_id;
                        element.objectTypeScriptName = nextChild.objectTypeScriptName;

                        if(this.maxLength.hasOwnProperty(direction) && this.maxLength[direction].hasOwnProperty(depth)) {
                            this.maxLength[direction][depth] = Math.max(this.maxLength[direction][depth],element.name.length);                            
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


            // AsyncLoad
            cwApi.customLibs.aSyncLayoutLoader.loadUrls(['modules/d3/d3.min.js'],function(error){
                if(error === null) {
                    cwApi.customLibs.aSyncLayoutLoader.loadUrls(['modules/d3Menu/d3Menu.min.js'],function(error){
                        if(error === null) {
                            cwApi.customLibs.aSyncLayoutLoader.loadUrls(['modules/d3Tree/d3Tree.min.js'],function(error){
                                if(error === null) {
                                    that.createTree();
                                } else {
                                    cwAPI.Log.Error(error);
                                }
                            });
                        }
                    });
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


        var container = document.getElementById("cwLayoutTree_" + this.nodeID);
        container.addEventListener('openObjectPage', this.openObjectPage.bind(this));  
        container.addEventListener('openPopOut', this.openPopOut.bind(this)); 
        this.tree.drawChart(this.simplifiedJson,container,this.title,this.maxLength,menuActions,this.linkLength);

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