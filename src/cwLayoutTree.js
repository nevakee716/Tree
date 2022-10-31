/* Copyright (c) 2012-2013 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery */
(function (cwApi, $) {
  "use strict";

  var uniqueArrayJSON = function (array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
      for (var j = i + 1; j < a.length; ++j) {
        if (JSON.stringify(a[i]) == JSON.stringify(a[j])) {
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
    this.multiLineCount = this.options.CustomOptions["multiLineCount"];
    this.multiLineCount = 5;
    this.maxLength = { downward: {}, upward: {}, height: 0 };
    if (this.options.CustomOptions["horizontalOffset"] !== "") this.maxLength.offset = this.options.CustomOptions["horizontalOffset"];
    else this.maxLength.offset = 20;
    if (this.options.CustomOptions["horizontalSpacingFactor"] !== "") this.linkLength = this.options.CustomOptions["horizontalSpacingFactor"];
    else this.linkLength = 6;

    this.nodeIdLeft = this.options.CustomOptions["nodeIdLeft"];
    this.nodeIdRight = this.options.CustomOptions["nodeIdRight"];
    this.popOut = {};
    this.hiddenNodes = [];
    this.layoutsByNodeId = {};
    this.getPopOutList(this.options.CustomOptions["popOutList"]);
    this.getHiddenNodeList(this.options.CustomOptions["hidden-nodes"]);

    this.config = {
      propertyMapping: [
        {
          nodeIDs: [
            "application_112035537",
            "application_20006_436289450",
            "application_20005_1682483191",
            "application_20005_1662967471",
            "application_20006_854631296",
          ],
          templateDiagram: 55,
        },
        {
          nodeIDs: ["flux_20006_1810314472", "flux_20005_1315828592"],
          propertyMapping: "type",
          spreadToEdge: false,
          dashed: true,
        },
        {
          nodeIDs: ["flux_20006_1494133796", "flux_20005_1589945448"],
          propertyMapping: "type",
          spreadToEdge: true,
          dashed: false,
        },
      ],
    };
  };

  cwLayoutTree.prototype.getPopOutList = function (options) {
    if (options) {
      var optionList = options.split("#");
      var optionSplit;

      for (var i = 0; i < optionList.length; i += 1) {
        if (optionList[i] !== "") {
          var optionSplit = optionList[i].split(",");
          this.popOut[optionSplit[0]] = optionSplit[1];
        }
      }
    }
  };

  cwLayoutTree.prototype.getHiddenNodeList = function (options) {
    if (options) {
      var optionList = options.split(",");
      var optionSplit;
      for (var i = 0; i < optionList.length; i += 1) {
        if (optionList[i] !== "") {
          this.hiddenNodes.push(optionList[i]);
        }
      }
    }
  };

  cwLayoutTree.prototype.getItemDisplayString = function (item) {
    var l,
      getDisplayStringFromLayout = function (layout) {
        return layout.displayProperty.getDisplayString(item);
      };
    if (item.nodeID === this.nodeID) {
      return this.displayProperty.getDisplayString(item);
    }
    if (!this.layoutsByNodeId.hasOwnProperty(item.nodeID)) {
      if (this.viewSchema.NodesByID.hasOwnProperty(item.nodeID)) {
        var layoutOptions = this.viewSchema.NodesByID[item.nodeID].LayoutOptions;
        this.layoutsByNodeId[item.nodeID] = new cwApi.cwLayouts[item.layoutName](layoutOptions, this.viewSchema);
      } else {
        return item.name;
      }
    }
    return getDisplayStringFromLayout(this.layoutsByNodeId[item.nodeID]);
  };

  cwLayoutTree.prototype.getTemplates = function (callback) {
    var self = this;
    var idLoaded = 0;
    if (this.templateIds.size === 0) callback();
    this.templateIds.forEach(function (id) {
      var url = cwApi.getLiveServerURL() + "Diagram/Vector/" + id + "?" + cwApi.getDeployNumber();

      $.getJSON(url, function (json) {
        console.log("template " + id + " loaded");
        if (json.status === "Ok") {
          self.diagramTemplates[id] = json.result;
        } else {
          console.log("Issue when loading template " + id);
        }
        idLoaded = idLoaded + 1;
        if (idLoaded === self.templateIds.size) callback();
      });
    });
  };

  cwLayoutTree.prototype.getDiagramMaterial = function (callback) {
    var self = this;
    this.templateIds = new Set();
    this.config.propertyMapping.forEach((pm) => {
      if (pm.templateDiagram) this.templateIds.add(pm.templateDiagram);
    });
    this.diagramTemplates = {};
    cwAPI.siteLoadingPageStart();
    console.log("get template");
    this.getTemplates(() => {
      console.log("get pictures");
      var self = this;
      let imageToLoad = [];
      let imageLoaded = 0;
      Object.keys(this.diagramTemplates).forEach(function (key) {
        let template = self.diagramTemplates[key];
        Object.keys(template.diagram.paletteEntries).forEach(function (p) {
          let palette = template.diagram.paletteEntries[p];
          if (palette.PictureUuid && imageToLoad.indexOf(palette.PictureUuid) === -1) {
            imageToLoad.push(palette.PictureUuid);
          }
          palette.Regions.forEach(function (region) {
            if (region.PictureUuid && imageToLoad.indexOf(region.PictureUuid) === -1) {
              imageToLoad.push(region.PictureUuid);
            }
            if (region.BandingRows && region.BandingRows.length > 0) {
              region.BandingRows.forEach(function (b) {
                if (b.PictureUuid && imageToLoad.indexOf(b.PictureUuid) === -1) {
                  imageToLoad.push(b.PictureUuid);
                }
              });
            }
          });
        });
      });

      if (imageToLoad.length === 0) callback();

      let picturesPath = cwAPI.getSiteMediaPath() + "images/gallerypictures/";
      if (cwAPI.isLive()) {
        picturesPath = cwAPI.getLiveServerURL() + "pictures/gallerypictures/uuid/";
      }

      function checkAllImagesLoaded() {
        imageLoaded += 1;
        if (imageLoaded === imageToLoad.length) {
          callback();
        }
      }

      imageToLoad.forEach(function (uuid) {
        var image = new Image();
        image.src = picturesPath + uuid + ".png?" + cwApi.getDeployNumber();
        cwApi.CwPictureGalleryLoader.images[uuid] = image;
        image.onload = checkAllImagesLoaded;
        image.onerror = checkAllImagesLoaded;
      });
    });
  };

  cwLayoutTree.prototype.drawAssociations = function (output, associationTitleText, object) {
    this.originalObject = object;

    output.push('<div class="cwLayoutTree" id="cwLayoutTree_' + this.nodeID + '"></div>');
  };

  cwLayoutTree.prototype.multiLine = function (name, size) {
    if (size !== "" && size > 0) {
      var nameSplit = name.split(" ");
      var carry = 0;
      var multiLineName = "";
      for (var i = 0; i < nameSplit.length - 1; i += 1) {
        if (nameSplit[i].length > size || carry + nameSplit[i].length > size) {
          multiLineName += nameSplit[i] + "\n";
          carry = 0;
        } else {
          carry += nameSplit[i].length + 1;
          multiLineName += nameSplit[i] + " ";
        }
      }
      multiLineName = multiLineName + nameSplit[nameSplit.length - 1];

      return multiLineName;
    } else {
      return name;
    }
  };

  cwLayoutTree.prototype.getConfig = function (nodeID) {
    return this.config.propertyMapping.find((pm) => pm.nodeIDs.indexOf(nodeID) !== -1);
  };

  cwLayoutTree.prototype.simplify = function (direction, depth, child, filter, nextFilter) {
    var childrenArray = [];
    var element;
    var nextChild;
    if (child && child.associations === undefined) child.associations = child;

    for (var associationNode in child.associations) {
      if (child.associations.hasOwnProperty(associationNode) && associationNode !== filter) {
        for (var i = 0; i < child.associations[associationNode].length; i += 1) {
          nextChild = child.associations[associationNode][i];
          if (this.hiddenNodes.indexOf(associationNode) !== -1) {
            childrenArray = uniqueArrayJSON(childrenArray.concat(this.simplify(direction, depth, nextChild, nextFilter)));
          } else {
            element = {};
            element.name = this.getItemDisplayString(nextChild);
            element.object_id = nextChild.object_id;
            element.objectTypeScriptName = nextChild.objectTypeScriptName;
            let config = this.getConfig(nextChild.nodeID);
            if (config?.propertyMapping) {
              element.faIcon = cwApi.customLibs.utils.getIconAndColorFromItemValue(nextChild, config.propertyMapping);
              element.spreadToEdge = config.spreadToEdge;
              element.dashed = config.dashed;
            } else if (config?.templateDiagram) {
              let errors,
                size = {};

              let image = cwAPI.customLibs.utils.shapeToImage(nextChild, this.diagramTemplates[config.templateDiagram], errors, size);
              element.image = image;
              element.size = size;
              element.name = new Array(Math.floor(element.size.Width * 0.9)).join(" ");
              this.maxLength.height = Math.max(this.maxLength.height, element.size.Height);
            }

            if (this.maxLength.hasOwnProperty(direction) && this.maxLength[direction].hasOwnProperty(depth)) {
              this.maxLength[direction][depth] = Math.max(this.maxLength[direction][depth], element.name.length);
            } else {
              this.maxLength[direction][depth] = element.name.length;
            }

            element.children = this.simplify(direction, depth + 1, nextChild, nextFilter);
            childrenArray.push(element);
          }
        }
      }
    }

    return childrenArray;
  };

  cwLayoutTree.prototype.lookForObjects = function (id, scriptname, child) {
    var childrenArray = [];
    var element;
    var nextChild;
    if (child.objectTypeScriptName === scriptname && child.object_id == id) {
      return child;
    }
    for (var associationNode in child.associations) {
      if (child.associations.hasOwnProperty(associationNode)) {
        for (var i = 0; i < child.associations[associationNode].length; i += 1) {
          nextChild = child.associations[associationNode][i];
          element = this.lookForObjects(id, scriptname, nextChild);
          if (element !== null) {
            return element;
          }
        }
      }
    }
    return null;
  };

  cwLayoutTree.prototype.parse = function () {
    console.log("parse");
    var depth = 0;
    var titleNodeRight, titleNodeLeft;
    var copyObject = $.extend(true, {}, this.originalObject);

    if (cwAPI.isIndexPage()) {
      this.title = this.mmNode.NodeName;
      if (this.nodeIdLeft === "") {
        titleNodeRight = this.viewSchema.NodesByID[this.nodeIdRight].NodeName;
        this.maxLength["downward"][0] = titleNodeRight.length;
        this.simplifiedJson = {
          downward: {
            direction: "downward",
            title: titleNodeRight,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.nodeID]),
          },
        };
      } else if (this.nodeIdLeft !== "" && this.nodeIdRight !== "") {
        titleNodeLeft = this.viewSchema.NodesByID[this.nodeIdRight].NodeName;
        titleNodeRight = this.viewSchema.NodesByID[this.nodeIdLeft].NodeName;

        this.maxLength["downward"][0] = titleNodeRight.length;
        this.maxLength["upward"][0] = titleNodeLeft.length;

        this.simplifiedJson = {
          upward: {
            direction: "upward",
            title: titleNodeLeft,
            name: "origin",
            children: this.simplify("upward", depth + 1, copyObject.associations[this.nodeID], null, this.nodeIdRight),
          },
          downward: {
            direction: "downward",
            title: titleNodeRight,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.nodeID], null, this.nodeIdLeft),
          },
        };
      }
    } else {
      this.title = this.getItemDisplayString(copyObject);
      let config = this.getConfig(copyObject.nodeID);
      let element = {};
      element.name = this.getItemDisplayString(copyObject);
      if (config?.propertyMapping) {
        element.faIcon = cwApi.customLibs.utils.getIconAndColorFromItemValue(copyObject, config.propertyMapping);
        element.spreadToEdge = config.spreadToEdge;
        element.dashed = config.dashed;
      } else if (config?.templateDiagram) {
        let errors,
          size = {};

        let image = cwAPI.customLibs.utils.shapeToImage(copyObject, this.diagramTemplates[config.templateDiagram], errors, size);
        element.image = image;
        element.size = size;
        element.name = new Array(Math.floor(element.size.Width * 0.9)).join(" ");
        this.maxLength.height = Math.max(this.maxLength.height, element.size.Height);
      }
      this.centralElement = element;
      if (this.nodeIdLeft === "") {
        titleNodeRight = this.viewSchema.NodesByID[this.nodeIdRight].NodeName;
        this.maxLength.downward[0] = titleNodeRight.length;
        this.simplifiedJson = {
          downward: {
            direction: "downward",
            title: this.viewSchema.NodesByID[this.nodeIdRight].NodeName,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.nodeIdRight]),
          },
        };
      } else if (this.nodeIdRight !== "" && this.nodeIdLeft !== "") {
        titleNodeLeft = this.viewSchema.NodesByID[this.nodeIdLeft].NodeName;
        titleNodeRight = this.viewSchema.NodesByID[this.nodeIdRight].NodeName;

        this.maxLength.downward[0] = titleNodeRight.length;
        this.maxLength.upward[0] = titleNodeLeft.length;

        this.simplifiedJson = {
          upward: {
            direction: "upward",
            title: this.viewSchema.NodesByID[this.nodeIdLeft].NodeName,
            name: "origin",
            children: this.simplify("upward", depth + 1, copyObject.associations[this.nodeIdLeft]),
          },
          downward: {
            direction: "downward",
            title: this.viewSchema.NodesByID[this.nodeIdRight].NodeName,
            name: "origin",
            children: this.simplify("downward", depth + 1, copyObject.associations[this.nodeIdRight]),
          },
        };
      }
    }
    this.createTree();
  };

  cwLayoutTree.prototype.applyJavaScript = function () {
    var that = this;
    var libToLoad = [];

    if (cwAPI.isDebugMode() === true) {
      that.getDiagramMaterial(() => that.parse());
    } else {
      // AsyncLoad
      cwApi.customLibs.aSyncLayoutLoader.loadUrls(["modules/d3/d3.min.js"], function (error) {
        if (error === null) {
          cwApi.customLibs.aSyncLayoutLoader.loadUrls(["modules/d3Menu/d3Menu.min.js"], function (error) {
            if (error === null) {
              cwApi.customLibs.aSyncLayoutLoader.loadUrls(["modules/d3Tree/d3Tree.min.js"], function (error) {
                if (error === null) {
                  cwAPI.siteLoadingPageStart();
                  that.getDiagramMaterial(() => that.parse());
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

  cwLayoutTree.prototype.createTree = function () {
    this.tree = new cwApi.customLibs.cwD3Tree(d3, this.config);
    cwAPI.siteLoadingPageFinish();
    var menuActions = [];
    var menuAction = {};
    menuAction.title = "Open Pop-Out";
    menuAction.eventName = "openPopOut";
    menuActions.push(menuAction);
    var menuAction2 = {};
    menuAction2.title = "Open ObjectPage";
    menuAction2.eventName = "openObjectPage";
    menuActions.push(menuAction2);
    var menuAction3 = {};
    menuAction3.title = "Open ObjectPage in new Tab";
    menuAction3.eventName = "openObjectPageNewTab";
    menuActions.push(menuAction3);

    var container = document.getElementById("cwLayoutTree_" + this.nodeID);
    container.addEventListener("openObjectPage", this.openObjectPage.bind(this));
    container.addEventListener("openPopOut", this.openPopOut.bind(this));
    container.addEventListener("openObjectPageNewTab", this.openObjectPageNewTab.bind(this));
    this.tree.drawChart(this.simplifiedJson, container, this.centralElement, this.maxLength, menuActions, this.linkLength);
  };

  cwLayoutTree.prototype.openObjectPage = function (event) {
    var id = event.data.d.object_id;
    var scriptname = event.data.d.objectTypeScriptName;
    var object = this.lookForObjects(id, scriptname, this.originalObject);
    if (object) {
      location.href = this.singleLinkMethod(scriptname, object);
    }
  };

  cwLayoutTree.prototype.openObjectPageNewTab = function (event) {
    var id = event.data.d.object_id;
    var scriptname = event.data.d.objectTypeScriptName;
    var object = this.lookForObjects(id, scriptname, this.originalObject);
    if (object) {
      window.open(this.singleLinkMethod(scriptname, object), "_blank").focus();
    }
  };

  cwLayoutTree.prototype.openPopOut = function (event) {
    var id = event.data.d.object_id;
    var scriptname = event.data.d.objectTypeScriptName;

    var object = this.lookForObjects(id, scriptname, this.originalObject);
    if (this.popOut[scriptname]) {
      cwApi.cwDiagramPopoutHelper.openDiagramPopout(object, this.popOut[scriptname]);
    }
  };

  cwApi.cwLayouts.cwLayoutTree = cwLayoutTree;
})(cwAPI, jQuery);
